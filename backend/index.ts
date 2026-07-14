type Env = {
  BOT_TOKEN?: string;
  OPENAI_API_KEY?: string;
  OPENAI_TRANSCRIPTION_MODEL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  APP_BRANCH?: string;
  APP_COMMIT_HASH?: string;
  APP_DEPLOYED_AT?: string;
  W7S_REPOSITORY?: string;
  W7S_ENVIRONMENT?: string;
};

type ExecutionContextLike = {
  waitUntil(promise: Promise<unknown>): void;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramMessage = {
  message_id: number;
  chat: {
    id: number;
    type?: string;
  };
  text?: string;
  voice?: {
    file_id: string;
    file_unique_id?: string;
    duration?: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    duration?: number;
    file_size?: number;
  };
};

type TelegramFileResponse = {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id?: string;
    file_size?: number;
    file_path?: string;
  };
  description?: string;
};

type TelegramMessageResponse = {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
};

type OpenAITranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

const DEFAULT_MODEL = "whisper-1";
const TELEGRAM_API_ORIGIN = "https://api.telegram.org";
const MAX_TELEGRAM_REPLY_LENGTH = 3900;

const json = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body, null, 2), { ...init, headers });
};

const text = (body: string, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/plain; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(body, { ...init, headers });
};

export const truncateTelegramText = (value: string) => {
  if (value.length <= MAX_TELEGRAM_REPLY_LENGTH) return value;
  return `${value.slice(0, MAX_TELEGRAM_REPLY_LENGTH - 3)}...`;
};

const telegramApiUrl = (token: string, method: string) =>
  `${TELEGRAM_API_ORIGIN}/bot${token}/${method}`;

const requireRuntimeConfig = (env: Env) => {
  const missing = [
    ["BOT_TOKEN", env.BOT_TOKEN],
    ["OPENAI_API_KEY", env.OPENAI_API_KEY],
  ].filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(", ")}`);
  }

  return {
    botToken: env.BOT_TOKEN as string,
    openAiApiKey: env.OPENAI_API_KEY as string,
    model: env.OPENAI_TRANSCRIPTION_MODEL || DEFAULT_MODEL,
  };
};

const postTelegramJson = async <T>(token: string, method: string, payload: unknown): Promise<T> => {
  const response = await fetch(telegramApiUrl(token, method), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json<T & { ok?: boolean; description?: string }>();
  if (!response.ok || body.ok === false) {
    throw new Error(body.description || `Telegram ${method} failed with ${response.status}`);
  }
  return body as T;
};

const sendMessage = (token: string, chatId: number, textValue: string, replyToMessageId?: number) =>
  postTelegramJson<TelegramMessageResponse>(token, "sendMessage", {
    chat_id: chatId,
    text: truncateTelegramText(textValue),
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
  });

const editMessage = (token: string, chatId: number, messageId: number, textValue: string) =>
  postTelegramJson<TelegramMessageResponse>(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: truncateTelegramText(textValue),
  });

const getFilePath = async (token: string, fileId: string) => {
  const response = await postTelegramJson<TelegramFileResponse>(token, "getFile", {
    file_id: fileId,
  });
  if (!response.result?.file_path) {
    throw new Error("Telegram did not return a downloadable file path");
  }
  return response.result.file_path;
};

const fetchTelegramFile = async (token: string, filePath: string) => {
  const response = await fetch(`${TELEGRAM_API_ORIGIN}/file/bot${token}/${filePath}`);
  if (!response.ok) {
    throw new Error(`Telegram file download failed with ${response.status}`);
  }
  return response;
};

const inferFileName = (message: TelegramMessage, filePath: string) => {
  if (message.audio?.file_name) return message.audio.file_name;
  const pathName = filePath.split("/").pop();
  if (pathName?.includes(".")) return pathName;
  const mimeType = message.voice?.mime_type || message.audio?.mime_type || "";
  if (mimeType.includes("ogg")) return "telegram-voice.ogg";
  if (mimeType.includes("mpeg")) return "telegram-audio.mp3";
  if (mimeType.includes("mp4")) return "telegram-audio.mp4";
  if (mimeType.includes("wav")) return "telegram-audio.wav";
  return "telegram-audio.ogg";
};

const transcribeWithOpenAI = async (apiKey: string, model: string, audio: Blob, fileName: string) => {
  const form = new FormData();
  form.set("model", model);
  form.set("file", audio, fileName);
  form.set("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const body = await response.json<OpenAITranscriptionResponse>();
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI transcription failed with ${response.status}`);
  }
  if (!body.text?.trim()) {
    throw new Error("OpenAI returned an empty transcription");
  }
  return body.text.trim();
};

const processVoiceMessage = async (env: Env, message: TelegramMessage) => {
  const config = requireRuntimeConfig(env);
  const media = message.voice || message.audio;
  if (!media) return;

  let statusMessageId: number | undefined;
  try {
    const status = await sendMessage(config.botToken, message.chat.id, "Transcribing audio...", message.message_id);
    statusMessageId = status.result?.message_id;

    const filePath = await getFilePath(config.botToken, media.file_id);
    const fileResponse = await fetchTelegramFile(config.botToken, filePath);
    const audioBlob = await fileResponse.blob();
    const transcription = await transcribeWithOpenAI(
      config.openAiApiKey,
      config.model,
      audioBlob,
      inferFileName(message, filePath),
    );

    if (statusMessageId) {
      await editMessage(config.botToken, message.chat.id, statusMessageId, transcription);
    } else {
      await sendMessage(config.botToken, message.chat.id, transcription, message.message_id);
    }
  } catch (error) {
    const errorText = `Could not transcribe this audio: ${error instanceof Error ? error.message : String(error)}`;
    if (statusMessageId) {
      await editMessage(config.botToken, message.chat.id, statusMessageId, errorText);
    } else {
      await sendMessage(config.botToken, message.chat.id, errorText, message.message_id);
    }
    throw error;
  }
};

const processUpdate = async (env: Env, update: TelegramUpdate) => {
  const message = update.message;
  if (!message) return;

  if (message.voice || message.audio) {
    await processVoiceMessage(env, message);
    return;
  }

  if (message.text && message.chat.type === "private") {
    const { botToken } = requireRuntimeConfig(env);
    await sendMessage(
      botToken,
      message.chat.id,
      "Send me a voice message or add me to a group, and I will transcribe audio with OpenAI Whisper.",
      message.message_id,
    );
  }
};

const isAuthorizedTelegramWebhook = (request: Request, env: Env) => {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === env.TELEGRAM_WEBHOOK_SECRET;
};

const health = (env: Env) => json({
  ok: true,
  service: "voicetranscriptionbot",
  branch: env.APP_BRANCH || "unknown",
  commitHash: env.APP_COMMIT_HASH || "unknown",
  deployedAt: env.APP_DEPLOYED_AT || "unknown",
  repository: env.W7S_REPOSITORY || "unknown",
  environment: env.W7S_ENVIRONMENT || "unknown",
  openaiConfigured: Boolean(env.OPENAI_API_KEY),
  botConfigured: Boolean(env.BOT_TOKEN),
  model: env.OPENAI_TRANSCRIPTION_MODEL || DEFAULT_MODEL,
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContextLike) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return health(env);
    }

    if (request.method !== "POST" || url.pathname !== "/telegram") {
      return text("Not found", { status: 404 });
    }

    if (!isAuthorizedTelegramWebhook(request, env)) {
      return text("Unauthorized", { status: 401 });
    }

    let update: TelegramUpdate;
    try {
      update = await request.json<TelegramUpdate>();
    } catch {
      return text("Invalid JSON", { status: 400 });
    }

    ctx.waitUntil(processUpdate(env, update));
    return text("OK");
  },
};

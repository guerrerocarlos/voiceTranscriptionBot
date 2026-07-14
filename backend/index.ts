type Env = {
  BALANCES?: KVNamespace;
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
  pre_checkout_query?: TelegramPreCheckoutQuery;
};

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
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
  successful_payment?: TelegramSuccessfulPayment;
};

type TelegramPreCheckoutQuery = {
  id: string;
  from: TelegramUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
};

type TelegramSuccessfulPayment = {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
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

type TelegramOkResponse = {
  ok: boolean;
  result?: boolean;
  description?: string;
};

type OpenAITranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

type Account = {
  userId: number;
  username?: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  freeCreditsGrantedAt: string;
  totalPurchased: number;
  totalSpent: number;
  payments: PaymentRecord[];
  usage: UsageRecord[];
};

type PaymentRecord = {
  chargeId: string;
  amount: number;
  payload: string;
  createdAt: string;
};

type UsageRecord = {
  id: string;
  chatId: number;
  messageId: number;
  cost: number;
  durationSeconds: number;
  status: "completed" | "refunded";
  createdAt: string;
};

const DEFAULT_MODEL = "whisper-1";
const FREE_STARTING_CREDITS = 25;
const DEFAULT_BUY_STARS = 25;
const MIN_BUY_STARS = 25;
const MAX_BUY_STARS = 2500;
const TELEGRAM_API_ORIGIN = "https://api.telegram.org";
const MAX_TELEGRAM_REPLY_LENGTH = 3900;
const MAX_LEDGER_ITEMS = 50;

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
    ["BALANCES", env.BALANCES],
    ["BOT_TOKEN", env.BOT_TOKEN],
    ["OPENAI_API_KEY", env.OPENAI_API_KEY],
  ].filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required config: ${missing.join(", ")}`);
  }

  return {
    botToken: env.BOT_TOKEN as string,
    balances: env.BALANCES as KVNamespace,
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

const answerPreCheckoutQuery = (token: string, preCheckoutQueryId: string, ok: boolean, errorMessage?: string) =>
  postTelegramJson<TelegramOkResponse>(token, "answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  });

const sendInvoice = (token: string, chatId: number, userId: number, amount: number) =>
  postTelegramJson<TelegramMessageResponse>(token, "sendInvoice", {
    chat_id: chatId,
    title: `${amount} transcription credits`,
    description: `Adds ${amount} credits to transcribe Telegram voice and audio messages. Audio costs 1 credit per started minute.`,
    payload: buildInvoicePayload(userId, amount),
    provider_token: "",
    currency: "XTR",
    prices: [{ label: `${amount} credits`, amount }],
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

const accountKey = (userId: number) => `account:${userId}`;

const nowIso = () => new Date().toISOString();

const trimLedger = <T>(items: T[]) => items.slice(-MAX_LEDGER_ITEMS);

const userDisplayName = (user: TelegramUser) =>
  user.username || [user.first_name, user.last_name].filter(Boolean).join(" ") || String(user.id);

export const calculateAudioCost = (durationSeconds?: number) =>
  Math.max(1, Math.ceil((durationSeconds || 60) / 60));

export const parseBuyAmount = (textValue: string) => {
  const [, rawAmount] = textValue.trim().split(/\s+/, 2);
  const parsed = rawAmount ? Number(rawAmount) : DEFAULT_BUY_STARS;
  if (!Number.isInteger(parsed)) return DEFAULT_BUY_STARS;
  return Math.min(MAX_BUY_STARS, Math.max(MIN_BUY_STARS, parsed));
};

export const buildInvoicePayload = (userId: number, amount: number) =>
  `credits:${userId}:${amount}:${crypto.randomUUID()}`;

export const parseInvoicePayload = (payload: string) => {
  const [kind, rawUserId, rawAmount] = payload.split(":");
  const userId = Number(rawUserId);
  const amount = Number(rawAmount);
  if (kind !== "credits" || !Number.isInteger(userId) || !Number.isInteger(amount)) {
    return null;
  }
  return { userId, amount };
};

const loadAccount = async (kv: KVNamespace, user: TelegramUser): Promise<Account> => {
  const raw = await kv.get(accountKey(user.id), "json");
  if (raw && typeof raw === "object") {
    const account = raw as Account;
    return {
      ...account,
      username: user.username || account.username,
      payments: account.payments || [],
      usage: account.usage || [],
    };
  }

  const createdAt = nowIso();
  return {
    userId: user.id,
    username: user.username,
    balance: FREE_STARTING_CREDITS,
    createdAt,
    updatedAt: createdAt,
    freeCreditsGrantedAt: createdAt,
    totalPurchased: 0,
    totalSpent: 0,
    payments: [],
    usage: [],
  };
};

const storeAccount = async (kv: KVNamespace, account: Account) => {
  await kv.put(accountKey(account.userId), JSON.stringify({
    ...account,
    updatedAt: nowIso(),
    payments: trimLedger(account.payments),
    usage: trimLedger(account.usage),
  }));
};

const describeBalance = (account: Account) =>
  `${userDisplayName({ id: account.userId, username: account.username })}, you have ${account.balance} transcription credits. Audio costs 1 credit per started minute.`;

const ensureSufficientCredits = async (
  kv: KVNamespace,
  token: string,
  message: TelegramMessage,
  cost: number,
) => {
  const user = message.from;
  if (!user) {
    await sendMessage(token, message.chat.id, "I could not identify who sent this audio, so I cannot charge credits.", message.message_id);
    return null;
  }

  const account = await loadAccount(kv, user);
  if (account.balance >= cost) return account;

  await sendMessage(
    token,
    message.chat.id,
    `You need ${cost} credits to transcribe this audio, but you have ${account.balance}. Use /buy to add Telegram Stars credits.`,
    message.message_id,
  );
  if (message.chat.type === "private") {
    await sendInvoice(token, message.chat.id, user.id, DEFAULT_BUY_STARS);
  }
  return null;
};

const debitCredits = async (kv: KVNamespace, account: Account, usage: Omit<UsageRecord, "status" | "createdAt">) => {
  const record: UsageRecord = {
    ...usage,
    status: "completed",
    createdAt: nowIso(),
  };
  account.balance -= usage.cost;
  account.totalSpent += usage.cost;
  account.usage.push(record);
  await storeAccount(kv, account);
  return record;
};

const refundCredits = async (kv: KVNamespace, account: Account, usageId: string, cost: number) => {
  account.balance += cost;
  account.totalSpent = Math.max(0, account.totalSpent - cost);
  account.usage = account.usage.map((usage) =>
    usage.id === usageId ? { ...usage, status: "refunded" } : usage,
  );
  await storeAccount(kv, account);
};

const processVoiceMessage = async (env: Env, message: TelegramMessage) => {
  const config = requireRuntimeConfig(env);
  const media = message.voice || message.audio;
  if (!media) return;

  let statusMessageId: number | undefined;
  let account: Account | null = null;
  let usageId: string | null = null;
  const cost = calculateAudioCost(media.duration);
  try {
    account = await ensureSufficientCredits(config.balances, config.botToken, message, cost);
    if (!account) return;

    usageId = crypto.randomUUID();
    await debitCredits(config.balances, account, {
      id: usageId,
      chatId: message.chat.id,
      messageId: message.message_id,
      cost,
      durationSeconds: media.duration || 0,
    });

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
    if (account && usageId) {
      await refundCredits(config.balances, account, usageId, cost);
    }
    const errorText = `Could not transcribe this audio: ${error instanceof Error ? error.message : String(error)}`;
    if (statusMessageId) {
      await editMessage(config.botToken, message.chat.id, statusMessageId, errorText);
    } else {
      await sendMessage(config.botToken, message.chat.id, errorText, message.message_id);
    }
    throw error;
  }
};

const sendBalance = async (env: Env, message: TelegramMessage) => {
  const { botToken, balances } = requireRuntimeConfig(env);
  if (!message.from) {
    await sendMessage(botToken, message.chat.id, "I could not identify your Telegram account.", message.message_id);
    return;
  }
  const account = await loadAccount(balances, message.from);
  await storeAccount(balances, account);
  await sendMessage(botToken, message.chat.id, describeBalance(account), message.message_id);
};

const sendBuyInvoice = async (env: Env, message: TelegramMessage) => {
  const { botToken, balances } = requireRuntimeConfig(env);
  if (!message.from) {
    await sendMessage(botToken, message.chat.id, "I could not identify your Telegram account.", message.message_id);
    return;
  }
  const account = await loadAccount(balances, message.from);
  await storeAccount(balances, account);
  await sendInvoice(botToken, message.chat.id, message.from.id, parseBuyAmount(message.text || ""));
};

const processPreCheckoutQuery = async (env: Env, query: TelegramPreCheckoutQuery) => {
  const { botToken } = requireRuntimeConfig(env);
  const parsed = parseInvoicePayload(query.invoice_payload);
  if (!parsed || parsed.userId !== query.from.id || query.currency !== "XTR" || query.total_amount !== parsed.amount) {
    await answerPreCheckoutQuery(botToken, query.id, false, "This invoice is no longer valid. Please run /buy again.");
    return;
  }
  await answerPreCheckoutQuery(botToken, query.id, true);
};

const processSuccessfulPayment = async (env: Env, message: TelegramMessage) => {
  const { botToken, balances } = requireRuntimeConfig(env);
  const payment = message.successful_payment;
  const user = message.from;
  if (!payment || !user) return;

  const parsed = parseInvoicePayload(payment.invoice_payload);
  if (!parsed || parsed.userId !== user.id || payment.currency !== "XTR" || payment.total_amount !== parsed.amount) {
    await sendMessage(botToken, message.chat.id, "Payment received, but the invoice payload was invalid. Please contact /paysupport.", message.message_id);
    return;
  }

  const account = await loadAccount(balances, user);
  const alreadyRecorded = account.payments.some((item) => item.chargeId === payment.telegram_payment_charge_id);
  if (!alreadyRecorded) {
    account.balance += parsed.amount;
    account.totalPurchased += parsed.amount;
    account.payments.push({
      chargeId: payment.telegram_payment_charge_id,
      amount: parsed.amount,
      payload: payment.invoice_payload,
      createdAt: nowIso(),
    });
    await storeAccount(balances, account);
  }

  await sendMessage(botToken, message.chat.id, `Payment received. Your balance is ${account.balance} transcription credits.`, message.message_id);
};

const sendHelp = async (env: Env, message: TelegramMessage) => {
  const { botToken } = requireRuntimeConfig(env);
  await sendMessage(
    botToken,
    message.chat.id,
    [
      "Send me a voice or audio message and I will transcribe it with OpenAI Whisper.",
      "",
      "Every user starts with 25 free credits.",
      "Audio costs 1 credit per started minute.",
      "",
      "/balance - show your credits",
      "/buy - buy 25 credits with Telegram Stars",
      "/buy 100 - buy a custom amount of credits",
      "/paysupport - payment support instructions",
    ].join("\n"),
    message.message_id,
  );
};

const sendPaySupport = async (env: Env, message: TelegramMessage) => {
  const { botToken } = requireRuntimeConfig(env);
  await sendMessage(
    botToken,
    message.chat.id,
    "For payment support, reply here with your issue and include the approximate payment time. Keep your Telegram receipt available.",
    message.message_id,
  );
};

const processUpdate = async (env: Env, update: TelegramUpdate) => {
  if (update.pre_checkout_query) {
    await processPreCheckoutQuery(env, update.pre_checkout_query);
    return;
  }

  const message = update.message;
  if (!message) return;

  if (message.successful_payment) {
    await processSuccessfulPayment(env, message);
    return;
  }

  if (message.voice || message.audio) {
    await processVoiceMessage(env, message);
    return;
  }

  if (message.text) {
    const command = message.text.trim().split(/\s+/, 1)[0].split("@", 1)[0].toLowerCase();
    if (command === "/balance") {
      await sendBalance(env, message);
      return;
    }
    if (command === "/buy") {
      await sendBuyInvoice(env, message);
      return;
    }
    if (command === "/paysupport") {
      await sendPaySupport(env, message);
      return;
    }
    if (message.chat.type === "private" || command === "/start" || command === "/help") {
      await sendHelp(env, message);
    }
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
  balancesConfigured: Boolean(env.BALANCES),
  freeStartingCredits: FREE_STARTING_CREDITS,
  defaultBuyStars: DEFAULT_BUY_STARS,
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

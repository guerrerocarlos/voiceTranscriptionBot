const token = process.env.BOT_TOKEN;
const baseUrl = process.env.W7S_APP_URL;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !baseUrl) {
  console.error("Usage: BOT_TOKEN=... W7S_APP_URL=https://guerrerocarlos.w7s.cloud/voiceTranscriptionBot [TELEGRAM_WEBHOOK_SECRET=...] npm run set-webhook");
  process.exit(1);
}

const appUrl = new URL(baseUrl);
appUrl.pathname = `${appUrl.pathname.replace(/\/$/, "")}/telegram`;
const webhookUrl = appUrl.toString();
const payload = {
  url: webhookUrl,
  allowed_updates: ["message", "pre_checkout_query"],
  ...(secretToken ? { secret_token: secretToken } : {}),
};

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(payload),
});

const body = await response.json();
console.log(JSON.stringify(body, null, 2));

if (!response.ok || body.ok === false) {
  process.exit(1);
}

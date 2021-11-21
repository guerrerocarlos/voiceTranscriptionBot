import { Telegraf } from "telegraf";

import * as dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: true },
});

bot.telegram.setWebhook(
  "https://ilpifex4si.execute-api.us-east-2.amazonaws.com/dev/main"
);
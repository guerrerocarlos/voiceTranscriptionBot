import "source-map-support/register";

import { transcribe as googleTranscribe } from "../../utils/transcribe/google";

import * as makeHandler from "lambda-request-handler";
import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.BOT_TOKEN, {
  telegram: { webhookReply: true },
});

// bot.use(async (ctx, next) => {
//   console.log("processing request...");
//   await next();
//   console.log("completed request...");
// });

bot.on("text", async (ctx) => {
  if (ctx.message.chat.type === "private") {
    await ctx.reply("🤖");
    await ctx.reply(
      "I'm ready to start transcribing any voice message that you send me"
    );
    await ctx.reply(
      "Add me to any group and I will transcribe any voice message that I see"
    );
    await ctx.reply(
      "My source code can be viewed here: https://github.com/guerrerocarlos/voiceTranscriptionBot"
    );
  }
});

bot.on("text", async (ctx) => {
  await ctx.reply("🤖");
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

bot.on("voice", async function (ctx) {
  let dots = 3;

  console.log("GOT VOICE");
  const message = ctx.message;

  let translatingMessage = await ctx.reply("🤖", {
    reply_to_message_id: message.message_id,
  });

  let fileLink = await ctx.telegram.getFileLink(message["voice"].file_id);

  console.log("FILE LINK", fileLink);

  try {
    let interval = setInterval(() => {
      ctx.telegram.editMessageText(
        ctx.chat.id,
        translatingMessage.message_id,
        undefined,
        "🤖 " + ".".repeat(dots)
      );
      dots++;
      if (dots > 15) {
        clearInterval(interval);
      }
    }, 3000);

    console.log("replying...");

    let result = await googleTranscribe(fileLink) as any
    clearInterval(interval);

    console.log("googleTranscribeResults", result)

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      translatingMessage.message_id,
      undefined,
      result.transcription
    );
  } catch (err) {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      translatingMessage.message_id,
      undefined,
      "🚩: " + err
    );
    await sleep(5000);
    await ctx.telegram.deleteMessage(
      ctx.chat.id,
      translatingMessage.message_id
    );
  }
});

export const main = (evt, cb) => {
  console.log("🔥", JSON.stringify(evt.event, null, 2));
  return makeHandler(bot.webhookCallback("/main"))(evt.event, evt.context);
};

// bot.telegram.setWebhook(
//   "https://ilpifex4si.execute-api.us-east-2.amazonaws.com/dev/async"
// );

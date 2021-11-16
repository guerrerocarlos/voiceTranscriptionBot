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

    const timeout = new Promise((_resolve, _reject) => {
      setTimeout(_resolve, 20000, "Could not transcribe, too long :(");
    });

    console.log("replying...");

    let result = Promise.race([
      await googleTranscribe(fileLink),
      timeout,
    ]) as any;
    
    clearInterval(interval);

    console.log("result", JSON.stringify(result, null, 2));
    
    if (result.transcription) {
      ctx.telegram.editMessageText(
        ctx.chat.id,
        translatingMessage.message_id,
        undefined,
        result.transcription 
      );
    } else {
      ctx.telegram.editMessageText(
        ctx.chat.id,
        translatingMessage.message_id,
        undefined,
        "Could not transcribe, invalid duration."
      );
    }
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

export const main = (event, cb) => {
  console.log("🔥", JSON.stringify(event, null, 2));
  return makeHandler(bot.webhookCallback("/telegram"))(event, cb);
};

// bot.telegram.setWebhook(
//   "https://ilpifex4si.execute-api.us-east-2.amazonaws.com/dev/telegram"
// );

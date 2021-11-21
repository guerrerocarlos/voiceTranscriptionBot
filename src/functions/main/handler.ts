import "source-map-support/register";

import { invokeFunction } from "../../utils/lambda";

export const main = (event, context, cb) => {
  console.log("🔥🔥", JSON.stringify(event, null, 2));

  invokeFunction("voicebot-dev-telegram", { event, context });

  const response = {
    statusCode: 200,
    body: "OK",
  };
  cb(null, response);
};

// bot.telegram.setWebhook(
//   "https://ilpifex4si.execute-api.us-east-2.amazonaws.com/dev/telegram"
// );

// import * as temp from "temp";
import * as ffmpeg from "fluent-ffmpeg";

export async function convertAudioToRaw(path, outputStream) {
  return new Promise((res, rej) => {
    ffmpeg()
      .input(path)
      .on("error", (error) => {
        rej(error);
      })
      .on("end", () => res(outputStream))
      .output(outputStream)
      .audioFrequency(16000)
      .toFormat("s16le")
      .run();
  });
}

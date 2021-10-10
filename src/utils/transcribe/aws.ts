import * as AWS from "aws-sdk";
import fetch from "node-fetch";
// import { createWriteStream } from "fs";
// import { pipeline } from "stream";
// import { promisify } from "util";
import { bindLog } from "../../utils/log";
let l = bindLog(__dirname, __filename);

import { put } from "./helpers/s3Storage";

var transcribeservice = new AWS.TranscribeService({
  region: "us-east-2",
});

export async function transcribeAWS(url, TranscriptionJobName) {
  var params = {
    Media: {
      /* required */
      MediaFileUri: url,
      // RedactedMediaFileUri: 'STRING_VALUE'
    },
    TranscriptionJobName /* required */,
    IdentifyLanguage: true,
    // JobExecutionSettings: {
    //   AllowDeferredExecution: true || false,
    //   DataAccessRoleArn: 'STRING_VALUE'
    // },
    // KMSEncryptionContext: {
    //   '<NonEmptyString>': 'STRING_VALUE',
    //   /* '<NonEmptyString>': ... */
    // },
    // LanguageCode: "en-US",
    // LanguageCode: "es-ES",
    // LanguageOptions: [
    //   af-ZA | ar-AE | ar-SA | cy-GB | da-DK | de-CH | de-DE | en-AB | en-AU | en-GB | en-IE | en-IN | en-US | en-WL | es-ES | es-US | fa-IR | fr-CA | fr-FR | ga-IE | gd-GB | he-IL | hi-IN | id-ID | it-IT | ja-JP | ko-KR | ms-MY | nl-NL | pt-BR | pt-PT | ru-RU | ta-IN | te-IN | tr-TR | zh-CN | zh-TW | th-TH | en-ZA | en-NZ,
    //   /* more items */
    // ],
    // MediaFormat: mp3 | mp4 | wav | flac | ogg | amr | webm,
    // MediaSampleRateHertz: 'NUMBER_VALUE',
    // ModelSettings: {
    //   LanguageModelName: 'STRING_VALUE'
    // },
    // OutputBucketName: 'STRING_VALUE',
    // OutputEncryptionKMSKeyId: 'STRING_VALUE',
    // OutputKey: 'STRING_VALUE',
    // Settings: {
    //   ChannelIdentification: true || false,
    //   MaxAlternatives: 'NUMBER_VALUE',
    //   MaxSpeakerLabels: 'NUMBER_VALUE',
    //   ShowAlternatives: true || false,
    //   ShowSpeakerLabels: true || false,
    //   VocabularyFilterMethod: remove | mask | tag,
    //   VocabularyFilterName: 'STRING_VALUE',
    //   VocabularyName: 'STRING_VALUE'
    // },
    // Subtitles: {
    //   Formats: [
    //     vtt | srt,
    //     /* more items */
    //   ]
    // },
    // Tags: [
    //   {
    //     Key: 'STRING_VALUE', /* required */
    //     Value: 'STRING_VALUE' /* required */
    //   },
    //   /* more items */
    // ]
  };
  await transcribeservice.startTranscriptionJob(params).promise();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function transcribe(url) {
  const response = await fetch(url, {});

  const fileName = `${new Date().getTime()}.oga`;

  const s3url = await put(response.body, fileName);

  await transcribeAWS(s3url, fileName);

  let result;


  for (let i = 0; i < 60; i++) {
    await sleep(1000);

    result = await transcribeservice
      .getTranscriptionJob({
        TranscriptionJobName: fileName /* required */,
      })
      .promise();

    l(i, result);

    if (result.TranscriptionJob.TranscriptionJobStatus !== "IN_PROGRESS") {
      break;
    }
  }

  if (result.TranscriptionJob.TranscriptionJobStatus !== "FAILED") {
    console.log("transcript", JSON.stringify(result, null, 2));

    const transcript = await fetch(
      result.TranscriptionJob.Transcript.TranscriptFileUri,
      {}
    );
    result = await transcript.json();

    l("result", JSON.stringify(result, null, 2));

    result.transcription = result.results.transcripts[0].transcript;

    return result;
  } else {
    throw Error(result.TranscriptionJob.FailureReason);
  }
}

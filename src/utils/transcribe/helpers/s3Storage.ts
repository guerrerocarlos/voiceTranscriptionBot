import { S3 } from "aws-sdk";

var s3 = new S3({ apiVersion: "2006-03-01" });

/**
 * Uploading file at path to google storage
 * @param {String} filePath Path of the file to upload
 * @returns end link of the uploaded file
 */
export async function put(body, Key) {
  var params = {
    Bucket: process.env.TRANSCRIPTION_S3_BUCKET,
    Key: `transcriptions/${Key}`,
    Body: body,
  };

  await s3.upload(params).promise();

  return `s3://${process.env.TRANSCRIPTION_S3_BUCKET}/${params.Key}`
}

/**
 * Deleting the file at uri
 * @param {String} uri Uri of the file to delete
 * @param {Mongoose:Chat} chat Chat with credentials
 */
export function del(Key) {
  var params = {
    Bucket: process.env.TRANSCRIPTION_S3_BUCKET,
    Key,
  };
  return s3.deleteObject(params).promise();
}


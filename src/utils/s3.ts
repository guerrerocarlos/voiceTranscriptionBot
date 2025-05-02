import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";

const s3client = new S3Client({
  endpoint: process.env.DO_ENDPOINT, // Find your endpoint in the control panel, under Settings. Prepend "https://".
  forcePathStyle: false, // Configures to use subdomain/virtual calling format.
  region: process.env.DO_REGION, // Must be "us-east-1" when creating new Spaces. Otherwise, use the region in your endpoint (for example, nyc3).
  credentials: {
    accessKeyId: process.env.DO_KEY, // Access key pair. You can create access key pairs using the control panel or API.
    secretAccessKey: process.env.DO_SECRET // Secret access key defined through an environment variable.
  }
});

function mimeType(path: string) {
  let extension = path.split(".").pop();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "pdf":
      return "application/pdf";
    default:
      return "application/json";
  }
}

function uploadToS3(options: PutObjectCommandInput) {
  options.ContentType = mimeType(options.Key || "")
  return s3client.send(new PutObjectCommand(options));
  // return s3.putObject(params);
}

function endWithJson(path: string) {
  if (path.endsWith(".html")) {
    return path;
  }
  if (!path.endsWith(".json")) {
    return path + ".json";
  }
  return path;
}

function checkKey(key: string) {
  // log("Check key:", key)
  if (key.includes("..")) throw new Error("Key cannot contain '..'");
  if (key.endsWith("/")) throw new Error("Key cannot end with /");
  if (key.endsWith("\\")) throw new Error("Key cannot end with \\");
  if (key.startsWith("/")) throw new Error("Key cannot start with /");

  if (key.endsWith(".csv")) return key

  return endWithJson(`${key}`);
}
function checkValueIsString(value: string) {
  if (typeof value !== "string") {
    value = JSON.stringify(value, null, 2);
  }
  return value;
}

export async function put(
  scope: string,
  filePath: string,
  value: any
): Promise<any> {
  let putParams = {
    Bucket: process.env.S3_BUCKET,
    Key: checkKey(`${scope}/${filePath}`),
    Body: checkValueIsString(value),
  };

  return uploadToS3(putParams);
}
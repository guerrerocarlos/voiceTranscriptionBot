const { Storage } = require("@google-cloud/storage");

import googleKey from "../googleCredentials" 

export function put(
  bucketName,
  destFileName,
  pass
) {

  // Creates a client
  const storage = new Storage({
    credentials: googleKey,
    projectId: googleKey.project_id,
  });

  // Get a reference to the bucket
  const myBucket = storage.bucket(bucketName);

  // Create a reference to a file object
  const file = myBucket.file(destFileName);

  const promise = new Promise((success, reject) => {
    pass
      .pipe(file.createWriteStream())
      .on("finish", () => {
        console.log("CLOSED!!");
        success(null);
      })
      .on("error", (err) => {
        reject(err);
      });
  });

  return promise;
}

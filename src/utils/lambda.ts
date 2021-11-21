import * as AWS from "aws-sdk";

export function invokeFunction(FunctionName, Payload) {
  var lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });
  return lambda.invoke(
    {
      FunctionName,
      Payload: JSON.stringify(Payload),
      InvocationType: "Event",
    },
    function (err, data) {
      if (err) console.log(err, err.stack);
      // an error occurred
      else console.log(data); // successful response
    }
  );

  // request.send();
}

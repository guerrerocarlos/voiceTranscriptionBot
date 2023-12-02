import type { AWS } from "@serverless/typescript";
import * as dotenv from "dotenv";
import telegram from "@functions/telegram";
import main from "@functions/main";

dotenv.config();

const serverlessConfiguration: AWS = {
  service: "voicebot",
  frameworkVersion: "2",
  custom: {
    webpack: {
      webpackConfig: "./webpack.config.js",
      includeModules: {
        forceExclude: ["aws-sdk"],
      },
    },
  },
  plugins: ["serverless-webpack"],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    region: "us-east-2",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    timeout: 120,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      BOT_TOKEN: process.env.BOT_TOKEN,
      TRANSCRIPTION_S3_BUCKET: process.env.TRANSCRIPTION_S3_BUCKET,
      TEMP_STORAGE_FOLDER: process.env.TEMP_STORAGE_FOLDER,
      WIT_TOKEN: process.env.WIT_TOKEN,
      GC_BUCKET: process.env.GC_BUCKET,
      GC_CREDENTIALS: process.env.GC_CREDENTIALS,
    },
    deploymentBucket: {
      name: "deployment-bucket-us-east-2",
    },
    lambdaHashingVersion: "20201221",
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: ["lambda:InvokeFunction"],
            Resource: ["*"],
          },
          {
            Effect: "Allow",
            Action: ["s3:ListBucket"],
            Resource: "arn:aws:s3:::telegram-bots-us-east-2",
          },
          {
            Effect: "Allow",
            Action: ["s3:PutObject"],
            Resource: "arn:aws:s3:::telegram-bots-us-east-2/*",
          },
          {
            Effect: "Allow",
            Action: ["s3:GetObject"],
            Resource: "arn:aws:s3:::telegram-bots-us-east-2/*",
          },
          {
            Effect: "Allow",
            Action: [
              "transcribe:StartTranscriptionJob",
              "transcribe:GetTranscriptionJob",
            ],
            Resource:
              "arn:aws:transcribe:us-east-2:149962407454:transcription-job/*",
          },
        ],
      },
    },
  },
  // import the function via paths
  functions: { telegram, main },
};

module.exports = serverlessConfiguration;

import { convertAudioToRaw } from "./helpers/ffmpeg";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { bindLog } from "../../utils/log";

const https = require('https')
const { PassThrough } = require('stream');

dotenv.config();

let l = bindLog(__dirname, __filename);

async function transcribeWit(token, pass) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'api.wit.ai',
      port: null,
      path: '/speech?v=20170307',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type':
          'audio/raw;encoding=signed-integer;bits=16;rate=16000;endian=little',
        'cache-control': 'no-cache',
      },
      timeout: 120 * 1000,
    }
    const req = https.request(options, (res) => {
      const chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks)
          const json = JSON.parse(body.toString())
          if (json.error) {
            const error = new Error(json.error)
            try {
              reject(error)
            } catch (err) {
              // Do nothing
            }
          } else {
            try {
              resolve(json)
            } catch (err) {
              // Do nothing
            }
          }
        } catch (err) {
          try {
            reject(err)
          } catch (error) {
            // Do nothing
          }
        }
      })

      res.on('error', (err) => {
        try {
          reject(err)
        } catch (error) {
          // Do nothing
        }
      })
    })

    req.on('error', (err) => {
      try {
        reject(err)
      } catch (error) {
        // Do nothing
      }
    })

    pass.pipe(req)
    let error
    pass.on('error', (err) => {
      error = err
    })
    pass.on('close', () => {
      if (error) {
        try {
          reject(error)
        } catch (err) {
          // Do nothing
        }
      }
    })
  })
}

export async function transcribe(url) {
  const pass = new PassThrough();

  const response = await fetch(url, {});

  convertAudioToRaw(response.body, pass)

  const result = await transcribeWit(process.env.WIT_TOKEN, pass) as any

  result.transcription = result._text

  return result

}


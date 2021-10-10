// import schema from './schema';
import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  layers: ["arn:aws:lambda:us-east-2:149962407454:layer:ffmpeg:2"],
  events: [
    {
      http: {
        method: 'any',
        path: 'telegram',
      }
    }
  ]
}

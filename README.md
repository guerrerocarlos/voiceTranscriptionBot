# Voice Transcription Bot

Telegram bot that transcribes voice and audio messages with OpenAI Whisper.

## Runtime

- Deployed on W7S with `w7s-io/w7s-cloud@v1`
- Worker entrypoint: `backend/index.ts`
- Telegram webhook: `/telegram`
- Health check: `/health`

## Configuration

Required secrets:

- `BOT_TOKEN`
- `OPENAI_API_KEY`

Optional secret:

- `TELEGRAM_WEBHOOK_SECRET`

Optional variable:

- `OPENAI_TRANSCRIPTION_MODEL` defaults to `whisper-1`.

## Development

```bash
npm ci
npm run check
```

## Telegram Webhook

After deployment, point Telegram at the W7S app:

```bash
BOT_TOKEN=... \
W7S_APP_URL=https://guerrerocarlos.w7s.cloud/voiceTranscriptionBot \
TELEGRAM_WEBHOOK_SECRET=... \
npm run set-webhook
```

## Deployment Metadata

`/health` returns:

- `branch`
- `commitHash`
- `deployedAt`

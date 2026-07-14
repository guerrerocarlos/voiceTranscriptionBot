# Voice Transcription Bot

Telegram bot that transcribes voice and audio messages with OpenAI Whisper.

## Runtime

- Deployed on W7S with `w7s-io/w7s-cloud@v1`
- Worker entrypoint: `backend/index.ts`
- Telegram webhook: `/telegram`
- Health check: `/health`
- Credit balances: W7S KV binding `BALANCES`

## Monetization

- Every Telegram user gets 25 free transcription credits on first use.
- Audio costs 1 credit per started minute.
- `/balance` shows the user's credit balance.
- `/buy` sends a 25-Star Telegram invoice for 25 credits.
- `/buy 100` sends a custom Telegram Stars invoice, clamped between 25 and 2500 credits.
- `/paysupport` returns payment support instructions.

## Configuration

Required secrets:

- `BOT_TOKEN`
- `OPENAI_API_KEY`

Optional secret:

- `TELEGRAM_WEBHOOK_SECRET`

Optional variable:

- `OPENAI_TRANSCRIPTION_MODEL` defaults to `whisper-1`.

Required W7S binding:

- KV namespace `BALANCES`

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

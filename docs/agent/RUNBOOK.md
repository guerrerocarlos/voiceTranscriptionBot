# VoiceTranscriptionBot Runbook

Last updated: 2026-07-14

## Workspace

```bash
cd /home/gnu/voiceTranscriptionBot
```

## Install

```bash
npm ci
```

## Test

```bash
npm run check
```

## Deploy

Pushing `master` runs `.github/workflows/deploy.yml`, which executes tests and deploys with `w7s-io/w7s-cloud@v1`.

Required GitHub/W7S secrets:

- `BOT_TOKEN`
- `OPENAI_API_KEY`

Optional secret:

- `TELEGRAM_WEBHOOK_SECRET`

Optional variable:

- `OPENAI_TRANSCRIPTION_MODEL` defaults to `whisper-1`.

## Webhook Setup

```bash
BOT_TOKEN=... \
W7S_APP_URL=https://guerrerocarlos.w7s.cloud/voicetranscriptionbot \
TELEGRAM_WEBHOOK_SECRET=... \
npm run set-webhook
```

## Verification

```bash
curl -fsS https://guerrerocarlos.w7s.cloud/voicetranscriptionbot/health
```

The response must include `branch`, `commitHash`, and `deployedAt`.

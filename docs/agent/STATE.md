# VoiceTranscriptionBot State

Last updated: 2026-07-14

## Current State

- Repository path: `/home/gnu/voiceTranscriptionBot`
- Default branch: `master`
- Runtime target: W7S Worker via `w7s-io/w7s-cloud@v1`
- The bot receives Telegram webhook updates at `/telegram`.
- Voice and audio messages are downloaded from Telegram and transcribed through OpenAI's audio transcription API with `whisper-1` by default.
- `/health` exposes `branch`, `commitHash`, and `deployedAt` from deploy-time variables.

## Active Priorities

- Configure W7S/GitHub secrets: `BOT_TOKEN`, `OPENAI_API_KEY`, and optional `TELEGRAM_WEBHOOK_SECRET`.
- After deployment, run `npm run set-webhook` with the production W7S app URL.

## Known Issues

- Live transcription cannot be verified locally without valid Telegram and OpenAI secrets.
- The uppercase workspace `/home/gnu/VoiceTranscriptionBot` is not a git checkout; the real repository is `/home/gnu/voiceTranscriptionBot`.

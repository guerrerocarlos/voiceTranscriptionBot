# VoiceTranscriptionBot State

Last updated: 2026-07-14

## Current State

- Repository path: `/home/gnu/voiceTranscriptionBot`
- Default branch: `master`
- Runtime target: W7S Worker via `w7s-io/w7s-cloud@v1`
- The bot receives Telegram webhook updates at `/telegram`.
- Voice and audio messages are downloaded from Telegram and transcribed through OpenAI's audio transcription API with `whisper-1` by default.
- `/health` exposes `branch`, `commitHash`, and `deployedAt` from deploy-time variables.
- GitHub Actions secrets include `BOT_TOKEN` and `OPENAI_API_KEY`.
- `BOT_TOKEN` was refreshed for `@voiceTranscriptionBot` on 2026-07-14.

## Active Priorities

- Redeploy after the `BOT_TOKEN` refresh and verify `/health` reports both `openaiConfigured: true` and `botConfigured: true`.
- Set Telegram webhook to `https://guerrerocarlos.w7s.cloud/voiceTranscriptionBot/telegram`.

## Known Issues

- Live transcription requires production secrets and Telegram webhook delivery; local checks only verify Worker routing and metadata.
- The uppercase workspace `/home/gnu/VoiceTranscriptionBot` is not a git checkout; the real repository is `/home/gnu/voiceTranscriptionBot`.

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
- Runtime reached OpenAI successfully, but transcription is currently blocked by OpenAI quota/billing on the configured project key.

## Active Priorities

- Add credits or increase the OpenAI project/org budget for the configured `OPENAI_API_KEY`.
- After billing/quota is fixed, send a Telegram voice message to verify end-to-end transcription.

## Known Issues

- Live transcription requires production secrets and Telegram webhook delivery; local checks only verify Worker routing and metadata.
- The uppercase workspace `/home/gnu/VoiceTranscriptionBot` is not a git checkout; the real repository is `/home/gnu/voiceTranscriptionBot`.

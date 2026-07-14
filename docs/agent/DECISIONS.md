# VoiceTranscriptionBot Decisions

Last updated: 2026-07-14

## W7S Worker Instead Of AWS Lambda

The bot now runs as a W7S Worker instead of the previous Serverless AWS Lambda deployment. This removes Lambda fan-out, S3 tracking, FFmpeg conversion, Google Speech, Wit, and AWS Transcribe from the active path.

## OpenAI Whisper Default

Audio transcription defaults to OpenAI `whisper-1` because the requested behavior was to use OpenAI Whisper. `OPENAI_TRANSCRIPTION_MODEL` can override the model at deploy time if needed.

## Telegram Webhook Security

`TELEGRAM_WEBHOOK_SECRET` is optional but supported. When set, the Worker requires Telegram's `X-Telegram-Bot-Api-Secret-Token` header on `/telegram`.

## Telegram Stars Monetization

The bot uses Telegram Stars as the native in-Telegram payment method for transcription credits. Balances are stored in W7S KV under `BALANCES`, with 25 free starting credits per Telegram user and a cost of 1 credit per started audio minute.

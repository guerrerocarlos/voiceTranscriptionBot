import { describe, expect, it } from "vitest";
import worker, { truncateTelegramText } from "../backend/index";

describe("worker", () => {
  it("returns deployment metadata on health", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health"),
      {
        APP_BRANCH: "master",
        APP_COMMIT_HASH: "abc123",
        APP_DEPLOYED_AT: "2026-07-14T00:00:00Z",
        OPENAI_TRANSCRIPTION_MODEL: "whisper-1",
      },
      { waitUntil: () => undefined },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "voicetranscriptionbot",
      branch: "master",
      commitHash: "abc123",
      deployedAt: "2026-07-14T00:00:00Z",
      model: "whisper-1",
      openaiConfigured: false,
      botConfigured: false,
    });
  });

  it("rejects a Telegram webhook with the wrong secret", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/telegram", {
        method: "POST",
        headers: {
          "x-telegram-bot-api-secret-token": "wrong",
        },
        body: "{}",
      }),
      { TELEGRAM_WEBHOOK_SECRET: "expected" },
      { waitUntil: () => undefined },
    );

    expect(response.status).toBe(401);
  });

  it("acknowledges valid Telegram updates before background work completes", async () => {
    const pending: Promise<unknown>[] = [];
    const response = await worker.fetch(
      new Request("https://example.com/telegram", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "expected",
        },
        body: JSON.stringify({ update_id: 1 }),
      }),
      { TELEGRAM_WEBHOOK_SECRET: "expected" },
      { waitUntil: (promise) => pending.push(promise) },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
    expect(pending).toHaveLength(1);
    await expect(pending[0]).resolves.toBeUndefined();
  });

  it("truncates long Telegram replies", () => {
    expect(truncateTelegramText("a".repeat(5000))).toHaveLength(3900);
  });
});

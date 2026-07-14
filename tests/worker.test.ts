import { describe, expect, it } from "vitest";
import worker, {
  buildInvoicePayload,
  calculateAudioCost,
  parseBuyAmount,
  parseInvoicePayload,
  truncateTelegramText,
} from "../backend/index";

describe("worker", () => {
  it("returns deployment metadata on health", async () => {
    const response = await worker.fetch(
      new Request("https://example.com/health"),
      {
        BALANCES: {} as KVNamespace,
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
      balancesConfigured: true,
      freeStartingCredits: 25,
      defaultBuyStars: 25,
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

  it("charges one credit per started audio minute", () => {
    expect(calculateAudioCost(1)).toBe(1);
    expect(calculateAudioCost(60)).toBe(1);
    expect(calculateAudioCost(61)).toBe(2);
    expect(calculateAudioCost(121)).toBe(3);
  });

  it("parses and clamps buy amounts", () => {
    expect(parseBuyAmount("/buy")).toBe(25);
    expect(parseBuyAmount("/buy 10")).toBe(25);
    expect(parseBuyAmount("/buy 100")).toBe(100);
    expect(parseBuyAmount("/buy 9999")).toBe(2500);
  });

  it("builds parseable payment payloads", () => {
    const payload = buildInvoicePayload(123, 50);
    expect(parseInvoicePayload(payload)).toEqual({ userId: 123, amount: 50 });
    expect(parseInvoicePayload("invalid")).toBeNull();
  });
});

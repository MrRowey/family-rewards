import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError, parseJson } from "@/lib/api";

describe("shared API helpers", () => {
  it("validates JSON bodies", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ id: "abc" }),
      headers: { "content-type": "application/json" },
    });
    await expect(parseJson(request, z.object({ id: z.string().min(1) }))).resolves.toEqual({ id: "abc" });
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request("http://localhost/api/test", { method: "POST", body: "{" });
    await expect(parseJson(request, z.object({ id: z.string() }))).rejects.toBeInstanceOf(z.ZodError);
  });

  it("maps known domain errors to stable statuses", async () => {
    for (const [message, status] of [
      ["NOT_FOUND: missing", 404],
      ["INSUFFICIENT_STARS: no stars", 400],
      ["OUT_OF_STOCK: empty", 400],
      ["INVALID_STATE: already processed", 409],
      ["CONCURRENCY_ERROR: conflict", 409],
    ] as const) {
      const response = apiError(new Error(message), "Unexpected error");
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: message });
    }
  });

  it("does not expose unexpected internal errors", async () => {
    const response = apiError(new Error("secret database detail"), "Request failed");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Request failed" });
  });
});

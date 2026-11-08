import { describe, expect, it, vi } from "vitest";
import { uuid } from "../src/lib/uuid.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuid", () => {
  it("returns v4 UUIDs", () => {
    expect(uuid()).toMatch(UUID);
    expect(uuid()).not.toBe(uuid());
  });

  it("works without crypto.randomUUID (plain http on the local network)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    try {
      expect(uuid()).toMatch(UUID);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

import { describe, it, expect } from "vitest";

// setup.ts deletes __loadedToolsStore + calls vi.resetModules() before each test.
// We use dynamic imports so each test gets a fresh module instance.

describe("getLoaded", () => {
  it("returns an empty Set for an unknown token (not null/undefined)", async () => {
    const { getLoaded } = await import("@/lib/loadedTools");
    const result = getLoaded("unknown-token");
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });
});

describe("addLoaded", () => {
  it("adds a name so getLoaded includes it", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["createReservation"]);
    expect(getLoaded("t1").has("createReservation")).toBe(true);
  });

  it("adding twice with different names → Set contains both", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["createReservation"]);
    addLoaded("t1", ["cancelReservation"]);
    const loaded = getLoaded("t1");
    expect(loaded.has("createReservation")).toBe(true);
    expect(loaded.has("cancelReservation")).toBe(true);
  });

  it("adding same name twice does not duplicate it in the Set", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["createReservation"]);
    addLoaded("t1", ["createReservation"]);
    expect(getLoaded("t1").size).toBe(1);
  });

  it("different tokens have independent Sets", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("tok_a", ["opA"]);
    addLoaded("tok_b", ["opB"]);
    expect(getLoaded("tok_a").has("opB")).toBe(false);
    expect(getLoaded("tok_b").has("opA")).toBe(false);
  });

  it("can add multiple names in a single call", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["opA", "opB", "opC"]);
    const loaded = getLoaded("t1");
    expect(loaded.has("opA")).toBe(true);
    expect(loaded.has("opB")).toBe(true);
    expect(loaded.has("opC")).toBe(true);
  });
});

describe("removeLoaded", () => {
  it("removeLoaded on unknown token does not throw", async () => {
    const { removeLoaded } = await import("@/lib/loadedTools");
    expect(() => removeLoaded("does-not-exist", ["anything"])).not.toThrow();
  });

  it("removes the specified name but keeps others", async () => {
    const { addLoaded, removeLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["createReservation", "cancelReservation"]);
    removeLoaded("t1", ["createReservation"]);
    const loaded = getLoaded("t1");
    expect(loaded.has("createReservation")).toBe(false);
    expect(loaded.has("cancelReservation")).toBe(true);
  });

  it("removing a non-loaded name is a no-op", async () => {
    const { addLoaded, removeLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["opA"]);
    removeLoaded("t1", ["opNotLoaded"]);
    expect(getLoaded("t1").has("opA")).toBe(true);
  });
});

describe("clearLoaded", () => {
  it("clears all names so getLoaded returns empty Set", async () => {
    const { addLoaded, clearLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["createReservation", "cancelReservation"]);
    clearLoaded("t1");
    expect(getLoaded("t1").size).toBe(0);
  });

  it("clearing one token does not affect another", async () => {
    const { addLoaded, clearLoaded, getLoaded } = await import("@/lib/loadedTools");
    addLoaded("t1", ["opA"]);
    addLoaded("t2", ["opB"]);
    clearLoaded("t1");
    expect(getLoaded("t2").has("opB")).toBe(true);
  });

  it("clearing an unknown token does not throw", async () => {
    const { clearLoaded } = await import("@/lib/loadedTools");
    expect(() => clearLoaded("never-existed")).not.toThrow();
  });
});

describe("GC (garbage collection)", () => {
  it("entries touched more than 24h ago are removed on next addLoaded call", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");

    // Create an entry for 'old-token'
    addLoaded("old-token", ["staleOp"]);

    // Backdate its touchedAt to 25 hours ago
    const storeRef = (globalThis as Record<string, unknown>).__loadedToolsStore as {
      entries: Map<string, { names: Set<string>; touchedAt: number }>;
    };
    const entry = storeRef.entries.get("old-token");
    expect(entry).toBeDefined();
    entry!.touchedAt = Date.now() - 25 * 60 * 60 * 1000;

    // Trigger GC by calling addLoaded for a different token
    addLoaded("new-token", ["freshOp"]);

    // The stale entry should now be gone
    expect(storeRef.entries.has("old-token")).toBe(false);
    expect(getLoaded("old-token").size).toBe(0);
  });

  it("fresh entries survive a GC pass", async () => {
    const { addLoaded, getLoaded } = await import("@/lib/loadedTools");

    addLoaded("fresh-token", ["freshOp"]);
    // Trigger GC pass (fresh-token is within TTL)
    addLoaded("another-token", ["anotherOp"]);

    expect(getLoaded("fresh-token").has("freshOp")).toBe(true);
  });
});

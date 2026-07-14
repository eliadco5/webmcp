import { describe, it, expect, beforeEach } from "vitest";
import type { Operation } from "@/lib/operations/types";

// setup.ts deletes all singletons and calls vi.resetModules() before each test.
// We import the operations index first so the registry is populated, then import modules.

describe("globToRegExp", () => {
  it("bare keyword 'reservation' matches path containing reservation in the name segment", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("reservation");
    // createReservation is the name segment — matches **/*reservation*
    expect(re.test("reservation/booking/createReservation")).toBe(true);
  });

  it("bare keyword 'reservation' does NOT match searchAvailability (name has no 'reservation')", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("reservation");
    // searchAvailability doesn't contain the word "reservation"
    expect(re.test("reservation/availability/searchAvailability")).toBe(false);
  });

  it("'*refund*' with wildcard treated as **/*refund* → matches finance/adjustments/issueRefund", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("*refund*");
    expect(re.test("finance/adjustments/issueRefund")).toBe(true);
  });

  it("'*refund*' does NOT match crm/guests/createGuest", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("*refund*");
    expect(re.test("crm/guests/createGuest")).toBe(false);
  });

  it("'finance/**' matches finance/adjustments/issueRefund", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("finance/**");
    expect(re.test("finance/adjustments/issueRefund")).toBe(true);
  });

  it("'finance/**' does NOT match reservation/booking/createReservation", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("finance/**");
    expect(re.test("reservation/booking/createReservation")).toBe(false);
  });

  it("'**/*reservation*' matches reservation/booking/createReservation", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("**/*reservation*");
    expect(re.test("reservation/booking/createReservation")).toBe(true);
  });

  it("'**/*reservation*' does NOT match reservation/availability/searchAvailability", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("**/*reservation*");
    // name segment is searchAvailability — does not contain 'reservation'
    expect(re.test("reservation/availability/searchAvailability")).toBe(false);
  });

  it("'**' matches any path including reservation/booking/createReservation", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("**");
    expect(re.test("reservation/booking/createReservation")).toBe(true);
  });

  it("'?eservation/**' (? glob) matches reservation/booking/createReservation", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("?eservation/**");
    expect(re.test("reservation/booking/createReservation")).toBe(true);
  });

  it("case insensitive: 'FINANCE/**' matches finance/adjustments/issueRefund", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("FINANCE/**");
    expect(re.test("finance/adjustments/issueRefund")).toBe(true);
  });

  it("exact path matches itself", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("finance/adjustments/issueRefund");
    expect(re.test("finance/adjustments/issueRefund")).toBe(true);
  });

  it("exact path does NOT match a different path", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("finance/adjustments/issueRefund");
    expect(re.test("finance/adjustments/applyNoShowFee")).toBe(false);
  });

  it("path with dots does not match slash-based paths (dot is not slash)", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("reservation.booking");
    // dots in the pattern are treated as literal dots in regex; won't match slashes
    expect(re.test("reservation/booking")).toBe(false);
  });

  it("'crm/**' matches crm/guests/createGuest and does NOT match reservation/booking/createReservation", async () => {
    const { globToRegExp } = await import("@/lib/modules");
    const re = globToRegExp("crm/**");
    expect(re.test("crm/guests/createGuest")).toBe(true);
    expect(re.test("reservation/booking/createReservation")).toBe(false);
  });
});

describe("searchTree", () => {
  it("searchTree('refund', 'admin', registry) → functions includes issueRefund", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("refund", "admin", registry);
    const names = result.functions.map((f) => f.name);
    expect(names).toContain("issueRefund");
  });

  it("issueRefund result has module === 'finance.adjustments'", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("refund", "admin", registry);
    const fn = result.functions.find((f) => f.name === "issueRefund");
    expect(fn).toBeDefined();
    expect(fn!.module).toBe("finance.adjustments");
  });

  it("searchTree('reservation', 'admin') includes createReservation and cancelReservation but not searchAvailability", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("reservation", "admin", registry);
    const names = result.functions.map((f) => f.name);
    expect(names).toContain("createReservation");
    expect(names).toContain("cancelReservation");
    expect(names).not.toContain("searchAvailability");
  });

  it("searchTree('finance/**', 'admin') returns finance functions", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("finance/**", "admin", registry);
    const names = result.functions.map((f) => f.name);
    expect(names).toContain("getDailyRevenueSummary");
    expect(names).toContain("issueRefund");
    expect(names).toContain("listPayments");
  });

  it("searchTree('finance/**', 'admin') modules includes finance.* entries", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("finance/**", "admin", registry);
    const modulePaths = result.modules.map((m) => m.path);
    expect(modulePaths.some((p) => p.startsWith("finance"))).toBe(true);
  });

  it("searchTree('finance/**', 'customer') → functions is empty (finance is admin-only)", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("finance/**", "customer", registry);
    expect(result.functions).toHaveLength(0);
  });

  it("searchTree('**', 'admin') returns all non-alwaysOn ops visible to admin", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("**", "admin", registry);
    // Should include a wide variety of ops
    const names = result.functions.map((f) => f.name);
    expect(names).toContain("createReservation");
    expect(names).toContain("issueRefund");
    expect(names).toContain("createGuest");
  });

  it("searchTree('**', 'customer') has fewer functions than admin", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const adminResult = searchTree("**", "admin", registry);
    const customerResult = searchTree("**", "customer", registry);
    expect(customerResult.functions.length).toBeLessThan(adminResult.functions.length);
  });

  it("alwaysOn ops (explore, search, etc.) are NEVER in searchTree results", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("**", "admin", registry);
    const names = result.functions.map((f) => f.name);
    const alwaysOnNames = ["explore", "search", "describe_tool", "describeTool", "invoke", "load_tools", "loadTools", "unload_tools", "unloadTools", "getContext", "getCapabilities"];
    for (const name of alwaysOnNames) {
      expect(names).not.toContain(name);
    }
  });

  it("searchTree for nonexistent pattern returns empty functions and modules", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("nonexistent_xyz_pattern_12345", "admin", registry);
    expect(result.functions).toHaveLength(0);
    expect(result.modules).toHaveLength(0);
  });

  it("searchTree('crm/**', 'customer') → does not include support-only ops like createGuest or searchGuests", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("crm/**", "customer", registry);
    const names = result.functions.map((f) => f.name);
    // createGuest and searchGuests require support+ — must not appear
    expect(names).not.toContain("createGuest");
    expect(names).not.toContain("searchGuests");
    // getLoyaltyStatus allows customer — it should appear
    expect(names).toContain("getLoyaltyStatus");
  });

  it("searchTree('crm/**', 'support') returns CRM functions", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("crm/**", "support", registry);
    const names = result.functions.map((f) => f.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain("createGuest");
    expect(names).toContain("searchGuests");
  });

  it("each function result has {name, title, module, path, permission, parallelSafe}", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("reservation", "admin", registry);
    for (const fn of result.functions) {
      expect(typeof fn.name).toBe("string");
      expect(typeof fn.title).toBe("string");
      expect(typeof fn.module).toBe("string");
      expect(typeof fn.path).toBe("string");
      expect(["read", "write"]).toContain(fn.permission);
      expect(typeof fn.parallelSafe).toBe("boolean");
    }
  });

  it("path field is module (dots→slashes) + '/' + name", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("refund", "admin", registry);
    const fn = result.functions.find((f) => f.name === "issueRefund");
    expect(fn).toBeDefined();
    expect(fn!.path).toBe(fn!.module.replace(/\./g, "/") + "/" + fn!.name);
  });

  it("module results are role-visible: no finance modules for customer role", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("**", "customer", registry);
    const modulePaths = result.modules.map((m) => m.path);
    expect(modulePaths.some((p) => p.startsWith("finance"))).toBe(false);
  });

  it("searchTree('*cancel*', 'admin') includes cancelReservation and cancelAnyReservation", async () => {
    await import("@/lib/operations/index");
    const { searchTree } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const result = searchTree("*cancel*", "admin", registry);
    const names = result.functions.map((f) => f.name);
    expect(names).toContain("cancelReservation");
    expect(names).toContain("cancelAnyReservation");
  });
});

describe("getNode", () => {
  it("getNode('reservation', 'customer', registry) has submodules including reservation.booking", async () => {
    await import("@/lib/operations/index");
    const { getNode } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const node = getNode("reservation", "customer", registry);
    expect(node).not.toBeNull();
    const subPaths = node!.submodules.map((s) => s.path);
    expect(subPaths).toContain("reservation.booking");
  });

  it("getNode('nonexistent', 'customer', registry) returns null", async () => {
    await import("@/lib/operations/index");
    const { getNode } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    expect(getNode("nonexistent", "customer", registry)).toBeNull();
  });

  it("getNode('reservation.booking', 'customer', registry) functions includes createReservation", async () => {
    await import("@/lib/operations/index");
    const { getNode } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const node = getNode("reservation.booking", "customer", registry);
    expect(node).not.toBeNull();
    const fnNames = node!.functions.map((f) => f.name);
    expect(fnNames).toContain("createReservation");
  });
});

describe("expandWildcard", () => {
  it("expandWildcard('reservation.*', 'admin') returns sub-modules but NOT the reservation root", async () => {
    await import("@/lib/operations/index");
    const { expandWildcard } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const results = expandWildcard("reservation.*", "admin", registry);
    const paths = results.map((r) => r.path);
    expect(paths).not.toContain("reservation");
    // Should include direct and indirect children of reservation
    expect(paths.some((p) => p.startsWith("reservation."))).toBe(true);
    expect(paths).toContain("reservation.booking");
    expect(paths).toContain("reservation.availability");
  });

  it("expandWildcard('*', 'customer') returns all MODULE_DEFS entries", async () => {
    await import("@/lib/operations/index");
    const { expandWildcard, MODULE_DEFS } = await import("@/lib/modules");
    const { registry } = await import("@/lib/operations/index");
    const results = expandWildcard("*", "customer", registry);
    expect(results.length).toBe(MODULE_DEFS.length);
  });
});

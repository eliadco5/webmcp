import { describe, it, expect, beforeEach, vi } from "vitest";

// setup.ts already calls vi.resetModules() + deletes __authStore in beforeEach.
// We use dynamic imports inside each test so each test gets a fresh module instance.

describe("roleSatisfies", () => {
  it("admin satisfies [customer]", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("admin", ["customer"])).toBe(true);
  });

  it("customer does NOT satisfy [admin]", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("customer", ["admin"])).toBe(false);
  });

  it("support satisfies [support, admin] (has one match at rank)", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("support", ["support", "admin"])).toBe(true);
  });

  it("empty allowed array → false for any role", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("admin", [])).toBe(false);
    expect(roleSatisfies("customer", [])).toBe(false);
  });

  it("all roles satisfy [customer] due to hierarchy", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("customer", ["customer"])).toBe(true);
    expect(roleSatisfies("support", ["customer"])).toBe(true);
    expect(roleSatisfies("admin", ["customer"])).toBe(true);
  });

  it("exact match works: support satisfies [support]", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("support", ["support"])).toBe(true);
  });

  it("customer does NOT satisfy [support]", async () => {
    const { roleSatisfies } = await import("@/lib/auth");
    expect(roleSatisfies("customer", ["support"])).toBe(false);
  });
});

describe("verifyCredentials", () => {
  it("alice/password → User with role customer", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    const user = verifyCredentials("alice", "password");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("alice");
    expect(user!.role).toBe("customer");
    expect(user!.id).toBe("u_alice");
  });

  it("bob/password → User with role admin", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    const user = verifyCredentials("bob", "password");
    expect(user).not.toBeNull();
    expect(user!.role).toBe("admin");
    expect(user!.id).toBe("u_bob");
  });

  it("carol/password → User with role support", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    const user = verifyCredentials("carol", "password");
    expect(user).not.toBeNull();
    expect(user!.role).toBe("support");
    expect(user!.id).toBe("u_carol");
  });

  it("wrong password → null", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    expect(verifyCredentials("alice", "wrong")).toBeNull();
  });

  it("unknown user → null", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    expect(verifyCredentials("nobody", "password")).toBeNull();
  });

  it("password is case-sensitive", async () => {
    const { verifyCredentials } = await import("@/lib/auth");
    expect(verifyCredentials("alice", "Password")).toBeNull();
    expect(verifyCredentials("alice", "PASSWORD")).toBeNull();
  });
});

describe("issueToken", () => {
  it("returns a non-empty string", async () => {
    const { verifyCredentials, issueToken } = await import("@/lib/auth");
    const user = verifyCredentials("alice", "password")!;
    const token = issueToken(user);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("calling twice for same user reuses same token within TTL", async () => {
    const { verifyCredentials, issueToken } = await import("@/lib/auth");
    const user = verifyCredentials("bob", "password")!;
    const t1 = issueToken(user);
    const t2 = issueToken(user);
    expect(t1).toBe(t2);
  });

  it("different users get different tokens", async () => {
    const { verifyCredentials, issueToken } = await import("@/lib/auth");
    const alice = verifyCredentials("alice", "password")!;
    const bob = verifyCredentials("bob", "password")!;
    expect(issueToken(alice)).not.toBe(issueToken(bob));
  });
});

describe("userForToken", () => {
  it("returns User for valid token", async () => {
    const { verifyCredentials, issueToken, userForToken } = await import("@/lib/auth");
    const alice = verifyCredentials("alice", "password")!;
    const token = issueToken(alice);
    const user = userForToken(token);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u_alice");
  });

  it("returns null for garbage string", async () => {
    const { userForToken } = await import("@/lib/auth");
    expect(userForToken("not-a-real-token")).toBeNull();
  });

  it("returns null for expired token (9 hours ahead)", async () => {
    vi.useFakeTimers();
    const { verifyCredentials, issueToken, userForToken } = await import("@/lib/auth");
    const alice = verifyCredentials("alice", "password")!;
    const token = issueToken(alice);
    // Advance time past the 8-hour TTL
    vi.advanceTimersByTime(9 * 60 * 60 * 1000);
    const user = userForToken(token);
    expect(user).toBeNull();
    vi.useRealTimers();
  });

  it("returns null for empty string token", async () => {
    const { userForToken } = await import("@/lib/auth");
    expect(userForToken("")).toBeNull();
  });
});

describe("createSession / userForSession / destroySession", () => {
  it("round-trip: createSession → userForSession returns user", async () => {
    const { verifyCredentials, createSession, userForSession } = await import("@/lib/auth");
    const alice = verifyCredentials("alice", "password")!;
    const sid = createSession(alice);
    const user = userForSession(sid);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u_alice");
  });

  it("destroySession makes the session invalid", async () => {
    const { verifyCredentials, createSession, userForSession, destroySession } = await import("@/lib/auth");
    const bob = verifyCredentials("bob", "password")!;
    const sid = createSession(bob);
    destroySession(sid);
    expect(userForSession(sid)).toBeNull();
  });

  it("returns null for unknown session id", async () => {
    const { userForSession } = await import("@/lib/auth");
    expect(userForSession("bogus-session-id")).toBeNull();
  });

  it("two sessions for same user are independent", async () => {
    const { verifyCredentials, createSession, userForSession, destroySession } = await import("@/lib/auth");
    const carol = verifyCredentials("carol", "password")!;
    const sid1 = createSession(carol);
    const sid2 = createSession(carol);
    expect(sid1).not.toBe(sid2);
    destroySession(sid1);
    expect(userForSession(sid1)).toBeNull();
    expect(userForSession(sid2)).not.toBeNull();
  });
});

describe("scopesForRole", () => {
  it("customer gets booking:read and booking:write only", async () => {
    const { scopesForRole } = await import("@/lib/auth");
    const scopes = scopesForRole("customer");
    expect(scopes).toContain("booking:read");
    expect(scopes).toContain("booking:write");
    expect(scopes).not.toContain("booking:support");
    expect(scopes).not.toContain("booking:admin");
  });

  it("admin gets all four scopes", async () => {
    const { scopesForRole } = await import("@/lib/auth");
    const scopes = scopesForRole("admin");
    expect(scopes).toContain("booking:read");
    expect(scopes).toContain("booking:write");
    expect(scopes).toContain("booking:support");
    expect(scopes).toContain("booking:admin");
  });

  it("support gets read, write, and support but not admin scope", async () => {
    const { scopesForRole } = await import("@/lib/auth");
    const scopes = scopesForRole("support");
    expect(scopes).toContain("booking:read");
    expect(scopes).toContain("booking:write");
    expect(scopes).toContain("booking:support");
    expect(scopes).not.toContain("booking:admin");
  });
});

describe("getUserById", () => {
  it("known id returns the user", async () => {
    const { getUserById } = await import("@/lib/auth");
    const user = getUserById("u_alice");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("alice");
  });

  it("unknown id returns null", async () => {
    const { getUserById } = await import("@/lib/auth");
    expect(getUserById("u_nobody")).toBeNull();
  });
});

describe("updateUserRole", () => {
  it("updates alice's role to admin and returns updated user", async () => {
    const { updateUserRole } = await import("@/lib/auth");
    const updated = updateUserRole("u_alice", "admin");
    expect(updated).not.toBeNull();
    expect(updated!.role).toBe("admin");
    expect(updated!.id).toBe("u_alice");
  });

  it("returns null for unknown userId", async () => {
    const { updateUserRole } = await import("@/lib/auth");
    expect(updateUserRole("u_bad", "admin")).toBeNull();
  });

  it("invalidates existing tokens after role change", async () => {
    const { verifyCredentials, issueToken, updateUserRole, userForToken } = await import("@/lib/auth");
    const alice = verifyCredentials("alice", "password")!;
    const token = issueToken(alice);
    // Confirm token is valid before role change
    expect(userForToken(token)).not.toBeNull();
    // Change role — should invalidate the token
    updateUserRole("u_alice", "admin");
    expect(userForToken(token)).toBeNull();
  });
});

// ── Roles ─────────────────────────────────────────────────────────────────────

export type Role = "customer" | "support" | "admin";

const ROLE_RANK: Record<Role, number> = { customer: 1, support: 2, admin: 3 };

/** Returns true when the user's role satisfies at least one of the required roles
 *  (hierarchical: admin ≥ support ≥ customer). */
export function roleSatisfies(userRole: Role, allowed: Role[]): boolean {
  const rank = ROLE_RANK[userRole];
  return allowed.some((r) => rank >= ROLE_RANK[r]);
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

// The canonical resource URI this server is the audience for (RFC 8707).
// Must match the URL callers use to reach the MCP endpoint.
export const MCP_RESOURCE = process.env.MCP_RESOURCE_URL ?? "http://localhost:3000/api/mcp";

// Agent token TTL: 8 hours
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

// Seeded demo users. Passwords are plaintext — intentional for an in-memory demo only.
const USERS: Record<string, { user: User; password: string }> = {
  alice: { user: { id: "u_alice", username: "alice", displayName: "Alice", role: "customer" }, password: "password" },
  bob:   { user: { id: "u_bob",   username: "bob",   displayName: "Bob",   role: "admin"    }, password: "password" },
  carol: { user: { id: "u_carol", username: "carol", displayName: "Carol", role: "support"  }, password: "password" },
};

// ── Auth store (in-memory singleton) ─────────────────────────────────────────

interface TokenEntry {
  userId: string;
  audience: string;   // RFC 8707: token is bound to this resource URI
  expiresAt: number;  // ms epoch
}

interface AuthStore {
  tokens: Map<string, TokenEntry>;    // token → entry
  sessions: Map<string, string>;      // sessionId → userId  (sessions don't expire — browser session cookie)
}

declare global {
  // eslint-disable-next-line no-var
  var __authStore: AuthStore | undefined;
}

const authStore: AuthStore =
  globalThis.__authStore ??
  (globalThis.__authStore = { tokens: new Map(), sessions: new Map() });

// ── Helpers ───────────────────────────────────────────────────────────────────

function cryptoRandomHex(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function verifyCredentials(username: string, password: string): User | null {
  const entry = USERS[username];
  if (!entry || entry.password !== password) return null;
  return entry.user;
}

export function getUserById(id: string): User | null {
  return Object.values(USERS).find((e) => e.user.id === id)?.user ?? null;
}

export function listUsers(): User[] {
  return Object.values(USERS).map((e) => e.user);
}

export function updateUserRole(userId: string, role: Role): User | null {
  const entry = Object.values(USERS).find((e) => e.user.id === userId);
  if (!entry) return null;
  if (!["customer", "support", "admin"].includes(role)) return null;
  entry.user = { ...entry.user, role };
  // Invalidate all tokens for this user so the next call uses the new role
  for (const [token, e] of authStore.tokens) {
    if (e.userId === userId) authStore.tokens.delete(token);
  }
  return entry.user;
}

// ── Agent tokens (RFC 8707 audience-bound, expiring) ─────────────────────────

export function issueToken(user: User): string {
  // Reuse a still-valid token bound to the same audience so the UI shows a stable value
  for (const [token, entry] of authStore.tokens) {
    if (entry.userId === user.id && entry.audience === MCP_RESOURCE && entry.expiresAt > Date.now()) {
      return token;
    }
  }
  const token = cryptoRandomHex(24);
  authStore.tokens.set(token, {
    userId: user.id,
    audience: MCP_RESOURCE,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export function userForToken(token: string): User | null {
  const entry = authStore.tokens.get(token);
  if (!entry) return null;
  // Enforce audience binding (RFC 8707) and expiry
  if (entry.audience !== MCP_RESOURCE || entry.expiresAt <= Date.now()) {
    authStore.tokens.delete(token);
    return null;
  }
  return getUserById(entry.userId);
}

// ── UI sessions ───────────────────────────────────────────────────────────────

export function createSession(user: User): string {
  const sid = cryptoRandomHex(32); // non-deterministic per MCP security best practices
  authStore.sessions.set(sid, user.id);
  return sid;
}

export function userForSession(sessionId: string): User | null {
  const uid = authStore.sessions.get(sessionId);
  if (!uid) return null;
  return getUserById(uid);
}

export function destroySession(sessionId: string) {
  authStore.sessions.delete(sessionId);
}

export const SESSION_COOKIE = "agentbridge_session";

// ── Scope helpers (for AuthInfo & RFC 9728 metadata) ─────────────────────────

const ROLE_SCOPES: Record<Role, string[]> = {
  customer: ["booking:read", "booking:write"],
  support:  ["booking:read", "booking:write", "booking:support"],
  admin:    ["booking:read", "booking:write", "booking:support", "booking:admin"],
};

export function scopesForRole(role: Role): string[] {
  return ROLE_SCOPES[role];
}

export const ALL_SCOPES = ["booking:read", "booking:write", "booking:support", "booking:admin"];

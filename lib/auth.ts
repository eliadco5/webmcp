export interface User {
  id: string;
  username: string;
  displayName: string;
}

interface AuthStore {
  tokens: Map<string, string>;   // token → userId
  sessions: Map<string, string>; // sessionId → userId
}

// Singleton persisted across hot-reloads, same pattern as globalThis.__bookingStore
declare global {
  // eslint-disable-next-line no-var
  var __authStore: AuthStore | undefined;
}

const authStore: AuthStore =
  globalThis.__authStore ??
  (globalThis.__authStore = { tokens: new Map(), sessions: new Map() });

// Seeded demo users. Passwords are plaintext — intentional for an in-memory demo only.
const USERS: Record<string, { user: User; password: string }> = {
  alice: { user: { id: "u_alice", username: "alice", displayName: "Alice" }, password: "password" },
  bob: { user: { id: "u_bob", username: "bob", displayName: "Bob" }, password: "password" },
};

function userId(u: User) { return u.id; }

export function verifyCredentials(username: string, password: string): User | null {
  const entry = USERS[username];
  if (!entry || entry.password !== password) return null;
  return entry.user;
}

export function getUserById(id: string): User | null {
  return Object.values(USERS).find((e) => e.user.id === id)?.user ?? null;
}

// ── Agent tokens ──────────────────────────────────────────────────────────────

export function issueToken(user: User): string {
  // Reuse an existing token for this user so the UI always shows the same value
  for (const [token, uid] of authStore.tokens) {
    if (uid === userId(user)) return token;
  }
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  authStore.tokens.set(token, userId(user));
  return token;
}

export function userForToken(token: string): User | null {
  const uid = authStore.tokens.get(token);
  if (!uid) return null;
  return getUserById(uid);
}

// ── UI sessions ───────────────────────────────────────────────────────────────

export function createSession(user: User): string {
  const sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  authStore.sessions.set(sid, userId(user));
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

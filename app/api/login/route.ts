import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyCredentials, createSession, issueToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const user = verifyCredentials(String(username ?? ""), String(password ?? ""));
  if (!user) {
    return Response.json(
      { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid username or password." } },
      { status: 401 }
    );
  }

  const sessionId = createSession(user);
  const agentToken = issueToken(user);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // No maxAge — session cookie (expires when browser closes)
  });

  return Response.json({
    success: true,
    user: { id: user.id, username: user.username, displayName: user.displayName },
    agentToken,
  });
}

import { cookies } from "next/headers";
import { userForSession, issueToken, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const user = sessionId ? userForSession(sessionId) : null;
  if (!user) {
    return Response.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Not logged in." } },
      { status: 401 }
    );
  }
  const agentToken = issueToken(user);
  return Response.json({
    success: true,
    user: { id: user.id, username: user.username, displayName: user.displayName },
    agentToken,
  });
}

import { cookies } from "next/headers";
import { auditLog } from "@/lib/auditlog";
import { userForSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const user = sessionId ? userForSession(sessionId) : null;
  if (!user) {
    return Response.json(
      { success: false, error: { code: "UNAUTHENTICATED", message: "Login required." } },
      { status: 401 }
    );
  }
  return Response.json(auditLog.getEntries());
}

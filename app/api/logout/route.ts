import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) destroySession(sessionId);
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}

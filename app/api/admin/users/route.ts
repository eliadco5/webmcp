import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { userForSession, SESSION_COOKIE } from "@/lib/auth";

// Import the mutable USERS store
import { listUsers, updateUserRole } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const caller = sessionId ? userForSession(sessionId) : null;
  if (!caller) return Response.json({ success: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  if (caller.role !== "admin") return Response.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

  return Response.json({ success: true, users: listUsers() });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const caller = sessionId ? userForSession(sessionId) : null;
  if (!caller) return Response.json({ success: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  if (caller.role !== "admin") return Response.json({ success: false, error: { code: "FORBIDDEN" } }, { status: 403 });

  const { userId, role } = await req.json();
  const updated = updateUserRole(userId, role);
  if (!updated) return Response.json({ success: false, error: { code: "NOT_FOUND" } }, { status: 404 });
  return Response.json({ success: true, user: updated });
}

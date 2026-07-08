import { cookies } from "next/headers";
import { store } from "@/lib/store";
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

  const encoder = new TextEncoder();
  let unsubStore: (() => void) | null = null;
  let unsubAudit: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller already closed
        }
      }

      unsubStore = store.on((event) => send("store", event));
      unsubAudit = auditLog.onChange((entry) => send("audit", entry));
      ping = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch { /* closed */ }
      }, 15000);
    },
    cancel() {
      unsubStore?.();
      unsubAudit?.();
      if (ping !== null) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

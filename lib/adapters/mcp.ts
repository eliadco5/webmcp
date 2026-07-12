import { AsyncLocalStorage } from "async_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registry } from "@/lib/operations";
import { auditLog } from "@/lib/auditlog";
import { fail } from "@/lib/result";
import { roleSatisfies } from "@/lib/auth";
import type { Role } from "@/lib/auth";

// Per-request ALS holding the caller's role.
// Populated by withMcpAuthRole() before the MCP handler runs;
// readable during registerMcpTools() which runs inside the same async context.
const roleContext = new AsyncLocalStorage<Role>();

export function getRoleContext(): Role | undefined {
  return roleContext.getStore();
}

/** Wrap an existing MCP handler so the caller's role is available in roleContext. */
export function withMcpAuthRole(
  handler: (req: Request) => Promise<Response>,
  getRole: (req: Request) => Role | undefined
): (req: Request) => Promise<Response> {
  return (req: Request) =>
    roleContext.run(getRole(req) ?? ("customer" as Role), () => handler(req));
}

export function registerMcpTools(server: McpServer) {
  const callerRole: Role | undefined = roleContext.getStore();

  for (const op of registry) {
    // Skip registering tools the caller's role cannot use — gives a per-role tools/list
    if (callerRole && !roleSatisfies(callerRole, op.roles)) continue;

    const zodShape = op.inputSchema as Record<string, z.ZodTypeAny>;

    server.registerTool(
      op.name,
      {
        title: op.title,
        description: op.description,
        inputSchema: zodShape,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (input: Record<string, unknown>, extra: any) => {
        const userId: string | undefined = extra?.authInfo?.extra?.userId;
        const role: Role | undefined = extra?.authInfo?.extra?.role;

        if (!userId || !role) {
          const err = fail("UNAUTHENTICATED", "A valid user token is required.");
          auditLog.record(op.name, input, false, "agent");
          return { content: [{ type: "text" as const, text: JSON.stringify(err, null, 2) }], isError: true };
        }

        // Defense-in-depth: re-check role on every call
        if (!roleSatisfies(role, op.roles)) {
          const err = fail("FORBIDDEN", `Role '${role}' is not permitted to call '${op.name}'.`);
          auditLog.record(op.name, input, false, "agent");
          return { content: [{ type: "text" as const, text: JSON.stringify(err, null, 2) }], isError: true };
        }

        try {
          const result = await op.handler(input, { userId, role });
          auditLog.record(op.name, input, result.success, "agent");
          if (result.success) {
            return { content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }] };
          } else {
            return { content: [{ type: "text" as const, text: JSON.stringify(result.error, null, 2) }], isError: true };
          }
        } catch (err) {
          auditLog.record(op.name, input, false, "agent");
          return { content: [{ type: "text" as const, text: String(err) }], isError: true };
        }
      }
    );
  }
}

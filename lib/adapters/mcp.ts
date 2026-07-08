import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registry } from "@/lib/operations";
import { auditLog } from "@/lib/auditlog";
import { fail } from "@/lib/result";

export function registerMcpTools(server: McpServer) {
  for (const op of registry) {
    const zodShape = op.inputSchema as Record<string, z.ZodTypeAny>;

    server.registerTool(
      op.name,
      {
        title: op.title,
        description: op.description,
        inputSchema: zodShape,
      },
      // extra is RequestHandlerExtra; authInfo.extra.userId is set by withMcpAuth
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (input: Record<string, unknown>, extra: any) => {
        const userId: string | undefined = extra?.authInfo?.extra?.userId;
        if (!userId) {
          const err = fail("UNAUTHENTICATED", "A valid user token is required.");
          auditLog.record(op.name, input, false, "agent");
          return {
            content: [{ type: "text" as const, text: JSON.stringify(err, null, 2) }],
            isError: true,
          };
        }

        try {
          const result = await op.handler(input, { userId });
          auditLog.record(op.name, input, result.success, "agent");
          if (result.success) {
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result.data, null, 2) }],
            };
          } else {
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result.error, null, 2) }],
              isError: true,
            };
          }
        } catch (err) {
          auditLog.record(op.name, input, false, "agent");
          return {
            content: [{ type: "text" as const, text: String(err) }],
            isError: true,
          };
        }
      }
    );
  }
}

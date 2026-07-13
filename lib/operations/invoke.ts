import { z } from "zod";
import { defineOperation } from "./types";
import { ok, fail } from "@/lib/result";
import { roleSatisfies } from "@/lib/auth";
import { auditLog } from "@/lib/auditlog";
import { registry } from "./registry";

// Lazy map — built on first call to avoid circular-import issues at module load time
let _opByName: Map<string, (typeof registry)[number]> | undefined;
function getOpByName() {
  if (!_opByName) _opByName = new Map(registry.map((op) => [op.name, op]));
  return _opByName;
}

function effectiveParallelSafe(op: (typeof registry)[number], override?: boolean): boolean {
  if (override !== undefined) return override;
  if (op.parallelSafe !== undefined) return op.parallelSafe;
  return op.permission === "read";
}

async function runOne(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string; role: any; token: string }
): Promise<unknown> {
  const op = getOpByName().get(name);
  if (!op) {
    auditLog.record(name, args, false, "agent");
    return fail("UNKNOWN_TOOL", `No operation named '${name}'.`);
  }
  if (!roleSatisfies(ctx.role, op.roles)) {
    auditLog.record(name, args, false, "agent");
    return fail("FORBIDDEN", `Role '${ctx.role}' is not permitted to call '${name}'.`);
  }
  // Validate args against the op's Zod schema
  const parsed = z.object(op.inputSchema as Record<string, z.ZodTypeAny>).safeParse(args);
  if (!parsed.success) {
    auditLog.record(name, args, false, "agent");
    return fail("INVALID_ARGS", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  try {
    const result = await op.handler(parsed.data, { userId: ctx.userId, role: ctx.role, token: ctx.token });
    auditLog.record(name, args, result.success, "agent");
    return result;
  } catch (err) {
    auditLog.record(name, args, false, "agent");
    return fail("HANDLER_ERROR", String(err));
  }
}

const CallSchema = z.object({
  name: z.string().describe("Operation name"),
  args: z.record(z.unknown()).default({}).describe("Arguments for the operation"),
  parallelSafe: z.boolean().optional().describe("Override parallel-safety for this call"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const invoke = defineOperation<any, any>({
  name: "invoke",
  title: "Invoke",
  description:
    "Call a function once without loading it into the tool list (stateless, Path B). " +
    "For a single call pass { name, args }. " +
    "For a batch pass { calls: [{name, args}] } — read operations run in parallel, " +
    "write operations run sequentially in submission order.",
  permission: "read",
  roles: ["customer", "support", "admin"],
  alwaysOn: true,
  inputSchema: {
    name: z.string().optional().describe("Function name (single-call form)"),
    args: z.record(z.unknown()).optional().describe("Arguments (single-call form)"),
    calls: z
      .array(CallSchema)
      .optional()
      .describe("Batch calls (use this or name+args, not both)"),
  },
  async handler({ name, args, calls }, ctx) {
    // Single-call form
    if (name !== undefined) {
      const result = await runOne(name, (args ?? {}) as Record<string, unknown>, ctx);
      return ok(result);
    }

    // Batch form
    if (calls && calls.length > 0) {
      const results: unknown[] = new Array(calls.length);

      // Partition into parallel-safe and sequential (preserving original indices)
      const parallelIndices: number[] = [];
      const sequentialIndices: number[] = [];

      for (let i = 0; i < calls.length; i++) {
        const c = calls[i];
        const op = getOpByName().get(c.name);
        const safe = op ? effectiveParallelSafe(op as any, c.parallelSafe) : false;
        if (safe) {
          parallelIndices.push(i);
        } else {
          sequentialIndices.push(i);
        }
      }

      // Run parallel-safe calls concurrently
      await Promise.all(
        parallelIndices.map(async (i) => {
          const c = calls[i];
          results[i] = await runOne(c.name, (c.args ?? {}) as Record<string, unknown>, ctx);
        })
      );

      // Run sequential calls in order
      for (const i of sequentialIndices) {
        const c = calls[i];
        results[i] = await runOne(c.name, (c.args ?? {}) as Record<string, unknown>, ctx);
      }

      return ok({ results });
    }

    return fail("INVALID_ARGS", "Provide either 'name' (single call) or 'calls' (batch).");
  },
});

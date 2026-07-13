import type { Operation } from "@/lib/operations/types";
import type { Role } from "@/lib/auth";
import { roleSatisfies } from "@/lib/auth";

/** DJB2 hash over a string → 8-char hex. Stable across calls for the same input. */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h >>>= 0; // keep 32-bit unsigned
  }
  return h.toString(16).padStart(8, "0");
}

/** Stable canonical string for an operation (name + permission + sorted roles + sorted inputSchema keys). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function opFingerprint(op: Operation<any, any>): string {
  const schemaKeys = Object.keys(op.inputSchema).sort().join(",");
  const roles = [...op.roles].sort().join(",");
  return `${op.name}|${op.permission}|${roles}|${schemaKeys}|${op.module ?? ""}|${op.parallelSafe ?? ""}`;
}

/** Compute a short version hash from a list of operations (sorted by name for stability). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function computeVersion(ops: Operation<any, any>[]): string {
  const sorted = [...ops].sort((a, b) => a.name.localeCompare(b.name));
  const fingerprint = sorted.map(opFingerprint).join(";");
  return djb2(fingerprint);
}

/** Operations visible to a given role. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function visibleOps(role: Role, registry: Operation<any, any>[]): Operation<any, any>[] {
  return registry.filter((op) => roleSatisfies(role, op.roles));
}

/** The manifest an agent receives from getCapabilities. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function capabilityManifest(role: Role, registry: Operation<any, any>[]) {
  const ops = visibleOps(role, registry);
  return {
    version: computeVersion(ops),
    count: ops.length,
    tools: ops.map((op) => ({
      name: op.name,
      title: op.title,
      permission: op.permission,
      roles: op.roles,
      requiresConfirmation: op.requiresConfirmation ?? false,
    })),
  };
}

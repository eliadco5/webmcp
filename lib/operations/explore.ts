import { z } from "zod";
import { defineOperation } from "./types";
import { ok, fail } from "@/lib/result";
import { getNode, expandWildcard, platformManifest } from "@/lib/modules";
import { registry } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const explore = defineOperation<any, any>({
  name: "explore",
  title: "Explore",
  description:
    "Navigate the platform's module tree. " +
    "Call with no path to get the platform overview and top-level modules. " +
    "Pass a dot-path (e.g. 'reservation.booking') to see its sub-modules and functions. " +
    "Pass a wildcard (e.g. 'reservation.*') to expand all descendants. " +
    "Pass '*' to get the entire tree. " +
    "Pass an array of paths to fetch multiple nodes in one call.",
  permission: "read",
  roles: ["customer", "support", "admin"],
  alwaysOn: true,
  inputSchema: {
    path: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        "Module path(s) to explore. Omit for platform overview. " +
        "Supports dot-paths, 'x.*' wildcards, '*' for everything, or an array of paths."
      ),
  },
  async handler({ path }, ctx) {
    const role = ctx.role;

    // No path → platform manifest
    if (path === undefined || path === null) {
      return ok(platformManifest(role, registry));
    }

    // Single wildcard path
    if (typeof path === "string" && (path === "*" || path.endsWith(".*"))) {
      return ok({ nodes: expandWildcard(path, role, registry) });
    }

    // Single exact path
    if (typeof path === "string") {
      const node = getNode(path, role, registry);
      if (!node) return fail("NOT_FOUND", `Module '${path}' not found.`);
      return ok(node);
    }

    // Array of paths
    const results = path.map((p: string) => {
      if (p === "*" || p.endsWith(".*")) {
        return { path: p, nodes: expandWildcard(p, role, registry) };
      }
      const node = getNode(p, role, registry);
      if (!node) return { path: p, error: `Module '${p}' not found.` };
      return node;
    });
    return ok({ results });
  },
});

import type { Role } from "@/lib/auth";
import { roleSatisfies } from "@/lib/auth";
import type { Operation } from "@/lib/operations/types";

export interface ModuleNode {
  path: string;
  title: string;
  description: string;
}

export interface FnSummary {
  name: string;
  title: string;
  description: string;
  permission: "read" | "write";
  parallelSafe: boolean;
  requiresConfirmation?: boolean;
}

export interface ExploreNode {
  path: string;
  title: string;
  description: string;
  submodules: ModuleNode[];
  functions: FnSummary[];
}

export interface PlatformManifest {
  app: string;
  description: string;
  modules: ModuleNode[];
}

// Flat module registry — add new modules here as the platform grows.
// Parent/child relationships are inferred from dot-path prefixes.
const MODULE_DEFS: ModuleNode[] = [
  {
    path: "reservation",
    title: "Reservation",
    description: "Create and manage table reservations, search availability, and handle cancellations.",
  },
  {
    path: "reservation.availability",
    title: "Availability",
    description: "Search for open time slots by date and party size.",
  },
  {
    path: "reservation.booking",
    title: "Booking",
    description: "Create and cancel reservations. Write operations — confirmation required for destructive actions.",
  },
  {
    path: "reservation.search",
    title: "Search",
    description: "Look up existing reservations by ID or list all reservations for the current user.",
  },
  {
    path: "reservation.admin",
    title: "Admin",
    description: "Cross-user reservation management. Available to support and admin roles only.",
  },
];

const APP_INFO = {
  app: "AgentBridge Booking",
  description:
    "A booking platform for managing reservations. " +
    "Navigate the module tree with explore() to discover available functions before invoking them.",
};

// Build a map for O(1) path lookup
const moduleByPath = new Map<string, ModuleNode>(
  MODULE_DEFS.map((m) => [m.path, m])
);

function effectiveParallelSafe(op: Operation<any, any>): boolean {
  if (op.parallelSafe !== undefined) return op.parallelSafe;
  return op.permission === "read";
}

function fnSummary(op: Operation<any, any>): FnSummary {
  return {
    name: op.name,
    title: op.title,
    description: op.description,
    permission: op.permission,
    parallelSafe: effectiveParallelSafe(op),
    requiresConfirmation: op.requiresConfirmation,
  };
}

function isChildOf(childPath: string, parentPath: string): boolean {
  return childPath === parentPath || childPath.startsWith(parentPath + ".");
}

function directChildrenOf(parentPath: string): ModuleNode[] {
  return MODULE_DEFS.filter((m) => {
    if (m.path === parentPath) return false;
    if (!isChildOf(m.path, parentPath)) return false;
    // direct child: no additional dot after the parent prefix
    const rest = m.path.slice(parentPath.length + 1);
    return !rest.includes(".");
  });
}

function topLevelModules(): ModuleNode[] {
  return MODULE_DEFS.filter((m) => !m.path.includes("."));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fnsForModule(path: string, role: Role, registry: Operation<any, any>[]): FnSummary[] {
  return registry
    .filter((op) => op.module === path && !op.alwaysOn && roleSatisfies(role, op.roles))
    .map(fnSummary);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getNode(path: string, role: Role, registry: Operation<any, any>[]): ExploreNode | null {
  const mod = moduleByPath.get(path);
  if (!mod) return null;
  return {
    path: mod.path,
    title: mod.title,
    description: mod.description,
    submodules: directChildrenOf(path),
    functions: fnsForModule(path, role, registry),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expandWildcard(pattern: string, role: Role, registry: Operation<any, any>[]): ExploreNode[] {
  let base: string;
  if (pattern === "*") {
    // entire tree
    return MODULE_DEFS.map((m) => ({
      path: m.path,
      title: m.title,
      description: m.description,
      submodules: directChildrenOf(m.path),
      functions: fnsForModule(m.path, role, registry),
    }));
  }
  // "x.*" — all descendants of x (not x itself)
  base = pattern.slice(0, -2); // strip ".*"
  return MODULE_DEFS
    .filter((m) => m.path !== base && isChildOf(m.path, base))
    .map((m) => ({
      path: m.path,
      title: m.title,
      description: m.description,
      submodules: directChildrenOf(m.path),
      functions: fnsForModule(m.path, role, registry),
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function platformManifest(role: Role, registry: Operation<any, any>[]): PlatformManifest & { modules: ModuleNode[] } {
  // Filter top-level modules to those that have at least one visible function anywhere in subtree
  const visible = topLevelModules().filter((m) =>
    registry.some(
      (op) => op.module && isChildOf(op.module, m.path) && !op.alwaysOn && roleSatisfies(role, op.roles)
    )
  );
  return { ...APP_INFO, modules: visible };
}

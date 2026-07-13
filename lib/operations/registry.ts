// Separate file so navigation ops can import the registry without a circular dep.
// index.ts re-exports everything from here.

import type { Operation } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Operation<any, any>[] = [];

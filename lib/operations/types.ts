import { z } from "zod";
import type { Result } from "@/lib/result";
import type { Role } from "@/lib/auth";

export type { Role };
export type Permission = "read" | "write";

export interface OperationContext {
  userId: string;
  role: Role;
  token: string;
}

export interface Operation<
  TShape extends z.ZodRawShape = z.ZodRawShape,
  TOut = unknown,
> {
  name: string;
  title: string;
  description: string;
  inputSchema: TShape;
  permission: Permission;
  roles: Role[];                  // which roles may call this operation
  requiresConfirmation?: boolean;
  tags?: string[];
  module?: string;                // dot-path of owning leaf module (e.g. "reservation.booking")
  parallelSafe?: boolean;         // defaults: read=true, write=false
  alwaysOn?: boolean;             // always registered regardless of loaded-tools selection
  handler: (input: z.infer<z.ZodObject<TShape>>, ctx: OperationContext) => Promise<Result<TOut>>;
}

export function defineOperation<
  TShape extends z.ZodRawShape,
  TOut,
>(op: Operation<TShape, TOut>): Operation<TShape, TOut> {
  return op;
}

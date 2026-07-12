import { z } from "zod";
import type { Result } from "@/lib/result";
import type { Role } from "@/lib/auth";

export type { Role };
export type Permission = "read" | "write";

export interface OperationContext {
  userId: string;
  role: Role;
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
  handler: (input: z.infer<z.ZodObject<TShape>>, ctx: OperationContext) => Promise<Result<TOut>>;
}

export function defineOperation<
  TShape extends z.ZodRawShape,
  TOut,
>(op: Operation<TShape, TOut>): Operation<TShape, TOut> {
  return op;
}

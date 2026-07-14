export type Role = "customer" | "support" | "admin";

export const adminCtx = {
  userId: "u_bob",
  role: "admin" as const,
  token: "tok_admin",
};

export const supportCtx = {
  userId: "u_carol",
  role: "support" as const,
  token: "tok_support",
};

export const customerCtx = {
  userId: "u_alice",
  role: "customer" as const,
  token: "tok_customer",
};

import { defineOperation } from "./types";
import { store } from "@/lib/store";
import { ok } from "@/lib/result";

export const listAllReservations = defineOperation({
  name: "listAllReservations",
  title: "List All Reservations",
  description: "Return all reservations across all users. Available to support and admin roles only.",
  permission: "read",
  roles: ["support", "admin"],
  module: "reservation.admin",
  tags: ["booking", "reservation", "admin"],
  inputSchema: {},
  async handler(_input, _ctx) {
    const reservations = store.getAllReservations();
    return ok({ reservations, count: reservations.length });
  },
});

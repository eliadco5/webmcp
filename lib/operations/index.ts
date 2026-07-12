import { searchAvailability } from "./searchAvailability";
import { createReservation } from "./createReservation";
import { cancelReservation } from "./cancelReservation";
import { listReservations } from "./listReservations";
import { getReservation } from "./getReservation";
import { getContext } from "./getContext";
import { listAllReservations } from "./listAllReservations";
import { cancelAnyReservation } from "./cancelAnyReservation";
import { getCapabilities } from "./getCapabilities";
import type { Operation } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const registry: Operation<any, any>[] = [
  searchAvailability,
  createReservation,
  cancelReservation,
  listReservations,
  getReservation,
  getContext,
  listAllReservations,
  cancelAnyReservation,
  getCapabilities,
];

export {
  searchAvailability, createReservation, cancelReservation,
  listReservations, getReservation, getContext,
  listAllReservations, cancelAnyReservation, getCapabilities,
};
export type { Operation } from "./types";

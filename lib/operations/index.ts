import { registry } from "./registry";
import { searchAvailability } from "./searchAvailability";
import { createReservation } from "./createReservation";
import { cancelReservation } from "./cancelReservation";
import { listReservations } from "./listReservations";
import { getReservation } from "./getReservation";
import { getContext } from "./getContext";
import { listAllReservations } from "./listAllReservations";
import { cancelAnyReservation } from "./cancelAnyReservation";
import { getCapabilities } from "./getCapabilities";
import { explore } from "./explore";
import { describeTool } from "./describeTool";
import { invoke } from "./invoke";
import { loadTools } from "./loadTools";
import { unloadTools } from "./unloadTools";

// Populate the shared registry array in place so all importers see the same contents.
// Order: always-on navigation/meta tools first, then business ops.
registry.push(
  explore,
  describeTool,
  invoke,
  loadTools,
  unloadTools,
  getContext,
  getCapabilities,
  searchAvailability,
  createReservation,
  cancelReservation,
  listReservations,
  getReservation,
  listAllReservations,
  cancelAnyReservation,
);

export { registry };
export {
  searchAvailability, createReservation, cancelReservation,
  listReservations, getReservation, getContext,
  listAllReservations, cancelAnyReservation, getCapabilities,
  explore, describeTool, invoke, loadTools, unloadTools,
};
export type { Operation } from "./types";

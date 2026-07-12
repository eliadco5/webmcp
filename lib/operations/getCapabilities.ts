import { defineOperation } from "./types";
import { ok } from "@/lib/result";
import { registry } from "@/lib/operations/index";
import { capabilityManifest } from "@/lib/capabilities";

export const getCapabilities = defineOperation({
  name: "getCapabilities",
  title: "Get Capabilities",
  description:
    "Return the list of tools available to the caller's role along with a version hash. " +
    "An agent can compare the version to its cached value to detect when capabilities have changed.",
  permission: "read",
  roles: ["customer", "support", "admin"],
  tags: ["meta"],
  inputSchema: {},
  async handler(_input, ctx) {
    return ok(capabilityManifest(ctx.role, registry));
  },
});

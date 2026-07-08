import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { registerMcpTools } from "@/lib/adapters/mcp";
import { userForToken } from "@/lib/auth";

const baseHandler = createMcpHandler(
  (server) => {
    registerMcpTools(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

async function verifyToken(_req: Request, bearer?: string): Promise<AuthInfo | undefined> {
  if (!bearer) return undefined;
  const user = userForToken(bearer);
  if (!user) return undefined;
  return {
    token: bearer,
    clientId: user.id,
    scopes: [],
    extra: { userId: user.id },
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };

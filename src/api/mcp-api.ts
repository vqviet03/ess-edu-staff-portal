import { api } from "./api";
import type { Envelope } from "@/types";
export interface McpConnection {
  id: string;
  createdAt: string;
  expiresAt: string;
  connected: boolean;
  roles: string[];
  scope: "ees.read";
}
export interface McpConsent {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  scope: string;
  state: string;
  roles: string[];
  approve: boolean;
}
export const mcpApi = api
  .enhanceEndpoints({ addTagTypes: ["McpConnections"] })
  .injectEndpoints({
    endpoints: (b) => ({
      mcpConnections: b.query<
        { enabled: boolean; items: McpConnection[] },
        void
      >({
        query: () => "/mcp/connections",
        transformResponse: (
          r: Envelope<{ enabled: boolean; items: McpConnection[] }>,
        ) => r.data,
        providesTags: ["McpConnections"],
      }),
      mcpConsent: b.mutation<{ redirectUrl: string }, McpConsent>({
        query: (body) => ({ url: "/mcp/consent", method: "POST", body }),
        transformResponse: (r: Envelope<{ redirectUrl: string }>) => r.data,
        invalidatesTags: ["McpConnections"],
      }),
      revokeMcp: b.mutation<unknown, string>({
        query: (id) => ({
          url: `/mcp/connections/${encodeURIComponent(id)}`,
          method: "DELETE",
        }),
        invalidatesTags: ["McpConnections"],
      }),
    }),
  });
export const {
  useMcpConnectionsQuery,
  useMcpConsentMutation,
  useRevokeMcpMutation,
} = mcpApi;

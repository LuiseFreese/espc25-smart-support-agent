import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

/**
 * Creates a Microsoft Graph client with app-only authentication.
 *
 * Uses a simplified auth provider pattern to avoid TokenCredentialAuthenticationProvider
 * version drift issues. Works with GraphService and other services.
 *
 * Requires environment variables:
 * - GRAPH_TENANT_ID
 * - GRAPH_CLIENT_ID
 * - GRAPH_CLIENT_SECRET
 */
export function createGraphClient(): Client {
  const tenantId = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Missing required Graph API credentials in environment variables');
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  const authProvider = {
    getAccessToken: async () => {
      const token = await credential.getToken('https://graph.microsoft.com/.default');
      if (!token?.token) {
        throw new Error('Failed to acquire Graph token');
      }
      return token.token;
    }
  };

  return Client.initWithMiddleware({ authProvider });
}

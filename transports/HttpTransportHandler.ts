import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "http";

export interface HttpTransportConfig {
  port?: number;
  host?: string;
}

export class HttpTransportHandler {
  constructor(private server: Server, private config: HttpTransportConfig = {}) {}

  async connect(): Promise<void> {
    const port = this.config.port ?? parseInt(process.env.PORT || '3000', 10);
    const host = this.config.host ?? '0.0.0.0';

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    await this.server.connect(transport);

    const httpServer = http.createServer(async (req, res) => {
        console.log(`Received request: ${req.method} ${req.url}`);
        
        // Capture original end method to log response
        const originalEnd = res.end;
        res.end = function(chunk?: any, encoding?: any, cb?: any) {
            console.log(`Response: ${req.method} ${req.url} - Status: ${res.statusCode}`);
            return originalEnd.call(this, chunk, encoding, cb);
        };

        // Slack does not have a metadata endpoint to discover OAuth2 URLs.
        // So creating a proxy endpoint for the Slack OAuth2 URLs.
        // This is used by the Keyring to discover the OAuth2 URLs.
        if (req.method === 'GET' && req.url === '/.well-known/openid-configuration') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                "issuer": "https://slack.com",
                "authorization_endpoint": "https://slack.com/oauth/v2/authorize?user_scope=channels:history,channels:read,users:read,chat:write,reactions:write&",
                "token_endpoint": "https://slack.com/api/oauth.v2.access",
                "scopes_supported": [
                  "channels:read",
                  "channels:write",
                  "chat:write",
                  "users:read",
                  "users:read.email",
                  "commands",
                  "incoming-webhook"
                ],
                "response_types_supported": [
                  "code"
                ],
                "grant_types_supported": [
                  "authorization_code"
                ],
                "token_endpoint_auth_methods_supported": [
                  "client_secret_post"
                ],
                "revocation_endpoint": "https://slack.com/api/auth.revoke",
                "userinfo_endpoint": "https://slack.com/api/users.identity"
              }
              ));
            return;
        }
        
        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'healthy',
                server: 'slack-mcp',
                version: '0.0.1',
                timestamp: new Date().toISOString()
            }));
            return;
        }

        try {
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error(error);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                    }
                }));
            }
        }
    });

    httpServer.listen(port, host, () => {
        console.log(`Slack MCP Server listening on http://${host}:${port}/mcp`);
    });
  }
} 
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export class StdioTransportHandler {
  constructor(private server: Server) {}

  async connect(): Promise<void> {
    await this.server.connect(new StdioServerTransport());
    console.error("Slack MCP Server running on stdio");
  }
}

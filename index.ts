#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SlackClient } from "./SlackClient.ts";
import { type HttpTransportConfig, HttpTransportHandler } from "./transports/HttpTransportHandler.ts";
import { StdioTransportHandler } from "./transports/StdioTransportHandler.ts";
import { tools } from "./Tools.ts";
import { type ListChannelsArgs, type PostMessageArgs, type ReplyToThreadArgs, type AddReactionArgs, type GetChannelHistoryArgs, type GetThreadRepliesArgs, type GetUsersArgs, type GetUserProfileArgs } from "./types.ts";

let TRANSPORT: 'stdio' | 'http' = 'stdio';
const transportArgIndex = process.argv.findIndex(arg => arg === '--transport');
if (transportArgIndex !== -1 && process.argv[transportArgIndex + 1]) {
  const value = process.argv[transportArgIndex + 1];
  if (value === 'http' || value === 'stdio') {
    TRANSPORT = value;
  } else {
    console.warn(`Unknown transport '${value}', defaulting to stdio.`);
  }
}

// Parse port argument for HTTP transport
let HTTP_PORT: number | undefined;
const portArgIndex = process.argv.findIndex(arg => arg === '--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  const portValue = parseInt(process.argv[portArgIndex + 1], 10);
  if (!isNaN(portValue) && portValue > 0 && portValue <= 65535) {
    HTTP_PORT = portValue;
  } else {
    console.warn(`Invalid port '${process.argv[portArgIndex + 1]}', using default port 3000.`);
  }
}

async function main() {
  console.error("Starting Slack MCP Server...");
  const server = new Server(
    {
      name: "Slack MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  let token: string | undefined;

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request, context) => {
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        const authToken = token ?? extractAuthToken(context?.requestInfo?.headers?.authorization);
        if (!authToken) {
          throw new Error("No auth token provided. Please set SLACK_TOKEN (or SLACK_BOT_TOKEN) environment variable or provide an auth token in the request headers.");
        }

        const slackClient = new SlackClient(authToken);

        switch (request.params.name) {
          case "slack_list_channels": {
            const args = request.params
              .arguments as unknown as ListChannelsArgs;
            const response = await slackClient.getChannels(
              args.limit,
              args.cursor,
              args.types,
              args.exclude_archived,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_post_message": {
            const args = request.params.arguments as unknown as PostMessageArgs;
            if (!args.channel_id || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id and text",
              );
            }
            const response = await slackClient.postMessage(
              args.channel_id,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_reply_to_thread": {
            const args = request.params
              .arguments as unknown as ReplyToThreadArgs;
            if (!args.channel_id || !args.thread_ts || !args.text) {
              throw new Error(
                "Missing required arguments: channel_id, thread_ts, and text",
              );
            }
            const response = await slackClient.postReply(
              args.channel_id,
              args.thread_ts,
              args.text,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_add_reaction": {
            const args = request.params.arguments as unknown as AddReactionArgs;
            if (!args.channel_id || !args.timestamp || !args.reaction) {
              throw new Error(
                "Missing required arguments: channel_id, timestamp, and reaction",
              );
            }
            const response = await slackClient.addReaction(
              args.channel_id,
              args.timestamp,
              args.reaction,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_channel_history": {
            const args = request.params
              .arguments as unknown as GetChannelHistoryArgs;
            if (!args.channel_id) {
              throw new Error("Missing required argument: channel_id");
            }
            const response = await slackClient.getChannelHistory(
              args.channel_id,
              args.limit,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_thread_replies": {
            const args = request.params
              .arguments as unknown as GetThreadRepliesArgs;
            if (!args.channel_id || !args.thread_ts) {
              throw new Error(
                "Missing required arguments: channel_id and thread_ts",
              );
            }
            const response = await slackClient.getThreadReplies(
              args.channel_id,
              args.thread_ts,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_users": {
            const args = request.params.arguments as unknown as GetUsersArgs;
            const response = await slackClient.getUsers(
              args.limit,
              args.cursor,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "slack_get_user_profile": {
            const args = request.params
              .arguments as unknown as GetUserProfileArgs;
            if (!args.user_id) {
              throw new Error("Missing required argument: user_id");
            }
            const response = await slackClient.getUserProfile(args.user_id);
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return { tools };
  });

  if (TRANSPORT === 'http') {
    const httpConfig: HttpTransportConfig = {};
    if (HTTP_PORT !== undefined) {
      httpConfig.port = HTTP_PORT;
    }
    const httpHandler = new HttpTransportHandler(server, httpConfig);
    await httpHandler.connect();
  } else {
    token = process.env.SLACK_TOKEN || process.env.SLACK_BOT_TOKEN;

    if (!token) {
      console.error(
        "Please set SLACK_TOKEN (or SLACK_BOT_TOKEN) environment variable",
      );
      process.exit(1);
    }

    // Connect the server to stdio transport
    const stdioHandler = new StdioTransportHandler(server);
    await stdioHandler.connect();
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

function extractAuthToken(authHeader?: string[] | string | undefined): string | undefined {
  let authToken = undefined;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    authToken = authHeader.slice(7).trim();
  }
  return authToken;
}
import { type Tool } from '@modelcontextprotocol/sdk/types.js';

// Tool definitions
const listChannelsTool: Tool = {
  name: 'slack_list_channels',
  description: 'List public channels in the workspace with pagination',
  inputSchema: {
    type: 'object',
    properties: {
      types: {
        type: 'string',
        description:
          'Comma-separated list of channel types (public_channel, private_channel, mpim, im)',
        default: 'public_channel,private_channel',
      },
      exclude_archived: {
        type: 'boolean',
        description: 'Exclude archived channels',
        default: true,
      },
      limit: {
        type: 'number',
        description:
          'Maximum number of channels to return (default 100, max 200)',
        default: 100,
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for next page of results',
      },
      query: {
        type: 'string',
        description: 'Query to filter channels by name',
      },
    },
  },
};

const postMessageTool: Tool = {
  name: 'slack_post_message',
  description: 'Post a new message to a Slack channel',
  inputSchema: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel to post to',
      },
      text: {
        type: 'string',
        description: 'The message text to post',
      },
    },
    required: ['channel_id', 'text'],
  },
};

const replyToThreadTool: Tool = {
  name: 'slack_reply_to_thread',
  description: 'Reply to a specific message thread in Slack',
  inputSchema: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel containing the thread',
      },
      thread_ts: {
        type: 'string',
        description:
          "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
      text: {
        type: 'string',
        description: 'The reply text',
      },
    },
    required: ['channel_id', 'thread_ts', 'text'],
  },
};

const addReactionTool: Tool = {
  name: 'slack_add_reaction',
  description: 'Add a reaction emoji to a message',
  inputSchema: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel containing the message',
      },
      timestamp: {
        type: 'string',
        description: 'The timestamp of the message to react to',
      },
      reaction: {
        type: 'string',
        description: 'The name of the emoji reaction (without ::)',
      },
    },
    required: ['channel_id', 'timestamp', 'reaction'],
  },
};

const getChannelHistoryTool: Tool = {
  name: 'slack_get_channel_history',
  description: 'Get recent messages from a channel',
  inputSchema: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel',
      },
      limit: {
        type: 'number',
        description: 'Number of messages to retrieve (default 10)',
        default: 10,
      },
    },
    required: ['channel_id'],
  },
};

const getThreadRepliesTool: Tool = {
  name: 'slack_get_thread_replies',
  description: 'Get all replies in a message thread',
  inputSchema: {
    type: 'object',
    properties: {
      channel_id: {
        type: 'string',
        description: 'The ID of the channel containing the thread',
      },
      thread_ts: {
        type: 'string',
        description:
          "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it.",
      },
    },
    required: ['channel_id', 'thread_ts'],
  },
};

const getUsersTool: Tool = {
  name: 'slack_get_users',
  description:
    'Get a list of all users in the workspace with their basic profile information',
  inputSchema: {
    type: 'object',
    properties: {
      cursor: {
        type: 'string',
        description: 'Pagination cursor for next page of results',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of users to return (default 100, max 200)',
        default: 100,
      },
    },
  },
};

const getUserProfileTool: Tool = {
  name: 'slack_get_user_profile',
  description: 'Get detailed profile information for a specific user',
  inputSchema: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'The ID of the user',
      },
    },
    required: ['user_id'],
  },
};

const getUserByEmailTool: Tool = {
  name: 'slack_get_user_by_email',
  description: 'Find a user with an email address',
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        description: 'The email address of the user',
      },
    },
    required: ['email'],
  },
};

export const tools = [
  listChannelsTool,
  postMessageTool,
  replyToThreadTool,
  addReactionTool,
  getChannelHistoryTool,
  getThreadRepliesTool,
  getUsersTool,
  getUserProfileTool,
  getUserByEmailTool,
];

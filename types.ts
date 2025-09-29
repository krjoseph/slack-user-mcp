// Type definitions for tool arguments
export interface ListChannelsArgs {
  types?: string;
  exclude_archived?: boolean;
  limit?: number;
  cursor?: string;
  query?: string;
}

export interface PostMessageArgs {
  channel_id: string;
  text: string;
}

export interface ReplyToThreadArgs {
  channel_id: string;
  thread_ts: string;
  text: string;
}

export interface AddReactionArgs {
  channel_id: string;
  timestamp: string;
  reaction: string;
}

export interface GetChannelHistoryArgs {
  channel_id: string;
  limit?: number;
}

export interface GetThreadRepliesArgs {
  channel_id: string;
  thread_ts: string;
}

export interface GetUsersArgs {
  cursor?: string;
  limit?: number;
  query?: string;
}

export interface GetUserProfileArgs {
  user_id: string;
}

export interface GetUserByEmailArgs {
  email: string;
}

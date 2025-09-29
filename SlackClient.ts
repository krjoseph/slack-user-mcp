export class SlackClient {
  private headers: { Authorization: string; 'Content-Type': string };
  private isUserToken: boolean;

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    this.isUserToken = token.startsWith('xoxp-');
  }

  async getChannels(
    limit: number = 100,
    cursor?: string,
    types: string = 'public_channel,private_channel',
    exclude_archived: boolean = true,
    query?: string
  ): Promise<any[] | { channels: any[]; cursor?: string }> {
    const maxChannels = Math.min(limit, 200);
    const maxExecutionTime = 10 * 1000; // 10 seconds
    const filteredChannels = [];
    let nextCursor: string | undefined = cursor;

    const startTime = performance.now();

    do {
      const params = new URLSearchParams({
        types: types,
        exclude_archived: exclude_archived.toString(),
        limit: Math.min(limit, 200).toString(),
        ...(cursor && { cursor: nextCursor }),
      });

      const response = await fetch(
        `https://slack.com/api/conversations.list?${params}`,
        { headers: this.headers }
      );

      const responseData = await response.json();
      if (!responseData.ok && responseData.error === 'ratelimited') {
        break;
      }

      const {
        channels,
        response_metadata: { next_cursor },
      } = responseData;

      nextCursor = next_cursor;

      // If we find an exact match return it immediately
      const channel = (channels as any[]).find(
        (channel: any) =>
          channel.name_normalized.toLowerCase() === query?.toLowerCase()
      );
      if (channel) {
        return {
          channels: [
            {
              id: channel.id,
              name: channel.name,
              is_private: channel.is_private,
            },
          ],
        };
      }

      filteredChannels.push(
        ...channels
          .filter(
            (channel: any) =>
              !query ||
              channel.name_normalized
                ?.toLowerCase()
                .includes(query.toLowerCase())
          )
          .map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            is_private: channel.is_private,
          }))
      );
    } while (
      query &&
      query.length > 0 &&
      nextCursor &&
      filteredChannels.length < maxChannels &&
      performance.now() - startTime < maxExecutionTime
    );

    return {
      channels: filteredChannels,
      ...(nextCursor && { cursor: nextCursor }),
    };
  }

  async postMessage(channel_id: string, text: string): Promise<any> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        channel: channel_id,
        text: text,
        as_user: this.isUserToken,
      }),
    });

    return response.json();
  }

  async postReply(
    channel_id: string,
    thread_ts: string,
    text: string
  ): Promise<any> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        channel: channel_id,
        thread_ts: thread_ts,
        text: text,
        as_user: this.isUserToken,
      }),
    });

    return response.json();
  }

  async addReaction(
    channel_id: string,
    timestamp: string,
    reaction: string
  ): Promise<any> {
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        channel: channel_id,
        timestamp: timestamp,
        name: reaction,
      }),
    });

    return response.json();
  }

  async getChannelHistory(
    channel_id: string,
    limit: number = 10
  ): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      limit: limit.toString(),
    });

    const response = await fetch(
      `https://slack.com/api/conversations.history?${params}`,
      { headers: this.headers }
    );

    return response.json();
  }

  async getThreadReplies(channel_id: string, thread_ts: string): Promise<any> {
    const params = new URLSearchParams({
      channel: channel_id,
      ts: thread_ts,
    });

    const response = await fetch(
      `https://slack.com/api/conversations.replies?${params}`,
      { headers: this.headers }
    );

    return response.json();
  }

  async getUsers(limit: number = 100, cursor?: string): Promise<any> {
    const maxUsers = Math.min(limit, 200);
    let activeUsers: any[] = [];
    let nextCursor: string | undefined = cursor;

    while (true) {
      const params = new URLSearchParams({
        limit: maxUsers.toString(),
      });
      if (nextCursor) {
        params.append('cursor', nextCursor);
      }

      const response = await fetch(
        `https://slack.com/api/users.list?${params}`,
        {
          headers: this.headers,
        }
      );

      const {
        members: users,
        response_metadata: { next_cursor },
      } = await response.json();
      nextCursor = next_cursor;

      activeUsers.push(
        ...users
          .filter(
            (user: any) =>
              !user.deleted &&
              !user.is_bot &&
              !user.is_restricted &&
              !!user.profile.email
          )
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.profile.email,
            fullname: user.profile.real_name,
            title: user.profile.title,
          }))
      );

      // maxUsers is not strictly enforced, the activeUsers array may contain more
      // than maxUsers based on the users fetched in the last round.
      if (!nextCursor || activeUsers.length >= maxUsers) {
        break;
      }
    }
    return activeUsers;
  }

  async getUserProfile(user_id: string): Promise<any> {
    const params = new URLSearchParams({
      user: user_id,
      include_labels: 'true',
    });

    const response = await fetch(
      `https://slack.com/api/users.profile.get?${params}`,
      { headers: this.headers }
    );

    return response.json();
  }

  async getUserByEmail(email: string): Promise<any> {
    const params = new URLSearchParams({
      email: email,
    });

    const response = await fetch(
      `https://slack.com/api/users.lookupByEmail?${params}`,
      { headers: this.headers }
    );

    return response.json();
  }
}

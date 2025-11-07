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
    limit?: number,
    cursor?: string,
    types?: string,
    exclude_archived?: boolean,
    query?: string
  ): Promise<any[] | { channels: any[]; cursor?: string }> {
    const maxChannels = Math.min(limit ?? 100, 200);
    const maxExecutionTime = 20 * 1000; // 20 seconds
    const filteredChannels = [];
    let nextCursor: string | undefined = cursor;

    const startTime = performance.now();

    do {
      const params = new URLSearchParams({
        types: types ?? 'public_channel',
        exclude_archived: (exclude_archived ?? true).toString(),
        // Assuming most of the results will get filtered out by the query
        // so we fetch more than the limit to be safe
        limit: query ? '200' : maxChannels.toString(),
        ...(nextCursor && { cursor: nextCursor }),
      });
      console.log(`Fetching channels with params: ${params.toString()}`);

      const response = await fetch(
        `https://slack.com/api/conversations.list?${params}`,
        { headers: this.headers }
      );

      const responseData = this.handleTokenError(await response.json());

      if (!responseData.ok && responseData.error === 'ratelimited') {
        break;
      }

      const {
        channels,
        response_metadata: { next_cursor },
      } = responseData;
      console.log(
        `Fetched ${channels.length} channels in ${
          performance.now() - startTime
        }ms`
      );

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
      console.log(
        `Channel ${query} not found. Continuing with partial search...`
      );

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
      console.log(`Found ${filteredChannels.length} channels after filtering.`);
      console.log(`Total execution time: ${performance.now() - startTime}ms`);
    } while (
      nextCursor &&
      filteredChannels.length < maxChannels &&
      performance.now() - startTime < maxExecutionTime
    );

    return {
      channels: filteredChannels,
      ...(nextCursor && { cursor: nextCursor }),
    };
  }

  async postMessage(
    text: string,
    channel_name?: string,
    channel_id?: string
  ): Promise<any> {
    if ((channel_name && channel_id) || (!channel_name && !channel_id)) {
      throw new Error(
        "Provide one of 'channel_name' or 'channel_id', not both."
      );
    }

    let channelId = channel_id;

    if (channel_name) {
      let channels = (
        (await this.getChannels(
          200,
          undefined,
          'public_channel',
          true,
          channel_name
        )) as any
      )?.channels;
      console.log(
        `Found ${channels?.length} public channels for name '${channel_name}'.`
      );
      console.log(channels);

      if (!channels?.length) {
        console.log(
          `No public channels found for name '${channel_name}'. Searching private channels...`
        );
        channels = (
          (await this.getChannels(
            200,
            undefined,
            'private_channel',
            true,
            channel_name
          )) as any
        )?.channels;
      }

      if (!channels?.length) {
        throw new Error(
          `Channel '${channel_name}' not found. Verify channel name using slack_list_channels tool.`
        );
      }

      channelId = channels.find(
        (_: { name: string }) => _?.name === channel_name
      )?.id;
      if (!channelId) {
        throw new Error(
          `Channel '${channel_name}' not found. Verify channel name using slack_list_channels tool.`
        );
      }
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        channel: channelId,
        text: text,
        as_user: this.isUserToken,
      }),
    });

    return this.handleTokenError(await response.json());
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

    return this.handleTokenError(await response.json());
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

    return this.handleTokenError(await response.json());
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

    return this.handleTokenError(await response.json());
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

    return this.handleTokenError(await response.json());
  }

  async getUsers(
    limit: number = 50,
    cursor?: string,
    query?: string
  ): Promise<any> {
    const maxUsers = Math.min(limit, 200);
    let activeUsers: any[] = [];
    let nextCursor: string | undefined = cursor;

    const startTime = performance.now();
    const maxExecutionTime = 10 * 1000; // 10 seconds

    do {
      const params = new URLSearchParams({
        limit: maxUsers.toString(),
        ...(nextCursor && { cursor: nextCursor }),
      });

      const response = await fetch(
        `https://slack.com/api/users.list?${params}`,
        {
          headers: this.headers,
        }
      );
      const responseData = this.handleTokenError(await response.json());
      if (!responseData.ok && responseData.error === 'ratelimited') {
        break;
      }

      if ((responseData as any).error === 'token_revoked') {
        return {
          isError: true,
          error_message:
            'Your token has been revoked. Please relogin to Slack MCP integration.',
        };
      }

      const {
        members: users,
        response_metadata: { next_cursor },
      } = responseData;
      nextCursor = next_cursor;

      activeUsers.push(
        ...users
          .filter(
            (user: any) =>
              !user.deleted &&
              !user.is_bot &&
              !user.is_restricted &&
              !!user.profile.email &&
              (!query ||
                user.profile.real_name
                  ?.toLowerCase()
                  .includes(query.toLowerCase()) ||
                user.profile.email?.toLowerCase().includes(query.toLowerCase()))
          )
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.profile.email,
            fullname: user.profile.real_name,
            title: user.profile.title,
          }))
      );
    } while (
      nextCursor &&
      activeUsers.length < maxUsers &&
      performance.now() - startTime < maxExecutionTime
    );

    return {
      users: activeUsers,
      ...(nextCursor && { cursor: nextCursor }),
    };
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

    return this.handleTokenError(await response.json());
  }

  async getUserByEmail(email: string): Promise<any> {
    const params = new URLSearchParams({
      email: email,
    });

    const response = await fetch(
      `https://slack.com/api/users.lookupByEmail?${params}`,
      { headers: this.headers }
    );

    return this.handleTokenError(await response.json());
  }

  private handleTokenError(responseData: any): any {
    if ((responseData as any).error === 'token_revoked') {
      throw new Error(
        'Your token has been revoked. Please relogin to Slack MCP integration.'
      );
    }
    return responseData;
  }
}

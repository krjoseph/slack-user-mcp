export class SlackClient {
    private headers: { Authorization: string; "Content-Type": string };
    private isUserToken: boolean;
  
    constructor(token: string) {
      this.headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      this.isUserToken = token.startsWith('xoxp-');
    }
  
    async getChannels(limit: number = 100, cursor?: string, types: string = "public_channel,private_channel", exclude_archived: boolean = true): Promise<any> {
      const params = new URLSearchParams({
        types: types,
        exclude_archived: exclude_archived.toString(),
        limit: Math.min(limit, 200).toString()
      });
  
      if (cursor) {
        params.append("cursor", cursor);
      }
  
      const response = await fetch(
        `https://slack.com/api/conversations.list?${params}`,
        { headers: this.headers },
      );
  
      return response.json();
    }
  
    async postMessage(channel_id: string, text: string): Promise<any> {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          channel: channel_id,
          text: text,
          as_user: this.isUserToken
        }),
      });
  
      return response.json();
    }
  
    async postReply(
      channel_id: string,
      thread_ts: string,
      text: string,
    ): Promise<any> {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({
          channel: channel_id,
          thread_ts: thread_ts,
          text: text,
          as_user: this.isUserToken
        }),
      });
  
      return response.json();
    }
  
    async addReaction(
      channel_id: string,
      timestamp: string,
      reaction: string,
    ): Promise<any> {
      const response = await fetch("https://slack.com/api/reactions.add", {
        method: "POST",
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
      limit: number = 10,
    ): Promise<any> {
      const params = new URLSearchParams({
        channel: channel_id,
        limit: limit.toString(),
      });
  
      const response = await fetch(
        `https://slack.com/api/conversations.history?${params}`,
        { headers: this.headers },
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
        { headers: this.headers },
      );
  
      return response.json();
    }
  
    async getUsers(limit: number = 100, cursor?: string): Promise<any> {
      const params = new URLSearchParams({
        limit: Math.min(limit, 200).toString()
      });
  
      if (cursor) {
        params.append("cursor", cursor);
      }
  
      const response = await fetch(`https://slack.com/api/users.list?${params}`, {
        headers: this.headers,
      });
  
      return response.json();
    }
  
    async getUserProfile(user_id: string): Promise<any> {
      const params = new URLSearchParams({
        user: user_id,
        include_labels: "true",
      });
  
      const response = await fetch(
        `https://slack.com/api/users.profile.get?${params}`,
        { headers: this.headers },
      );
  
      return response.json();
    }

    async getUserByEmail(email: string): Promise<any> {
        const params = new URLSearchParams({
          email: email,
        });

        const response = await fetch(
          `https://slack.com/api/users.lookupByEmail?${params}`,
          { headers: this.headers },
        );

        return response.json();
      }
  }
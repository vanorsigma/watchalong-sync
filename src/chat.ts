import { StaticAuthProvider } from '@twurple/auth';
import { ChatClient } from '@twurple/chat';
import { TWITCH_CLIENT_ID } from './consts';
import { ApiClient } from '@twurple/api';

export type TwitchChatClientCallbacks = 'connect' | 'disconnect' | 'auth_failure';

export async function makeTwitchChatStreamerClient(token: string): Promise<TwitchChatClient> {
  const authProvider = new StaticAuthProvider(TWITCH_CLIENT_ID, token);
  const apiClient = new ApiClient({ authProvider });
  try {
    const currentUserId = (await authProvider.getAnyAccessToken()).userId;
    if (!currentUserId) {
      console.error('Cannot get current user ID from token');
      return new TwitchChatClient('', '');
    }
    const currentUser = await apiClient.users.getUserById(currentUserId);

    if (currentUser) {
      return new TwitchChatClient(currentUser.name, token);
    } else {
      console.log('Could not retrieve current user information. The token might be invalid or expired.');
      return new TwitchChatClient('', '');
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    return new TwitchChatClient('', '');
  }
}

export class TwitchChatClient {
  private channelName: string;
  private chatClient: ChatClient;
  private commandHandler: (message: string) => void;

  constructor(channelName: string, token?: string) {
    if (token !== undefined && token?.trim().length === 0) {
      throw new Error('Cannot create Twitch Chat Client');
    } else if (token) {
      const authProvider = new StaticAuthProvider(TWITCH_CLIENT_ID, token, ['chat:read', 'chat:edit']);
      this.chatClient = new ChatClient({
        channels: [channelName],
        authProvider,
      });
    } else {
      this.chatClient = new ChatClient({
        channels: [channelName]
      });
    }

    this.channelName = channelName;
    this.chatClient.onMessage(this.onMessage.bind(this));
    this.chatClient.connect();
  }

  addCallback(callback: TwitchChatClientCallbacks, fn: () => void) {
    switch (callback) {
      case 'connect':
        this.chatClient.onConnect(fn);
        return;
      case 'disconnect':
        this.chatClient.onDisconnect(fn);
        return;
      case 'auth_failure':
        this.chatClient.onAuthenticationFailure(fn);
        return;
    }
  }

  setCommandHandler(callback: (message: string) => void) {
    this.commandHandler = callback;
  }

  sendMessage(message: string) {
    this.chatClient.say(this.channelName, message);
  }

  private onMessage(channel: string, user: string, message: string) {
    if (user === channel) { // broacaster
      this.commandHandler(message);
    }
  }
}

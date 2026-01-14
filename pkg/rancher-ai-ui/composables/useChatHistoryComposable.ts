import { AGENT_NAMESPACE, CHAT_HISTORY_SERVICE_NAME } from '../product';
import { HistoryChat, HistoryChatMessage, Message } from '../types';
import { buildMessageFromHistoryMessage } from '../utils/format';

export function useChatHistoryComposable() {
  const servicePath = `/api/v1/namespaces/${ AGENT_NAMESPACE }/services/http:${ CHAT_HISTORY_SERVICE_NAME }:80/proxy`;

  async function fetchChats(): Promise<HistoryChat[]> {
    try {
      const data = await fetch(`${ servicePath }/chats`);

      const all = await data.json() as HistoryChat[];

      return all.filter((chat) => !!chat.name);
    } catch (error) {
      return [];
    }
  }

  async function fetchMessages(chatId: string): Promise<Message[]> {
    try {
      const data = await fetch(`${ servicePath }/chats/${ chatId }/messages`);

      const messages = await data.json() as HistoryChatMessage[];

      return messages.map(buildMessageFromHistoryMessage);
    } catch (error) {
      return [];
    }
  }

  async function deleteChat(chatId: string): Promise<void> {
    await fetch(`${ servicePath }/chats/${ chatId }`, { method: 'DELETE' });
  }

  return {
    fetchChats,
    fetchMessages,
    deleteChat,
  };
}

import api from './axios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (userId: string, messages: ChatMessage[]): Promise<string> => {
  const { data } = await api.post<{ reply: string }>(`/users/${userId}/ai/chat`, { messages });
  return data.reply;
};

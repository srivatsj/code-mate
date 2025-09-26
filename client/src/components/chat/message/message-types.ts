export interface Message {
  type: 'user' | 'ai' | 'error' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
}

export interface MessageItemProps {
  message: Message;
  index: number;
}
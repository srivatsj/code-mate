import { ToolArgs } from '@shared/websocket-types';

export interface Message {
  type: 'user' | 'ai' | 'error' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: ToolArgs;
}

export interface MessageItemProps {
  message: Message;
  index: number;
}
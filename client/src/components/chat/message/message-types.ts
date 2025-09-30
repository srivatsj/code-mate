import { Plan, ToolArgs } from '@shared/websocket-types';

export interface Message {
  type: 'user' | 'ai' | 'error' | 'tool' | 'plan';
  content: string;
  timestamp: number;
  toolName?: string;
  toolArgs?: ToolArgs;
  plan?: Plan; // For plan message type
}

export interface MessageItemProps {
  message: Message;
  index: number;
}
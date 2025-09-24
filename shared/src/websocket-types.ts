// shared/types.ts
export interface WSMessage<T = any> {
    id: string;
    type: 'user_input' | 'tool_call' | 'tool_result' | 'llm_response' | 'error';
    payload: T;
    timestamp: number;
  }
  
  export interface UserInputPayload {
    content: string;
  }
  
  export interface ToolCallPayload {
    name: string;
    args: Record<string, any>;
  }
  
  export interface ToolResultPayload {
    result?: any;
    error?: string;
  }
  
  export interface LLMResponsePayload {
    content: string;
  }
  
  export interface ErrorPayload {
    message: string;
    code?: string;
  }
  
  // Type-safe message creators
  export type UserInputMessage = WSMessage<UserInputPayload>;
  export type ToolCallMessage = WSMessage<ToolCallPayload>;
  export type ToolResultMessage = WSMessage<ToolResultPayload>;
  export type LLMResponseMessage = WSMessage<LLMResponsePayload>;
  export type ErrorMessage = WSMessage<ErrorPayload>;
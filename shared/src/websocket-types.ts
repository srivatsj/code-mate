// shared/types.ts
export interface WSMessage<T = unknown> {
    id: string;
    type: 'user_input' | 'tool_call' | 'tool_result' | 'llm_response' | 'error' | 'plan_data';
    payload: T;
    timestamp: number;
  }
  
  export interface UserInputPayload {
    content: string;
  }
  
  export interface ToolCallPayload {
    name: string;
    args: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    toolId: string;
  }

  export interface ToolResultPayload {
    result?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    error?: string;
    toolId: string;
  }
  
  export interface LLMResponsePayload {
    content: string;
  }
  
  export interface ErrorPayload {
    message: string;
    code?: string;
  }

  export enum TaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed'
  }

  export enum PlanStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed'
  }

  export interface TodoTask {
    id: string;
    description: string;
    status: TaskStatus;
  }

  export interface Plan {
    description?: string;
    tasks: TodoTask[];
    status: PlanStatus;
  }

  export interface PlanDataPayload {
    sessionId: string;
    plan: Plan;
  }

  // Type-safe message creators
  export type UserInputMessage = WSMessage<UserInputPayload>;
  export type ToolCallMessage = WSMessage<ToolCallPayload>;
  export type ToolResultMessage = WSMessage<ToolResultPayload>;
  export type LLMResponseMessage = WSMessage<LLMResponsePayload>;
  export type ErrorMessage = WSMessage<ErrorPayload>;
  export type PlanDataMessage = WSMessage<PlanDataPayload>;


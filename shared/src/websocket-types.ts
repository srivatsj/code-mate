import { z } from 'zod';

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
  

  // Zod schemas for tool validation (single source of truth)
  export const WriteFileSchema = z.object({
    path: z.string(),
    content: z.string()
  });

  export const ReadFileSchema = z.object({
    path: z.string()
  });

  export const BashSchema = z.object({
    command: z.string(),
    description: z.string().optional()
  });

  export const EditSchema = z.object({
    path: z.string(),
    old_string: z.string(),
    new_string: z.string()
  });

  export const GlobSchema = z.object({
    pattern: z.string(),
    cwd: z.string().optional()
  });

  export const GrepSchema = z.object({
    pattern: z.string(),
    path: z.string().optional(),
    case_insensitive: z.boolean().optional()
  });

  export const WebFetchSchema = z.object({
    url: z.string().url()
  });

  // TypeScript types derived from Zod schemas
  export type WriteFileArgs = z.infer<typeof WriteFileSchema>;
  export type ReadFileArgs = z.infer<typeof ReadFileSchema>;
  export type BashArgs = z.infer<typeof BashSchema>;
  export type EditArgs = z.infer<typeof EditSchema>;
  export type GlobArgs = z.infer<typeof GlobSchema>;
  export type GrepArgs = z.infer<typeof GrepSchema>;
  export type WebFetchArgs = z.infer<typeof WebFetchSchema>;

  // Union type for all tool arguments
  export type ToolArgs = WriteFileArgs | ReadFileArgs | BashArgs | EditArgs | GlobArgs | GrepArgs | WebFetchArgs | Record<string, unknown>;

  export interface ToolCallPayload {
    name: string;
    args: ToolArgs;
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
    id: string; // Unique plan identifier
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


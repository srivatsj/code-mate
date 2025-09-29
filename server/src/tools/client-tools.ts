import { BashSchema, ReadFileSchema, ToolArgs, ToolCallMessage, WriteFileSchema, WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

import { ToolCoordinator } from './tool-coordinator';

export class ClientTools {
  constructor(
    private sendToClient: (message: WSMessage) => void,
    private toolCoordinator: ToolCoordinator
  ) {}

  getClientToolProxies() {
    return {
      read_file: tool({
        description: 'Read file contents',
        inputSchema: ReadFileSchema,
        execute: async ({ path }: { path: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('read_file', { path }, toolId);
          const result = await this.toolCoordinator.createPending(toolId);
          return result;
        }
      }),

      write_file: tool({
        description: 'Write file contents',
        inputSchema: WriteFileSchema,
        execute: async ({ path, content }: { path: string; content: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('write_file', { path, content }, toolId);
          const result = await this.toolCoordinator.createPending(toolId);
          return result;
        }
      }),

      bash: tool({
        description: 'Execute bash command',
        inputSchema: BashSchema.extend({
          cwd: z.string().optional()
        }),
        execute: async ({ command, cwd }: { command: string; cwd?: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('bash', { command, cwd }, toolId);
          const result = await this.toolCoordinator.createPending(toolId);
          return result;
        }
      })
    };
  }

  private sendToolCall(name: string, args: ToolArgs, toolId: string): void {
    const message: ToolCallMessage = {
      id: crypto.randomUUID(),
      type: 'tool_call',
      payload: { name, args, toolId },
      timestamp: Date.now()
    };
    this.sendToClient(message);
  }
}
import { BashSchema, EditSchema, GlobSchema, GrepSchema, ReadFileSchema, ToolArgs, ToolCallMessage, WriteFileSchema, WSMessage } from '@shared/websocket-types';
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
      }),

      edit: tool({
        description: 'Edit file by replacing old_string with new_string. Requires file to be read first.',
        inputSchema: EditSchema,
        execute: async (args: { path: string; old_string: string; new_string: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('edit', args, toolId);
          const result = await this.toolCoordinator.createPending(toolId);
          return result;
        }
      }),

      glob: tool({
        description: 'List files matching a glob pattern',
        inputSchema: GlobSchema,
        execute: async ({ pattern, cwd }: { pattern: string; cwd?: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('glob', { pattern, cwd }, toolId);
          const result = await this.toolCoordinator.createPending(toolId);
          return result;
        }
      }),

      grep: tool({
        description: 'Search for pattern in files',
        inputSchema: GrepSchema,
        execute: async (args: { pattern: string; path?: string; case_insensitive?: boolean }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('grep', args, toolId);
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
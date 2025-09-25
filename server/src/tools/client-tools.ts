import { ToolCallMessage,WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

export class ClientTools {
  constructor(
    private sendToClient: (message: WSMessage) => void,
    private sessionId: string
  ) {}

  getClientToolProxies() {
    return {
      read_file: tool({
        description: 'Read file contents',
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path }: { path: string }) => {
          this.sendToolCall('read_file', { path });
          return { pending: true };
        }
      }),

      write_file: tool({
        description: 'Write file contents',
        inputSchema: z.object({
          path: z.string(),
          content: z.string()
        }),
        execute: async ({ path, content }: { path: string; content: string }) => {
          this.sendToolCall('write_file', { path, content });
          return { pending: true };
        }
      }),

      bash: tool({
        description: 'Execute bash command',
        inputSchema: z.object({
          command: z.string(),
          cwd: z.string().optional()
        }),
        execute: async ({ command, cwd }: { command: string; cwd?: string }) => {
          this.sendToolCall('bash', { command, cwd });
          return { pending: true };
        }
      })
    };
  }

  private sendToolCall(name: string, args: Record<string, any>): void {
    const message: ToolCallMessage = {
      id: crypto.randomUUID(),
      type: 'tool_call',
      payload: { name, args },
      timestamp: Date.now()
    };
    this.sendToClient(message);
  }
}
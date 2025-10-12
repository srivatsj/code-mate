import { BashSchema, EditSchema, GlobSchema, GrepSchema, ReadFileSchema, ToolArgs, ToolCallMessage, WebFetchSchema, WriteFileSchema, WSMessage } from '@shared/websocket-types';
import { tool } from 'ai';
import { z } from 'zod';

import logger from '../common/logger';
import { ToolCoordinator } from './tool-coordinator';

export class ClientTools {
  private mcpTools: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(
    private sendToClient: (message: WSMessage) => void,
    private toolCoordinator: ToolCoordinator
  ) {}

  registerMCPTools(toolDefinitions: Array<{ name: string; description: string; parameters: any }>): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.info('[ClientTools] Registering %d MCP tools', toolDefinitions.length);
    for (const def of toolDefinitions) {
      // Build description with parameter info
      let fullDescription = def.description;
      if (def.parameters?.properties) {
        const params = Object.entries(def.parameters.properties).map(([name, prop]: [string, any]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const required = def.parameters.required?.includes(name) ? 'required' : 'optional';
          return `${name} (${prop.type}, ${required}): ${prop.description || ''}`;
        }).join(', ');
        fullDescription += ` Parameters: ${params}`;
      }

      this.mcpTools[def.name] = tool({
        description: fullDescription,
        inputSchema: z.any(),
        execute: async (args: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const toolId = crypto.randomUUID();
          this.sendToolCall(def.name, args, toolId);
          return await this.toolCoordinator.createPending(toolId);
        }
      });
      logger.info('[ClientTools] Registered MCP tool: %s - %s', def.name, fullDescription);
    }
    logger.info('[ClientTools] Total tools available: %d', Object.keys(this.getClientToolProxies()).length);
  }

  getClientToolProxies() {
    return {
      ...this.mcpTools,
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
      }),

      web_fetch: tool({
        description: 'Fetch content from a URL',
        inputSchema: WebFetchSchema,
        execute: async ({ url }: { url: string }) => {
          const toolId = crypto.randomUUID();
          this.sendToolCall('web_fetch', { url }, toolId);
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
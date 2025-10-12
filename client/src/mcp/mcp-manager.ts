import { experimental_createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';

import logger from '../common/logger';
import { loadMCPConfig } from './config-loader';
import { MCPServerConfig } from './types';

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export class MCPManager {
  private clients = new Map<string, Awaited<ReturnType<typeof experimental_createMCPClient>>>();
  private toolDefinitions: MCPToolDefinition[] = [];

  async initialize(): Promise<void> {
    const config = await loadMCPConfig();
    if (!config) {
      logger.info('[MCPManager] No MCP config found');
      return;
    }

    logger.info('[MCPManager] Initializing with %d MCP servers', Object.keys(config.mcpServers).length);
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      await this.connectServer(serverName, serverConfig);
    }
    logger.info('[MCPManager] Initialized with %d tools total', this.toolDefinitions.length);
  }

  private async connectServer(serverName: string, config: MCPServerConfig): Promise<void> {
    try {
      logger.info('[MCPManager] Connecting to MCP server: %s', serverName);
      const transport = new Experimental_StdioMCPTransport({
        command: config.command,
        args: config.args,
        env: config.env,
        stderr: 'ignore'
      });

      const client = await experimental_createMCPClient({ name: serverName, transport });
      this.clients.set(serverName, client);
      logger.info('[MCPManager] Connected to MCP server: %s', serverName);

      // Get tools from this server
      const tools = await client.tools();
      logger.info('[MCPManager] Discovered %d tools from %s', Object.keys(tools).length, serverName);

      // Extract definitions
      for (const [toolName, tool] of Object.entries(tools)) {
        const fullName = `mcp__${serverName}__${toolName}`;
        this.toolDefinitions.push({
          name: fullName,
          description: tool.description || '',
          parameters: (tool as any).parameters || (tool as any).inputSchema // eslint-disable-line @typescript-eslint/no-explicit-any
        });
        logger.info('[MCPManager] Registered tool: %s', fullName);
      }
    } catch (error) {
      logger.error('[MCPManager] Failed to connect to MCP server %s: %s', serverName, error instanceof Error ? error.message : String(error));
    }
  }

  getToolDefinitions(): MCPToolDefinition[] {
    return this.toolDefinitions;
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.info('[MCPManager] Executing tool: %s with args: %j', toolName, args);

    // Parse mcp__serverName__toolName
    const parts = toolName.split('__');
    if (parts.length !== 3 || parts[0] !== 'mcp') {
      throw new Error(`Invalid MCP tool name: ${toolName}`);
    }

    const serverName = parts[1];
    const actualToolName = parts[2];

    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`MCP server not found: ${serverName}`);
    }

    // Get the tool and execute it
    const tools = await client.tools();
    const tool = tools[actualToolName];

    if (!tool || typeof (tool as any).execute !== 'function') { // eslint-disable-line @typescript-eslint/no-explicit-any
      throw new Error(`Tool not found: ${actualToolName}`);
    }

    const result = await (tool as any).execute(args); // eslint-disable-line @typescript-eslint/no-explicit-any
    logger.info('[MCPManager] Tool execution completed: %s', toolName);
    return result;
  }

  async close(): Promise<void> {
    logger.info('[MCPManager] Closing %d MCP client(s)', this.clients.size);
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
    logger.info('[MCPManager] All MCP clients closed');
  }
}

import { CommandMessage, ErrorMessage,LLMResponseMessage, MCPToolsMessage,PlanDataMessage,ToolCallMessage, ToolResultMessage, UserInputMessage, WSMessage } from '@shared/websocket-types';
import WebSocket from 'ws';

import logger from './common/logger';
import { ClientTools } from './tools/client-tools';

export class WebSocketClient {
  private ws: WebSocket;
  private clientTools = new ClientTools();
  private mcpToolsReady = false;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.setupHandlers();
    this.initializeClientTools();
  }

  private async initializeClientTools(): Promise<void> {
    await this.clientTools.initialize();
    this.mcpToolsReady = true;
    // Send MCP tools if WebSocket is already open
    if (this.ws.readyState === WebSocket.OPEN) {
      await this.sendMCPTools();
    }
  }

  private async sendMCPTools(): Promise<void> {
    const tools = this.clientTools.getMCPToolDefinitions();
    if (tools.length > 0) {
      const message: MCPToolsMessage = {
        id: crypto.randomUUID(),
        type: 'mcp_tools',
        payload: { tools },
        timestamp: Date.now()
      };
      this.send(message);
      logger.info('Sent %d MCP tool definitions to server', tools.length);
    }
  }

  private setupHandlers(): void {
    this.ws.on('message', async (data) => {
      const message: WSMessage = JSON.parse(data.toString());
      logger.info('Received message type %s', message.type);

      switch (message.type) {
        case 'tool_call':
          this.onToolCall?.(message as ToolCallMessage);
          await this.handleToolCall(message as ToolCallMessage);
          break;
        case 'llm_response':
          logger.info('LLM response received');
          this.onLLMResponse?.(message as LLMResponseMessage);
          break;
        case 'error':
          logger.info('Error message received: %s', (message as ErrorMessage).payload.message);
          this.onError?.((message as ErrorMessage).payload.message);
          break;
        case 'plan_data':
          const planMessage = message as PlanDataMessage;
          logger.info('Plan data received for session %s: %d tasks, status %s',
            planMessage.payload.sessionId,
            planMessage.payload.plan.tasks.length,
            planMessage.payload.plan.status);
          planMessage.payload.plan.tasks.forEach((task, index) => {
            logger.info('Task %d: %s [%s]', index + 1, task.description, task.status);
          });
          this.onPlanData?.(planMessage);
          logger.info('Plan data callback executed');
          break;
        case 'command':
          this.onCommand?.(message as CommandMessage);
          break;
      }
    });

    this.ws.on('error', (error) => {
      logger.info('WebSocket error: %s', error.message);
      this.onError?.(`Connection error: ${error.message}`);
    });

    this.ws.on('close', async () => {
      logger.info('WebSocket connection closed');
      await this.clientTools.close();
      this.onError?.('Connection closed');
    });

    this.ws.on('open', async () => {
      logger.info('WebSocket connected');
      // Send MCP tools if they're already initialized
      if (this.mcpToolsReady) {
        await this.sendMCPTools();
      }
    });
  }

  private async handleToolCall(message: ToolCallMessage): Promise<void> {
    try {
      logger.info('Executing tool %s', message.payload.name);
      const result = await this.clientTools.execute(
        message.payload.name,
        message.payload.args
      );
      logger.info('Tool execution successful for %s', message.payload.name);
      this.sendToolResult({ result, toolId: message.payload.toolId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.info('Tool execution failed for %s: %s', message.payload.name, errorMessage);
      this.sendToolResult({ error: errorMessage, toolId: message.payload.toolId });
    }
  }

  private sendToolResult(payload: { result?: any; error?: string; toolId: string }): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    const message: ToolResultMessage = {
      id: crypto.randomUUID(),
      type: 'tool_result',
      payload,
      timestamp: Date.now()
    };
    this.send(message);
  }

  private send(message: WSMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  public sendUserInput(content: string): void {
    logger.info('Sending user input: %s', content);
    const message: UserInputMessage = {
      id: crypto.randomUUID(),
      type: 'user_input',
      payload: { content },
      timestamp: Date.now()
    };
    this.send(message);
  }

  public sendCommand(command: string): void {
    logger.info('Sending command: %s', command);
    const message: CommandMessage = {
      id: crypto.randomUUID(),
      type: 'command',
      payload: { command },
      timestamp: Date.now()
    };
    this.send(message);
  }

  // Type-safe callbacks
  onLLMResponse?: (message: LLMResponseMessage) => void;
  onError?: (error: string) => void;
  onToolCall?: (message: ToolCallMessage) => void;
  onPlanData?: (message: PlanDataMessage) => void;
  onCommand?: (message: CommandMessage) => void;
}
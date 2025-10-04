import { CommandMessage, ErrorMessage, LLMResponseMessage, ToolResultMessage, UserInputMessage, WSMessage } from '@shared/websocket-types';
import { WebSocket, WebSocketServer } from 'ws';

import logger from './common/logger';
import { AIService } from './services/ai-service';
import { ToolCoordinator } from './tools/tool-coordinator';

export class WebSocketServerHandler {
  private wss: WebSocketServer;
  private toolCoordinator = new ToolCoordinator();
  private aiService = new AIService(this.toolCoordinator);
  private sessions = new Map<string, WebSocket>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws) => {
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, ws);
      logger.info('WebSocket client connected: %s', sessionId);

      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          logger.info('Received message type %s from session %s', message.type, sessionId);

          switch (message.type) {
            case 'user_input':
              await this.handleUserInput(ws, sessionId, message as UserInputMessage);
              break;
            case 'tool_result':
              await this.handleToolResult(ws, sessionId, message as ToolResultMessage);
              break;
            case 'command':
              await this.handleCommand(ws, sessionId, message as CommandMessage);
              break;
            default:
              logger.warn('Unknown message type %s from session %s', message.type, sessionId);
          }
        } catch (error) {
          logger.error('Error processing message from session %s: %s', sessionId, error instanceof Error ? error.message : String(error));
          this.sendError(ws, error instanceof Error ? error.message : 'Unknown error');
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket client disconnected: %s', sessionId);
        this.sessions.delete(sessionId);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error for session %s: %s', sessionId, error.message);
      });
    });
  }

  private async handleUserInput(ws: WebSocket, sessionId: string, message: UserInputMessage): Promise<void> {
    await this.aiService.processUserInput(
      sessionId,
      message.payload.content,
      (response) => this.sendToClient(ws, response)
    );
  }

  private async handleToolResult(ws: WebSocket, sessionId: string, message: ToolResultMessage): Promise<void> {
    await this.aiService.processToolResult(
      sessionId,
      message.payload,
      (response) => this.sendToClient(ws, response)
    );
  }

  private async handleCommand(ws: WebSocket, sessionId: string, message: CommandMessage): Promise<void> {
    const { command } = message.payload;

    if (command === 'clear') {
      this.aiService.clearConversation(sessionId);

      const clearCommand: CommandMessage = {
        id: crypto.randomUUID(),
        type: 'command',
        payload: { command: 'clear' },
        timestamp: Date.now()
      };
      this.sendToClient(ws, clearCommand);

      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: '✅ Conversation cleared' },
        timestamp: Date.now()
      };
      this.sendToClient(ws, response);
    } else {
      this.sendError(ws, `Unknown command: /${command}`);
    }
  }

  private sendToClient(ws: WebSocket, message: WSMessage): void {
    ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, error: string): void {
    const message: ErrorMessage = {
      id: crypto.randomUUID(),
      type: 'error',
      payload: { message: error },
      timestamp: Date.now()
    };
    this.sendToClient(ws, message);
  }
}
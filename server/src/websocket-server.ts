import { ErrorMessage, ToolResultMessage, UserInputMessage, WSMessage } from '@shared/websocket-types';
import { WebSocket,WebSocketServer } from 'ws';

import logger from './common/logger';
import { AIService } from './services/ai-service';

export class WebSocketServerHandler {
  private wss: WebSocketServer;
  private aiService = new AIService();
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
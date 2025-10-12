import { CommandMessage, ErrorMessage, LLMResponseMessage, MCPToolsMessage, ToolResultMessage, UserInputMessage, WSMessage } from '@shared/websocket-types';
import { WebSocketServer } from 'ws';

import logger from './common/logger';
import { Session } from './services/session';

export class WebSocketServerHandler {
  private wss: WebSocketServer;
  private sessions = new Map<string, Session>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws) => {
      const sessionId = crypto.randomUUID();
      const session = new Session(sessionId, ws);
      this.sessions.set(sessionId, session);
      logger.info('WebSocket client connected: %s', sessionId);

      ws.on('message', async (data) => {
        const session = this.sessions.get(sessionId);
        if (!session) {
          logger.warn('Session not found: %s', sessionId);
          return;
        }

        try {
          const message: WSMessage = JSON.parse(data.toString());
          logger.info('Received message type %s from session %s', message.type, sessionId);

          switch (message.type) {
            case 'mcp_tools':
              this.handleMCPTools(session, message as MCPToolsMessage);
              break;
            case 'user_input':
              await this.handleUserInput(session, message as UserInputMessage);
              break;
            case 'tool_result':
              await this.handleToolResult(session, message as ToolResultMessage);
              break;
            case 'command':
              await this.handleCommand(session, message as CommandMessage);
              break;
            default:
              logger.warn('Unknown message type %s from session %s', message.type, sessionId);
          }
        } catch (error) {
          logger.error('Error processing message from session %s: %s', sessionId, error instanceof Error ? error.message : String(error));
          const errorMessage: ErrorMessage = {
            id: crypto.randomUUID(),
            type: 'error',
            payload: { message: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: Date.now()
          };
          session.sendToClient(errorMessage);
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

  private handleMCPTools(session: Session, message: MCPToolsMessage): void {
    logger.info('Registering %d MCP tools for session %s', message.payload.tools.length, session.sessionId);
    session.registerMCPTools(message.payload.tools);
  }

  private async handleUserInput(session: Session, message: UserInputMessage): Promise<void> {
    await session.aiService.processUserInput(message.payload.content);
  }

  private async handleToolResult(session: Session, message: ToolResultMessage): Promise<void> {
    await session.aiService.processToolResult(message.payload);
  }

  private async handleCommand(session: Session, message: CommandMessage): Promise<void> {

    const { command } = message.payload;

    if (command === 'clear') {
      session.aiService.clearConversation();

      const clearCommand: CommandMessage = {
        id: crypto.randomUUID(),
        type: 'command',
        payload: { command: 'clear' },
        timestamp: Date.now()
      };
      session.sendToClient(clearCommand);

      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: '✅ Conversation cleared' },
        timestamp: Date.now()
      };
      session.sendToClient(response);
    } else if (command === 'compact') {
      try {
        const success = await session.aiService.compactConversation();

        if (success) {
          const compactCommand: CommandMessage = {
            id: crypto.randomUUID(),
            type: 'command',
            payload: { command: 'compact' },
            timestamp: Date.now()
          };
          session.sendToClient(compactCommand);

          const response: LLMResponseMessage = {
            id: crypto.randomUUID(),
            type: 'llm_response',
            payload: { content: '✅ Conversation compacted' },
            timestamp: Date.now()
          };
          session.sendToClient(response);
        }
      } catch (error) {
        const errorMessage: ErrorMessage = {
          id: crypto.randomUUID(),
          type: 'error',
          payload: { message: `Failed to compact conversation: ${error instanceof Error ? error.message : String(error)}` },
          timestamp: Date.now()
        };
        session.sendToClient(errorMessage);
      }
    } else {
      const errorMessage: ErrorMessage = {
        id: crypto.randomUUID(),
        type: 'error',
        payload: { message: `Unknown command: /${command}` },
        timestamp: Date.now()
      };
      session.sendToClient(errorMessage);
    }
  }
}
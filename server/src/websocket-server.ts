import { ErrorMessage, WSMessage } from '@shared/websocket-types';
import { WebSocket,WebSocketServer } from 'ws';

export class WebSocketServerHandler {
  private wss: WebSocketServer;
  private sessions = new Map<string, WebSocket>();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.wss.on('connection', (ws) => {
      const sessionId = crypto.randomUUID();
      this.sessions.set(sessionId, ws);

      ws.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'user_input':
              await this.handleUserInput();
              break;
            case 'tool_result':
              await this.handleToolResult();
              break;
          }
        } catch (error) {
          this.sendError(ws, error instanceof Error ? error.message : 'Unknown error');
        }
      });

      ws.on('close', () => {
        this.sessions.delete(sessionId);
      });
    });
  }

  private async handleUserInput(): Promise<void> {
    
  }

  private async handleToolResult(): Promise<void> {
    
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
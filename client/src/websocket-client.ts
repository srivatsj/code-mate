import { LLMResponseMessage,ToolCallMessage, ToolResultMessage, UserInputMessage, WSMessage } from '@shared/websocket-types';
import WebSocket from 'ws';

import { ClientTools } from './tools/client-tools';

export class WebSocketClient {
  private ws: WebSocket;
  private clientTools = new ClientTools();

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.on('message', async (data) => {
      const message: WSMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'tool_call':
          await this.handleToolCall(message as ToolCallMessage);
          break;
        case 'llm_response':
          this.onLLMResponse?.(message as LLMResponseMessage);
          break;
        case 'error':
          this.onError?.(message.payload.message);
          break;
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      this.onError?.(`Connection error: ${error.message}`);
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
      this.onError?.('Connection closed');
    });

    this.ws.on('open', () => {
      console.log('WebSocket connected');
    });
  }

  private async handleToolCall(message: ToolCallMessage): Promise<void> {
    try {
      const result = await this.clientTools.execute(
        message.payload.name, 
        message.payload.args
      );
      
      this.sendToolResult({ result });
    } catch (error) {
      this.sendToolResult({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  public sendUserInput(content: string): void {
    const message: UserInputMessage = {
      id: crypto.randomUUID(),
      type: 'user_input',
      payload: { content },
      timestamp: Date.now()
    };
    this.send(message);
  }

  private sendToolResult(payload: { result?: any; error?: string }): void {
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

  // Type-safe callbacks
  onLLMResponse?: (message: LLMResponseMessage) => void;
  onError?: (error: string) => void;
}
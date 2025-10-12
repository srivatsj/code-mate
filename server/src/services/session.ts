import { WSMessage } from '@shared/websocket-types';
import { WebSocket } from 'ws';

import { ClientTools } from '../tools/client-tools';
import { ServerTools } from '../tools/server-tools';
import { ToolCoordinator } from '../tools/tool-coordinator';
import { AIService } from './ai-service';
import { ConversationService } from './conversation-service';

export class Session {
  sessionId: string;
  ws: WebSocket;
  toolCoordinator: ToolCoordinator;
  conversationService: ConversationService;
  clientTools: ClientTools;
  serverTools: ServerTools;
  aiService: AIService;

  constructor(sessionId: string, ws: WebSocket) {
    this.sessionId = sessionId;
    this.ws = ws;
    this.toolCoordinator = new ToolCoordinator();
    this.conversationService = new ConversationService(sessionId);
    this.clientTools = new ClientTools(this.sendToClient.bind(this), this.toolCoordinator);
    this.serverTools = new ServerTools(sessionId, this.sendToClient.bind(this));
    this.aiService = new AIService(
      sessionId,
      this.sendToClient.bind(this),
      this.toolCoordinator,
      this.conversationService,
      this.clientTools,
      this.serverTools
    );
  }

  sendToClient(message: WSMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  registerMCPTools(tools: Array<{ name: string; description: string; parameters: any }>): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.clientTools.registerMCPTools(tools);
  }
}

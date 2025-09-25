import { ServerTools } from '@server/tools/server-tools';
import { ErrorMessage,LLMResponseMessage, ToolResultPayload, WSMessage } from '@shared/websocket-types';
import { generateText } from 'ai';

import { ClientTools } from '../tools/client-tools';
import { ConversationService } from './conversation-service';

export class AIService {
  private conversationService = new ConversationService();
  private serverTools = new ServerTools();

  async processUserInput(
    sessionId: string,
    userInput: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    this.conversationService.addUserMessage(sessionId, userInput);
    await this.runGeneration(sessionId, sendToClient);
  }

  async processToolResult(
    sessionId: string,
    toolResult: ToolResultPayload,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    this.conversationService.addToolResult(sessionId, toolResult);
    await this.runGeneration(sessionId, sendToClient);
  }

  private async runGeneration(
    sessionId: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    try {
      const history = this.conversationService.getHistory(sessionId);
      const clientTools = new ClientTools(sendToClient, sessionId);
      
      const allTools = {
        ...clientTools.getClientToolProxies(),
        ...this.serverTools.getTools()
      };

      const result = await generateText({
        model: 'google/gemini-2.0-flash-exp',
        messages: history,
        tools: allTools
      });

      this.conversationService.addAssistantMessage(sessionId, result.text);

      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: result.text },
        timestamp: Date.now()
      };

      sendToClient(response);
    } catch (error) {
      const errorResponse: ErrorMessage = {
        id: crypto.randomUUID(),
        type: 'error',
        payload: { message: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now()
      };
      sendToClient(errorResponse);
    }
  }
}
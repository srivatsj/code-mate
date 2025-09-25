import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ServerTools } from '@server/tools/server-tools';
import { ErrorMessage,LLMResponseMessage, ToolResultPayload, WSMessage } from '@shared/websocket-types';
import { generateText } from 'ai';

import logger from '../common/logger';
import { ClientTools } from '../tools/client-tools';
import { ConversationService } from './conversation-service';
import { SYSTEM_PROMPT } from './prompts';

export class AIService {
  private conversationService = new ConversationService();
  private serverTools = new ServerTools();
  private googleAI = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  });

  async processUserInput(
    sessionId: string,
    userInput: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    logger.info('Processing user input for session %s', sessionId);
    logger.info('User input: %s', userInput);
    this.conversationService.addUserMessage(sessionId, userInput);
    await this.runGeneration(sessionId, sendToClient);
  }

  async processToolResult(
    sessionId: string,
    toolResult: ToolResultPayload,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    logger.info('Processing tool result for session %s', sessionId);
    logger.info('Tool result: %o', toolResult);
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
        model: this.googleAI('gemini-2.5-flash'),
        messages: history,
        tools: allTools,
        system: SYSTEM_PROMPT
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
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      logger.error('Error during generation for session %s: %s', sessionId, errorMessage);
      const errorResponse: ErrorMessage = {
        id: crypto.randomUUID(),
        type: 'error',
        payload: { message: errorMessage },
        timestamp: Date.now()
      };
      sendToClient(errorResponse);
    }
  }
}
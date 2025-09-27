import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ServerTools } from '@server/tools/server-tools';
import { ToolCoordinator } from '@server/tools/tool-coordinator';
import { ErrorMessage,LLMResponseMessage, ToolResultPayload, WSMessage } from '@shared/websocket-types';
import { generateText, stepCountIs } from 'ai';

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

  constructor(private toolCoordinator: ToolCoordinator) {}

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
    _sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    logger.info('Processing tool result for session %s', sessionId);
    logger.info('Tool result: %o', toolResult);

    // Try to resolve a pending promise first
    if (this.toolCoordinator.resolve(toolResult.toolId, toolResult)) {
      // Promise was resolved - tool execution continues within AI SDK
      logger.info('Resolved pending promise for toolId: %s', toolResult.toolId);
    } else {
      // No pending promise - this is an unexpected tool result
      logger.warn('No pending promise found for toolId: %s', toolResult.toolId);
    }
  }

  private async runGeneration(
    sessionId: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    try {
      const history = this.conversationService.getHistory(sessionId);
      const clientTools = new ClientTools(sendToClient, sessionId, this.toolCoordinator);
      
      const allTools = {
        ...clientTools.getClientToolProxies(),
        ...this.serverTools.getTools()
      };

      const result = await generateText({
        model: this.googleAI('gemini-2.5-flash'),
        messages: history,
        tools: allTools,
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(10),
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
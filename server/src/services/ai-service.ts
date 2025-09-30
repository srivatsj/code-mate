import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ServerTools } from '@server/tools/server-tools';
import { ToolCoordinator } from '@server/tools/tool-coordinator';
import {
  LLMResponseMessage,
  ToolResultPayload,
  WSMessage,
} from '@shared/websocket-types';
import { generateText, stepCountIs } from 'ai';

import logger from '../common/logger';
import { ClientTools } from '../tools/client-tools';
import { ConversationService } from './conversation-service';
import { SYSTEM_PROMPT } from './prompts';
import { RateLimiter } from './rate-limiter';

export class AIService {
  private conversationService = new ConversationService();
  private googleAI = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  private rateLimiter = new RateLimiter(10, 1); // 10 RPM, 1 concurrent
  private serverTools = new ServerTools(); // Persist across retries

  constructor(private toolCoordinator: ToolCoordinator) {}

  async processUserInput(
    sessionId: string,
    userInput: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    this.conversationService.addUserMessage(sessionId, userInput);

    await this.rateLimiter.scheduleWithRetry(
      () => this.runGeneration(sessionId, sendToClient),
      sendToClient,
      sessionId
    );
  }

  async processToolResult(
    sessionId: string,
    toolResult: ToolResultPayload,
    _sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    if (!this.toolCoordinator.resolve(toolResult.toolId, toolResult)) {
      logger.warn('Unexpected tool result for session %s: %s', sessionId, toolResult.toolId);
    } else {
      // Add tool result to conversation history
      this.conversationService.addToolResult(sessionId, toolResult);
      logger.info('Tool result processed for session %s: %s', sessionId, toolResult.toolId);
    }
  }

  private async runGeneration(
    sessionId: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    try {
      const history = this.conversationService.getHistory(sessionId);

      const clientTools = new ClientTools(sendToClient, this.toolCoordinator);
      this.serverTools.setSendToClient(sendToClient); // Update callback for current request
      this.serverTools.setSessionId(sessionId); // Set session ID for plan tools
      const allTools = {
        ...clientTools.getClientToolProxies(),
        ...this.serverTools.getTools(),
      };

      logger.info(
        'Starting text generation for session %s with %d messages',
        sessionId,
        history.length
      );

      const result = await generateText({
        model: this.googleAI('gemini-2.5-flash'),
        messages: history,
        tools: allTools,
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(25), // Allow complex tasks - bottleneck will handle rate limiting
      });

      logger.info(
        'Generation completed for session %s. Tool calls: %d, Text length: %d',
        sessionId,
        result.toolCalls?.length || 0,
        result.text.length
      );

      this.conversationService.addAssistantMessage(sessionId, result.text);

      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: result.text },
        timestamp: Date.now(),
      };

      sendToClient(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error during generation for session %s: %s', sessionId, errorMessage);

      const errorResponse: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: `❌ Error: ${errorMessage}` },
        timestamp: Date.now(),
      };
      sendToClient(errorResponse);

      // Re-throw to trigger retry in rate limiter if it's a quota error
      throw error;
    }
  }
}

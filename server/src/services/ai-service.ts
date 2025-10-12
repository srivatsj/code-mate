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
import { AILogging } from './ai-logging';
import { ConversationService } from './conversation-service';
import { SYSTEM_PROMPT } from './prompts';
import { RateLimiter } from './rate-limiter';

export class AIService {
  private googleAI = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  private rateLimiter = new RateLimiter(10, 1);

  constructor(
    private sessionId: string,
    private sendToClient: (message: WSMessage) => void,
    private toolCoordinator: ToolCoordinator,
    private conversationService: ConversationService,
    private clientTools: ClientTools,
    private serverTools: ServerTools
  ) {}

  async processUserInput(userInput: string): Promise<void> {
    AILogging.logUserInput(this.sessionId, userInput);
    this.conversationService.addUserMessage(userInput);

    await this.rateLimiter.scheduleWithRetry(
      () => this.runGeneration(),
      this.sendToClient,
      this.sessionId
    );
  }

  async processToolResult(toolResult: ToolResultPayload): Promise<void> {
    if (!this.toolCoordinator.resolve(toolResult.toolId, toolResult)) {
      logger.warn('[AIService] ⚠️  Unexpected tool result for session %s: %s', this.sessionId, toolResult.toolId);
    } else {
      this.conversationService.addToolResult(toolResult);
    }
  }

  clearConversation(): void {
    this.conversationService.clear();
  }

  async compactConversation(): Promise<boolean> {
    const history = this.conversationService.getHistory();

    if (history.length === 0) {
      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: '⚠️  No conversation to compact' },
        timestamp: Date.now(),
      };
      this.sendToClient(response);
      return false;
    }

    try {
      const result = await generateText({
        model: this.googleAI('gemini-2.5-flash'),
        messages: [
          ...history,
          {
            role: 'user',
            content: 'Please provide a concise summary of our conversation so far, including key topics discussed, decisions made, and any important context that should be preserved.'
          }
        ],
        system: SYSTEM_PROMPT,
      });

      await this.conversationService.compact(result.text);
      logger.info('[AIService] Conversation compacted for session %s', this.sessionId);
      return true;
    } catch (error) {
      logger.error('[AIService] Error compacting conversation for session %s: %s', this.sessionId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async runGeneration(): Promise<void> {
    try {
      const history = this.conversationService.getHistory();
      const allTools = {
        ...this.clientTools.getClientToolProxies(),
        ...this.serverTools.getTools(),
      };

      let stepNumber = 0;
      const result = await generateText({
        model: this.googleAI('gemini-2.5-flash'),
        messages: history,
        tools: allTools,
        system: SYSTEM_PROMPT,
        stopWhen: stepCountIs(25),
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          stepNumber++;
          AILogging.logStepStart(stepNumber, this.sessionId);
          AILogging.logToolCalls(toolCalls as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          AILogging.logToolResults(toolResults as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          AILogging.logLLMText(text);
          AILogging.logStepEnd(finishReason, usage?.totalTokens || 0);
        }
      });

      AILogging.logFinalResult(result.text);

      if (result.text && result.text.trim().length > 0) {
        this.conversationService.addAssistantMessage(result.text);

        const response: LLMResponseMessage = {
          id: crypto.randomUUID(),
          type: 'llm_response',
          payload: { content: result.text },
          timestamp: Date.now(),
        };

        this.sendToClient(response);
        AILogging.logResponseSent();
      } else {
        AILogging.logEmptyResponse(result.finishReason);

        // Send error message to client
        const errorResponse: LLMResponseMessage = {
          id: crypto.randomUUID(),
          type: 'llm_response',
          payload: { content: '⚠️  Empty response from AI. Please try again or rephrase your request.' },
          timestamp: Date.now(),
        };
        this.sendToClient(errorResponse);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[AIService] Error during generation for session %s: %s', this.sessionId, errorMessage);

      const errorResponse: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: `❌ Error: ${errorMessage}` },
        timestamp: Date.now(),
      };
      this.sendToClient(errorResponse);

      // Re-throw to trigger retry in rate limiter if it's a quota error
      throw error;
    }
  }
}

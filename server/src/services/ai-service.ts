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
    AILogging.logUserInput(sessionId, userInput);
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
      logger.warn('[AIService] ⚠️  Unexpected tool result for session %s: %s', sessionId, toolResult.toolId);
    } else {
      this.conversationService.addToolResult(sessionId, toolResult);
    }
  }

  clearConversation(sessionId: string): void {
    this.conversationService.clear(sessionId);
  }

  async compactConversation(
    sessionId: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<boolean> {
    const history = this.conversationService.getHistory(sessionId);

    if (history.length === 0) {
      const response: LLMResponseMessage = {
        id: crypto.randomUUID(),
        type: 'llm_response',
        payload: { content: '⚠️  No conversation to compact' },
        timestamp: Date.now(),
      };
      sendToClient(response);
      return false;
    }

    try {
      // Ask LLM to summarize the conversation
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

      const summary = result.text;

      // Replace conversation history with summary
      await this.conversationService.compact(sessionId, summary);

      logger.info('[AIService] Conversation compacted for session %s', sessionId);
      return true;
    } catch (error) {
      logger.error('[AIService] Error compacting conversation for session %s: %s', sessionId, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async runGeneration(
    sessionId: string,
    sendToClient: (message: WSMessage) => void
  ): Promise<void> {
    try {
      const history = this.conversationService.getHistory(sessionId);
      const clientTools = new ClientTools(sendToClient, this.toolCoordinator);
      this.serverTools.setSendToClient(sendToClient);
      this.serverTools.setSessionId(sessionId);
      const allTools = {
        ...clientTools.getClientToolProxies(),
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
          AILogging.logStepStart(stepNumber, sessionId);
          AILogging.logToolCalls(toolCalls as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          AILogging.logToolResults(toolResults as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          AILogging.logLLMText(text);
          AILogging.logStepEnd(finishReason, usage?.totalTokens || 0);
        }
      });

      AILogging.logFinalResult(result.text);

      if (result.text && result.text.trim().length > 0) {
        this.conversationService.addAssistantMessage(sessionId, result.text);

        const response: LLMResponseMessage = {
          id: crypto.randomUUID(),
          type: 'llm_response',
          payload: { content: result.text },
          timestamp: Date.now(),
        };

        sendToClient(response);
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
        sendToClient(errorResponse);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[AIService] Error during generation for session %s: %s', sessionId, errorMessage);

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

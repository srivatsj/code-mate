import { LLMResponseMessage, WSMessage } from '@shared/websocket-types';
import Bottleneck from 'bottleneck';

import logger from '../common/logger';

export class RateLimiter {
  private limiter: Bottleneck;

  constructor(
    private maxRequestsPerMinute = 10,
    private maxConcurrent = 1
  ) {
    this.limiter = new Bottleneck({
      maxConcurrent: this.maxConcurrent,
      reservoir: this.maxRequestsPerMinute,
      reservoirRefreshAmount: this.maxRequestsPerMinute,
      reservoirRefreshInterval: 60 * 1000,
    });

    this.setupLogging();
  }

  private setupLogging() {
    this.limiter.on('queued', () => {
      logger.info('[RateLimit] Request queued');
    });
    this.limiter.on('executing', () => logger.info('[RateLimit] Request executing'));
    this.limiter.on('done', () => logger.info('[RateLimit] Request done'));
  }

  private sendQueuedMessage(
    sendToClient: (message: WSMessage) => void,
    queuePosition: number
  ) {
    const message: LLMResponseMessage = {
      id: crypto.randomUUID(),
      type: 'llm_response',
      payload: {
        content: `⏳ Your request is queued (position ${queuePosition}). Please wait...`,
      },
      timestamp: Date.now(),
    };
    sendToClient(message);
  }

  private async runWithRetry<T>(
    task: () => Promise<T>,
    sendToClient: (message: WSMessage) => void,
    sessionId: string,
    maxAttempts: number
  ): Promise<T> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      try {
        return await task();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        attempt++;

        if (
          errorMessage.includes('quota') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429')
        ) {
          // Extract retry time from Google's error message if available
          const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/);
          const suggestedDelay = retryMatch ? parseFloat(retryMatch[1]) * 1000 : null;

          // Use suggested delay or exponential backoff
          const delay = suggestedDelay || Math.pow(2, attempt) * 5000; // 5s, 10s, 20s default

          logger.warn(
            'Quota exceeded (attempt %d/%d) for session %s. Retrying in %d ms',
            attempt,
            maxAttempts,
            sessionId,
            Math.round(delay)
          );

          // Notify user about the retry
          const retryMessage: LLMResponseMessage = {
            id: crypto.randomUUID(),
            type: 'llm_response',
            payload: {
              content: `⏳ Rate limit exceeded. Retrying in ${Math.ceil(delay / 1000)} seconds... (attempt ${attempt}/${maxAttempts})`,
            },
            timestamp: Date.now(),
          };
          sendToClient(retryMessage);

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw new Error('Failed after multiple retries due to quota limits.');
  }

  /**
   * Wraps a task in rate limiting + retry/backoff
   */
  async scheduleWithRetry<T>(
    task: () => Promise<T>,
    sendToClient: (message: WSMessage) => void,
    sessionId: string,
    maxAttempts = 3
  ): Promise<T> {
    const counts = await this.limiter.counts();
    if (counts.QUEUED > 0) {
      this.sendQueuedMessage(sendToClient, counts.QUEUED + 1);
    }

    return this.limiter.schedule(() =>
      this.runWithRetry(task, sendToClient, sessionId, maxAttempts)
    );
  }
}

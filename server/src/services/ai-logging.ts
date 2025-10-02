import logger from '../common/logger';

export class AILogging {
  static logUserInput(sessionId: string, userInput: string): void {
    logger.info('═════════════════════════════════════════════════════════════');
    logger.info('[AIService] 📥 USER INPUT for session %s', sessionId);
    logger.info('═════════════════════════════════════════════════════════════');
    logger.info('User: "%s"', userInput);
    logger.info('═════════════════════════════════════════════════════════════\n');
  }

  static logStepStart(stepNumber: number, sessionId: string): void {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('[AIService] 🔄 STEP %d for session %s', stepNumber, sessionId);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  static logToolCalls(toolCalls: any[]): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!toolCalls || toolCalls.length === 0) return;

    logger.info('[AIService] 🛠️  LLM wants to call %d tool(s):', toolCalls.length);
    toolCalls.forEach((call: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.info('  Tool #%d:', idx + 1);
      logger.info('    Name: %s', call.toolName || '(unnamed)');
      logger.info('    Args: %s', JSON.stringify(call.args || {}, null, 2));
    });
  }

  static logToolResults(toolResults: any[]): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!toolResults || toolResults.length === 0) return;

    logger.info('[AIService] ✅ Tool results received (%d):', toolResults.length);
    toolResults.forEach((result: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      logger.info('  Tool #%d:', idx + 1);
      logger.info('    Name: %s', result.toolName || '(unnamed)');

      // Extract the actual output from the result
      const output = result.output || result.result || result;
      const outputStr = JSON.stringify(output, null, 2);

      if (outputStr.length > 500) {
        logger.info('    Result: %s', outputStr.substring(0, 500) + '\n    ...(truncated)');
      } else {
        logger.info('    Result: %s', outputStr);
      }
    });
  }

  static logLLMText(text: string | null | undefined): void {
    if (text) {
      const truncated = text.length > 200 ? text.substring(0, 200) + '...' : text;
      logger.info('[AIService] 💬 LLM response text: "%s"', truncated);
    } else {
      logger.info('[AIService] 💬 LLM response text: (empty/null)');
    }
  }

  static logStepEnd(finishReason: string, tokensUsed: number): void {
    logger.info('[AIService] Finish reason: %s, Tokens used: %d', finishReason, tokensUsed);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  static logFinalResult(text: string | null | undefined): void {
    logger.info('[AIService] 📊 Final result - Text length: %d',
      text?.length || 0
    );

    if (text && text.length > 0) {
      const preview = text.length > 100 ? text.substring(0, 100) + '...' : text;
      logger.info('[AIService] Preview: "%s"', preview);
    }
  }

  static logEmptyResponse(finishReason: string): void {
    logger.warn('[AIService] ⚠️  Empty response from LLM');
    logger.warn('[AIService] Finish reason: %s', finishReason);
  }

  static logResponseSent(): void {
    logger.info('[AIService] ✅ Response sent to client\n');
  }
}

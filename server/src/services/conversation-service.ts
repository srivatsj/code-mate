import { ConversationMessage } from '../common/types';

export class ConversationService {
  private conversations = new Map<string, ConversationMessage[]>();

  addUserMessage(sessionId: string, content: string): void {
    this.ensureSession(sessionId);
    this.conversations.get(sessionId)!.push({
      role: 'user',
      content,
      timestamp: Date.now()
    });
  }

  addAssistantMessage(sessionId: string, content: string): void {
    this.ensureSession(sessionId);
    this.conversations.get(sessionId)!.push({
      role: 'assistant', 
      content,
      timestamp: Date.now()
    });
  }

  addToolResult(sessionId: string, result: any): void { // eslint-disable-line @typescript-eslint/no-explicit-any
    this.ensureSession(sessionId);
    const content = result.error
      ? `Tool execution failed: ${result.error}`
      : `Tool executed successfully. Result: ${JSON.stringify(result.result)}`;
    this.conversations.get(sessionId)!.push({
      role: 'user',
      content: `[Tool completed] ${content}`,
      timestamp: Date.now()
    });
  }

  getHistory(sessionId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages = this.conversations.get(sessionId) || [];
    return messages.slice(-20)
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  private ensureSession(sessionId: string): void {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
  }
}
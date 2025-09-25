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

  addToolResult(sessionId: string, result: any): void {
    this.ensureSession(sessionId);
    const content = result.error ? `Error: ${result.error}` : `Result: ${JSON.stringify(result.result)}`;
    this.conversations.get(sessionId)!.push({
      role: 'assistant',
      content: `[Tool Result] ${content}`,
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
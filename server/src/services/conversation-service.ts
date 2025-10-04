import { ToolResultPayload } from '@shared/websocket-types';
import fs from 'fs/promises';

import { ConversationMessage } from '../common/types';

export class ConversationService {
  private conversations = new Map<string, ConversationMessage[]>();

  private async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    this.ensureSession(sessionId);
    this.conversations.get(sessionId)!.push(message);

    try {
      const messages = this.conversations.get(sessionId) || [];
      const folderPath = '/tmp/codemate/server';
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(`${folderPath}/conversation_${sessionId}.json`, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error('Failed to write conversation file:', error);
    }
  }

  addUserMessage(sessionId: string, content: string): void {
    this.addMessage(sessionId, {
      role: 'user',
      content,
      timestamp: Date.now()
    });
  }

  addAssistantMessage(sessionId: string, content: string): void {
    this.addMessage(sessionId, {
      role: 'assistant',
      content,
      timestamp: Date.now()
    });
  }

  addToolResult(sessionId: string, result: ToolResultPayload): void {
    const content = result.error
      ? `Tool execution failed: ${result.error}`
      : `Tool executed successfully. Result: ${JSON.stringify(result.result)}`;
    this.addMessage(sessionId, {
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

  clear(sessionId: string): void {
    this.conversations.set(sessionId, []);
  }

  private ensureSession(sessionId: string): void {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, []);
    }
  }
}
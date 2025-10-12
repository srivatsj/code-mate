import { ToolResultPayload } from '@shared/websocket-types';
import fs from 'fs/promises';

import { ConversationMessage } from '../common/types';

export class ConversationService {
  private messages: ConversationMessage[] = [];

  constructor(private sessionId: string) {}

  private async addMessage(message: ConversationMessage): Promise<void> {
    this.messages.push(message);

    try {
      const folderPath = '/tmp/codemate/server';
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(`${folderPath}/conversation_${this.sessionId}.json`, JSON.stringify(this.messages, null, 2));
    } catch (error) {
      console.error('Failed to write conversation file:', error);
    }
  }

  addUserMessage(content: string): void {
    this.addMessage({
      role: 'user',
      content,
      timestamp: Date.now()
    });
  }

  addAssistantMessage(content: string): void {
    this.addMessage({
      role: 'assistant',
      content,
      timestamp: Date.now()
    });
  }

  addToolResult(result: ToolResultPayload): void {
    const content = result.error
      ? `Tool execution failed: ${result.error}`
      : `Tool executed successfully. Result: ${JSON.stringify(result.result)}`;
    this.addMessage({
      role: 'user',
      content: `[Tool completed] ${content}`,
      timestamp: Date.now()
    });
  }

  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages.slice(-20)
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
  }

  clear(): void {
    this.messages = [];
  }

  async compact(summary: string): Promise<void> {
    // Replace entire conversation history with just the summary
    this.messages = [{
      role: 'user',
      content: `[Previous conversation summary]: ${summary}`,
      timestamp: Date.now()
    }];

    try {
      const folderPath = '/tmp/codemate/server';
      await fs.mkdir(folderPath, { recursive: true });
      await fs.writeFile(`${folderPath}/conversation_${this.sessionId}.json`, JSON.stringify(this.messages, null, 2));
    } catch (error) {
      console.error('Failed to write conversation file:', error);
    }
  }
}
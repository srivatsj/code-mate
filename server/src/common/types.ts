export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
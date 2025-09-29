import { LLMResponseMessage, Plan, PlanDataMessage, ToolCallMessage } from '@shared/websocket-types';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import logger from '../../common/logger';
import { WebSocketClient } from '../../websocket-client';
import { ChatInput } from '../chat/chat-input';
import { Message } from '../chat/message/message-types';
import { MessageList } from '../chat/message-list';

const App = () => {
  const [client] = useState(() => new WebSocketClient('ws://localhost:3001'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  useEffect(() => {
    client.onLLMResponse = (message: LLMResponseMessage) => {
      if (!message.payload.content || message.payload.content.trim().length === 0) {
        return;
      }
      setIsLoading(false);
      setMessages(prev => [...prev, {
        type: 'ai',
        content: message.payload.content,
        timestamp: Date.now()
      }]);
    };

    client.onError = (error: string) => {
      setIsLoading(false);
      setMessages(prev => [...prev, {
        type: 'error',
        content: error,
        timestamp: Date.now()
      }]);
    };

    client.onToolCall = (message: ToolCallMessage) => {
      setMessages(prev => [...prev, {
        type: 'tool',
        content: message.payload.name, // Just the tool name for fallback
        toolName: message.payload.name,
        toolArgs: message.payload.args,
        timestamp: Date.now()
      }]);
    };

    client.onPlanData = (message: PlanDataMessage) => {
      logger.info('[App] Plan data callback triggered for session %s', message.payload.sessionId);
      logger.info('[App] Setting current plan with %d tasks, status %s',
        message.payload.plan.tasks.length, message.payload.plan.status);
      setCurrentPlan(message.payload.plan);
      logger.info('[App] Current plan state updated');
    };
  }, [client]);

  const handleSubmit = () => {
    if (input.trim()) {
      setMessages(prev => [...prev, {
        type: 'user',
        content: input,
        timestamp: Date.now()
      }]);
      setIsLoading(true);
      client.sendUserInput(input);
      setInput('');
    }
  };


  return (
    <Box flexDirection="column">
      <Text color="blue">🤖 CodeMate</Text>
      <MessageList messages={messages} isLoading={isLoading} plan={currentPlan} />
      <ChatInput input={input} onInputChange={setInput} onSubmit={handleSubmit} />
    </Box>
  );
};

export default App;
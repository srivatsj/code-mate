import { CommandMessage, LLMResponseMessage, PlanDataMessage, ToolCallMessage } from '@shared/websocket-types';
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
      const planId = message.payload.plan.id;
      logger.info('[App] Plan data received for plan %s with %d tasks, status %s',
        planId, message.payload.plan.tasks.length, message.payload.plan.status);

      // Find existing plan message with this id, or append new one
      setMessages(prev => {
        const planIndex = prev.findIndex(m => m.type === 'plan' && m.plan?.id === planId);

        if (planIndex !== -1) {
          // Update existing plan message
          const updated = [...prev];
          updated[planIndex] = {
            ...updated[planIndex],
            plan: message.payload.plan
          };
          logger.info('[App] Updated existing plan message at index %d', planIndex);
          return updated;
        } else {
          // Append new plan message
          logger.info('[App] Creating new plan message for plan %s', planId);
          return [...prev, {
            type: 'plan',
            content: '',
            plan: message.payload.plan,
            timestamp: Date.now()
          }];
        }
      });
    };

    client.onCommand = (message: CommandMessage) => {
      if (message.payload.command === 'clear') {
        setMessages([]);
      }
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

  const handleCommand = (command: string) => {
    client.sendCommand(command);
    setInput('');
  };

  return (
    <Box flexDirection="column">
      <Text color="blue">🤖 CodeMate</Text>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput input={input} onInputChange={setInput} onSubmit={handleSubmit} onCommand={handleCommand} />
    </Box>
  );
};

export default App;
import { LLMResponseMessage, ToolCallMessage } from '@shared/websocket-types';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import { WebSocketClient } from '../websocket-client';
import { ChatInput } from './chat-input';
import { Message } from './message-item';
import { MessageList } from './message-list';

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
        content: `${message.payload.name}(${JSON.stringify(message.payload.args)})`,
        toolName: message.payload.name,
        timestamp: Date.now()
      }]);
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
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput input={input} onInputChange={setInput} onSubmit={handleSubmit} />
    </Box>
  );
};

export default App;
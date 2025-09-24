import { LLMResponseMessage } from '@shared/websocket-types';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';

import { WebSocketClient } from '../websocket-client';

const App = () => {
  const [client] = useState(() => new WebSocketClient('ws://localhost:3001'));
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    client.onLLMResponse = (message: LLMResponseMessage) => {
      setMessages(prev => [...prev, `🤖 ${message.payload.content}`]);
    };

    client.onError = (error: string) => {
      setMessages(prev => [...prev, `❌ ${error}`]);
    };
  }, []);

  const handleSubmit = () => {
    if (input.trim()) {
      setMessages(prev => [...prev, `> ${input}`]);
      client.sendUserInput(input);
      setInput('');
    }
  };

  return (
    <Box flexDirection="column">
      <Text color="blue">🤖 Claude Code CLI</Text>
      {messages.map((msg, i) => <Text key={i}>{msg}</Text>)}
      <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
    </Box>
  );
};

export default App;
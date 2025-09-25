import { Box, Text } from 'ink';

export interface Message {
  type: 'user' | 'ai' | 'error' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
}

interface MessageItemProps {
  message: Message;
  index: number;
}

export const MessageItem = ({ message, index }: MessageItemProps) => {
  switch (message.type) {
    case 'user':
      return (
        <Box key={index} marginBottom={1}>
          <Text color="green">&gt; </Text>
          <Text>{message.content}</Text>
        </Box>
      );
    case 'ai':
      return (
        <Box key={index} marginBottom={1} paddingLeft={2}>
          <Text color="cyan">🤖 </Text>
          <Text>{message.content}</Text>
        </Box>
      );
    case 'error':
      return (
        <Box key={index} marginBottom={1}>
          <Text color="red">❌ Error: </Text>
          <Text color="red">{message.content}</Text>
        </Box>
      );
    case 'tool':
      return (
        <Box key={index} marginBottom={1} paddingLeft={2}>
          <Text color="green">🔧 {message.toolName}</Text>
        </Box>
      );
    default:
      return (
        <Box key={index} marginBottom={1}>
          <Text>{message.content}</Text>
        </Box>
      );
  }
};
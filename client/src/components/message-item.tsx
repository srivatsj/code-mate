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
      if (message.content.includes('(') && message.content.includes(')')) {
        // Tool call
        return (
          <Box key={index} marginBottom={1}>
            <Text color="green">● {message.content}</Text>
          </Box>
        );
      } else {
        // Tool result - indented under the tool call
        const lines = message.content.split('\n');
        const lineCount = lines.length;
        const isExpandable = lineCount > 3;

        return (
          <Box key={index} marginBottom={1} paddingLeft={2} flexDirection="column">
            <Text color="gray">├ Read {lineCount} lines {isExpandable ? '(ctrl+o to expand)' : ''}</Text>
            {lines.slice(0, 3).map((line, i) => (
              <Text key={i} color="white">  {line}</Text>
            ))}
            {isExpandable && <Text color="gray">  ... +{lineCount - 3} lines (ctrl+o to expand)</Text>}
          </Box>
        );
      }
    default:
      return (
        <Box key={index} marginBottom={1}>
          <Text>{message.content}</Text>
        </Box>
      );
  }
};
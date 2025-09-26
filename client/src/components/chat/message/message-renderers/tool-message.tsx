import { Box, Text } from 'ink';

import { MessageItemProps } from '../message-types';

export const ToolMessage = ({ message, index }: MessageItemProps) => {
  if (message.content.includes('(') && message.content.includes(')')) {
    return (
      <Box key={index} marginBottom={1}>
        <Text color="green">● {message.content}</Text>
      </Box>
    );
  }

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
};
import { Box, Text } from 'ink';

import { MessageItemProps } from '../message-types';

export const AiMessage = ({ message, index }: MessageItemProps) => (
  <Box key={index} marginBottom={1} paddingLeft={2}>
    <Text color="cyan">🤖 </Text>
    <Text>{message.content}</Text>
  </Box>
);
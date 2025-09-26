import { Box, Text } from 'ink';

import { MessageItemProps } from '../message-types';

export const UserMessage = ({ message, index }: MessageItemProps) => (
  <Box key={index} marginBottom={1}>
    <Text color="green">&gt; </Text>
    <Text>{message.content}</Text>
  </Box>
);
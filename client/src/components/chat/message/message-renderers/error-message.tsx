import { Box, Text } from 'ink';

import { MessageItemProps } from '../message-types';

export const ErrorMessage = ({ message, index }: MessageItemProps) => (
  <Box key={index} marginBottom={1}>
    <Text color="red">❌ Error: </Text>
    <Text color="red">{message.content}</Text>
  </Box>
);
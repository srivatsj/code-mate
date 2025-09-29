import { Box, Text } from 'ink';

import { useCountdown } from '../../../../hooks/useCountdown';
import { MessageItemProps } from '../message-types';

const RetryMessage = ({ content }: { content: string }) => {
  const match = content.match(/Retrying in (\d+) seconds/);
  if (!match) return <Text>{content}</Text>;

  const countdown = useCountdown(parseInt(match[1]));
  return <Text>{content.replace(/\d+ seconds/, `${countdown} seconds`)}</Text>;
};

export const AiMessage = ({ message, index }: MessageItemProps) => (
  <Box key={index} marginBottom={1} paddingLeft={2}>
    <Text color="cyan">🤖 </Text>
    {message.content.includes('Retrying in') ?
      <RetryMessage content={message.content} /> :
      <Text>{message.content}</Text>
    }
  </Box>
);
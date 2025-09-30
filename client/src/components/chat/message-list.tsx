import { Box } from 'ink';

import { LoadingIndicator } from '../ui/loading-indicator';
import { MessageItem } from './message/message-item';
import { Message } from './message/message-types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => {
  return (
    <>
      {messages.map((message, index) => (
        <Box key={index} flexDirection="column">
          <MessageItem message={message} index={index} />
        </Box>
      ))}
      <LoadingIndicator isLoading={isLoading} />
    </>
  );
};
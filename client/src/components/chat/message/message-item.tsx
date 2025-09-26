import { Box, Text } from 'ink';

import { AiMessage } from './message-renderers/ai-message';
import { ErrorMessage } from './message-renderers/error-message';
import { ToolMessage } from './message-renderers/tool-message';
import { UserMessage } from './message-renderers/user-message';
import { MessageItemProps } from './message-types';

export const MessageItem = ({ message, index }: MessageItemProps) => {
  switch (message.type) {
    case 'user':
      return <UserMessage message={message} index={index} />;
    case 'ai':
      return <AiMessage message={message} index={index} />;
    case 'error':
      return <ErrorMessage message={message} index={index} />;
    case 'tool':
      return <ToolMessage message={message} index={index} />;
    default:
      return (
        <Box key={index} marginBottom={1}>
          <Text>{message.content}</Text>
        </Box>
      );
  }
};
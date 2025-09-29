import { Plan } from '@shared/websocket-types';
import { Box } from 'ink';

import { PlanDisplay } from '../plan/plan-display';
import { LoadingIndicator } from '../ui/loading-indicator';
import { MessageItem } from './message/message-item';
import { Message } from './message/message-types';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  plan: Plan | null;
}

export const MessageList = ({ messages, isLoading, plan }: MessageListProps) => {
  // Find the last user message index
  const lastUserMessageIndex = messages.map((msg, index) => msg.type === 'user' ? index : -1)
    .filter(index => index !== -1)
    .pop();

  return (
    <>
      {messages.map((message, index) => {
        const isLastUserMessage = index === lastUserMessageIndex;
        return (
          <Box key={index} flexDirection="column">
            <MessageItem message={message} index={index} />
            {isLastUserMessage && plan && <PlanDisplay plan={plan} />}
          </Box>
        );
      })}
      <LoadingIndicator isLoading={isLoading} />
    </>
  );
};
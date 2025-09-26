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
        <MessageItem key={index} message={message} index={index} />
      ))}
      <LoadingIndicator isLoading={isLoading} />
    </>
  );
};
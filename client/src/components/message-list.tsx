import { LoadingIndicator } from './loading-indicator';
import { Message, MessageItem } from './message-item';

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
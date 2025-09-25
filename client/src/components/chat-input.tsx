import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export const ChatInput = ({ input, onInputChange, onSubmit }: ChatInputProps) => {
  return (
    <Box marginTop={1}>
      <Text color="green">&gt; </Text>
      <TextInput value={input} onChange={onInputChange} onSubmit={onSubmit} />
    </Box>
  );
};
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onCommand: (command: string) => void;
}

export const ChatInput = ({ input, onInputChange, onSubmit, onCommand }: ChatInputProps) => {
  const handleSubmit = () => {
    if (input.startsWith('/')) {
      const command = input.slice(1).trim();
      onCommand(command);
    } else {
      onSubmit();
    }
  };

  return (
    <Box marginTop={1}>
      <Text color="green">&gt; </Text>
      <TextInput value={input} onChange={onInputChange} onSubmit={handleSubmit} />
    </Box>
  );
};
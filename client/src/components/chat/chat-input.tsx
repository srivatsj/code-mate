import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useEffect, useState } from 'react';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onCommand: (command: string) => void;
}

const AVAILABLE_COMMANDS = [
  { name: 'clear', description: 'Clear conversation history' },
  { name: 'compact', description: 'Summarize and clear conversation' }
];

export const ChatInput = ({ input, onInputChange, onSubmit, onCommand }: ChatInputProps) => {
  const [suggestions, setSuggestions] = useState<typeof AVAILABLE_COMMANDS>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (input.startsWith('/')) {
      const query = input.slice(1).toLowerCase();
      if (query.length === 0) {
        setSuggestions(AVAILABLE_COMMANDS);
      } else {
        const filtered = AVAILABLE_COMMANDS.filter(cmd =>
          cmd.name.toLowerCase().startsWith(query)
        );
        setSuggestions(filtered);
      }
      setSelectedIndex(0); // Reset selection when suggestions change
    } else {
      setSuggestions([]);
      setSelectedIndex(0);
    }
  }, [input]);

  useInput((_input, key) => {
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (key.tab) {
        // Autocomplete with selected suggestion
        onInputChange(`/${suggestions[selectedIndex].name}`);
      }
    }
  });

  const handleSubmit = () => {
    if (input.startsWith('/')) {
      const command = input.slice(1).trim();
      onCommand(command);
    } else {
      onSubmit();
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginTop={1}>
        <Text color="green">&gt; </Text>
        <TextInput value={input} onChange={onInputChange} onSubmit={handleSubmit} />
      </Box>
      {suggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1} paddingLeft={2}>
          <Text color="gray" dimColor>Available commands:</Text>
          {suggestions.map((cmd, index) => (
            <Box key={cmd.name}>
              <Text color={index === selectedIndex ? 'green' : 'cyan'} bold={index === selectedIndex}>
                {index === selectedIndex ? '› ' : '  '}
                /{cmd.name}
              </Text>
              <Text color="gray" dimColor> - {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

interface LoadingIndicatorProps {
  isLoading: boolean;
}

export const LoadingIndicator = ({ isLoading }: LoadingIndicatorProps) => {
  const [loadingWordIndex, setLoadingWordIndex] = useState(0);
  const loadingWords = ['Thinking', 'Processing', 'Analyzing', 'Working'];

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingWordIndex(prev => (prev + 1) % loadingWords.length);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <Box marginBottom={1} paddingLeft={2}>
      <Text color="cyan">🤖 {loadingWords[loadingWordIndex]}...</Text>
    </Box>
  );
};
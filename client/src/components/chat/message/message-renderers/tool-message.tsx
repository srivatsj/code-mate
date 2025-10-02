import { BashArgs, EditArgs, GlobArgs, GrepArgs, ReadFileArgs, WriteFileArgs } from '@shared/websocket-types';
import { Box, Text } from 'ink';

import { MessageItemProps } from '../message-types';

export const ToolMessage = ({ message, index }: MessageItemProps) => {
  const { toolName, toolArgs } = message;

  if (!toolName || !toolArgs) {
    // Fallback for malformed messages
    return (
      <Box key={index} marginBottom={1}>
        <Text color="gray">● {message.content}</Text>
      </Box>
    );
  }

  const renderWriteFile = (args: WriteFileArgs) => {
    const fileName = args.path.split('/').pop() || args.path;
    const lineCount = args.content.split('\n').length;
    return (
      <Box flexDirection="column">
        <Text color="blue">Create({args.path})</Text>
        <Text color="gray">  ⎿  Created {fileName} with {lineCount} lines</Text>
      </Box>
    );
  };

  const renderReadFile = (args: ReadFileArgs) => (
    <Box flexDirection="column">
      <Text color="blue">Read({args.path})</Text>
      <Text color="gray">  ⎿  Read file contents</Text>
    </Box>
  );

  const renderBash = (args: BashArgs) => (
    <Box flexDirection="column">
      <Text color="blue">Bash({args.command})</Text>
      <Text color="gray">  ⎿  {args.description || args.command}</Text>
    </Box>
  );

  const renderEdit = (args: EditArgs) => {
    const fileName = args.path.split('/').pop() || args.path;
    return (
      <Box flexDirection="column">
        <Text color="blue">Edit({args.path})</Text>
        <Text color="gray">  ⎿  Modified {fileName}</Text>
      </Box>
    );
  };

  const renderGlob = (args: GlobArgs) => (
    <Box flexDirection="column">
      <Text color="blue">Glob({args.pattern})</Text>
      <Text color="gray">  ⎿  Finding files matching pattern</Text>
    </Box>
  );

  const renderGrep = (args: GrepArgs) => (
    <Box flexDirection="column">
      <Text color="blue">Grep({args.pattern})</Text>
      <Text color="gray">  ⎿  Searching for pattern{args.path ? ` in ${args.path}` : ''}</Text>
    </Box>
  );

  const renderGeneric = () => (
    <Box flexDirection="column">
      <Text color="blue">{toolName}</Text>
    </Box>
  );

  return (
    <Box key={index} marginBottom={1}>
      <Text color="green">● </Text>
      {toolName === 'write_file' && renderWriteFile(toolArgs as WriteFileArgs)}
      {toolName === 'read_file' && renderReadFile(toolArgs as ReadFileArgs)}
      {toolName === 'bash' && renderBash(toolArgs as BashArgs)}
      {toolName === 'edit' && renderEdit(toolArgs as EditArgs)}
      {toolName === 'glob' && renderGlob(toolArgs as GlobArgs)}
      {toolName === 'grep' && renderGrep(toolArgs as GrepArgs)}
      {!['write_file', 'read_file', 'bash', 'edit', 'glob', 'grep'].includes(toolName) && renderGeneric()}
    </Box>
  );
};
import { Plan, TaskStatus } from '@shared/websocket-types';
import { Box, Text } from 'ink';

interface PlanDisplayProps {
  plan: Plan | null;
}

const TaskIcon = ({ status }: { status: TaskStatus }) => {
  switch (status) {
    case TaskStatus.PENDING:
      return <Text color="gray">○</Text>;
    case TaskStatus.IN_PROGRESS:
      return <Text color="yellow">●</Text>;
    case TaskStatus.COMPLETED:
      return <Text color="green">✓</Text>;
    default:
      return <Text color="gray">○</Text>;
  }
};

export const PlanDisplay = ({ plan }: PlanDisplayProps) => {
  if (!plan || plan.tasks.length === 0) {
    return null;
  }

  const completedTasks = plan.tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
  const totalTasks = plan.tasks.length;

  return (
    <Box flexDirection="column" paddingY={1} borderStyle="round" borderColor="blue">
      <Box>
        <Text color="blue" bold>📋 Plan Progress </Text>
        <Text color="gray">({completedTasks}/{totalTasks})</Text>
      </Box>

      {plan.description && (
        <Box paddingLeft={1}>
          <Text color="cyan">{plan.description}</Text>
        </Box>
      )}

      <Box flexDirection="column" paddingLeft={1}>
        {plan.tasks.map((task, index) => (
          <Box key={task.id}>
            <Text color={task.status === TaskStatus.COMPLETED ? 'gray' : 'gray'}>{index + 1}. </Text>
            <TaskIcon status={task.status} />
            <Text
              color={task.status === TaskStatus.COMPLETED ? 'gray' : 'white'}
              strikethrough={task.status === TaskStatus.COMPLETED}
              dimColor={task.status === TaskStatus.COMPLETED}
            >
              {' '}{task.description}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
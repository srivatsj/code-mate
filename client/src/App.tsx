import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import React from 'react';

const App: React.FC = () => {
	return (
		<Box flexDirection="column" padding={1}>
			<BigText
				text="codemate"
				font="block"
				colors={['cyan', 'magenta']}
			/>
			<Box marginTop={1}>
				<Text color="gray">Your AI coding companion</Text>
			</Box>
		</Box>
	);
};

export default App;
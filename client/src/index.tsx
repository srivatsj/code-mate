import { render } from 'ink';
import React from 'react';

import App from './components/app.js';
import Welcome from './components/welcome-message.js';

render(
	<>
		<Welcome />
		<App />
	</>
);
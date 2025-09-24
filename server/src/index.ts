import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';

import { WebSocketServerHandler } from './websocket-server';

const app = new Hono();

// HTTP route
app.get('/', (c) => c.text('Hello Hono + WebSocket!'));

// Start WebSocket server on the same HTTP server
const port = 3000;

serve({
  fetch: app.fetch,
  port
});

const wss = new WebSocketServer({ port: port + 1 });
new WebSocketServerHandler(wss);
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';

import logger from './common/logger';
import { WebSocketServerHandler } from './websocket-server';

const app = new Hono();

// HTTP route
app.get('/', (c) => {
  logger.info('Health check request');
  return c.text('Hello Hono + WebSocket!');
});

// Start WebSocket server on the same HTTP server
const port = 3000;

logger.info('Starting HTTP server on port %d', port);
serve({
  fetch: app.fetch,
  port
});

logger.info('Starting WebSocket server on port %d', port + 1);
const wss = new WebSocketServer({ port: port + 1 });
new WebSocketServerHandler(wss);
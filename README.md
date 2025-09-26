# Code Mate

An AI-powered coding assistant that provides intelligent code suggestions, explanations, and optimizations through a terminal interface.

## Overview

Code Mate consists of a **terminal client** built with Ink/React and a **WebSocket server** powered by Hono that integrates with Google's Gemini AI model. The assistant communicates in real-time through WebSocket connections, offering both server-side and client-side tool execution capabilities.

## Architecture

- **Client**: Terminal UI using Ink and React for interactive coding sessions
- **Server**: Hono-based WebSocket server with AI service integration
- **Shared**: Common types and utilities across client/server

## Key Features

- Real-time AI assistance through terminal interface
- WebSocket-based communication for responsive interactions
- Tool execution on both client and server sides
- Conversation history management
- Google Gemini AI integration for code understanding and generation

## Quick Start

```bash
pnpm install
pnpm dev
```

## Requirements

- Node.js
- PNPM package manager
- Google Generative AI API key

## Tech Stack

- **Frontend**: Ink, React, TypeScript
- **Backend**: Hono, WebSockets, Google AI SDK
- **Tooling**: PNPM workspace, ESLint
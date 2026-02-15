#!/usr/bin/env node

/**
 * Standalone REST API server for one-search-mcp
 * Provides easy-to-use HTTP endpoints for search, scrape, map, and extract operations
 *
 * Note: For unified MCP + API server, use the main server with streamable-http mode:
 *   npx one-search-mcp streamable-http --port 8000
 */

import express from 'express';
import cors from 'cors';
import { createApiRouter } from './api-routes.js';
import { getApiPort, getSearchConfig } from './config.js';
import { SERVER } from './constants.js';
import dotenvx from '@dotenvx/dotenvx';

// Load environment variables
dotenvx.config({ quiet: true });

const app = express();
const PORT = getApiPort();

// Middleware
app.use(cors());
app.use(express.json({ limit: SERVER.MAX_REQUEST_SIZE }));

// Logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mount API routes
app.use('/api', createApiRouter());

// Root redirect
app.get('/', (_req, res) => {
  res.redirect('/api/info');
});

// Health check at root level too
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: SERVER.DEFAULT_VERSION,
    mode: 'api-only',
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n┌─────────────────────────────────────────────┐');
  console.log('│  OneSearch API Server (API-only mode)     │');
  console.log('└─────────────────────────────────────────────┘\n');
  console.log(`  Port: ${PORT}`);
  console.log(`  Provider: ${getSearchConfig().provider}\n`);
  console.log('  Endpoints:');
  console.log(`    POST http://localhost:${PORT}/api/tools/search`);
  console.log(`    POST http://localhost:${PORT}/api/tools/scrape`);
  console.log(`    POST http://localhost:${PORT}/api/tools/map`);
  console.log(`    POST http://localhost:${PORT}/api/tools/extract`);
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    GET  http://localhost:${PORT}/api/info\n`);
  console.log(`  Server ready at http://localhost:${PORT}\n`);
});

export default app;

#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { ISearchRequestOptions, ISearchResponse, SearchProvider } from './interface.js';
import { bingSearch, duckDuckGoSearch, searxngSearch, tavilySearch, localSearch, googleSearch, zhipuSearch, exaSearch, bochaSearch } from './search/index.js';
import { SEARCH_TOOL, EXTRACT_TOOL, SCRAPE_TOOL, MAP_TOOL } from './tools.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { AgentBrowser } from './libs/agent-browser/index.js';
import { InMemoryEventStore } from './eventStore.js';
import { createApiRouter } from './api-routes.js';
import dotenvx from '@dotenvx/dotenvx';
import { SafeSearchType } from 'duck-duck-scrape';

// Load environment variables silently (suppress all output)
dotenvx.config({ quiet: true });

// Helper function to get current search configuration
// This allows dynamic configuration from HTTP headers in streamable-http mode
function getSearchConfig() {
  return {
    provider: (process.env.SEARCH_PROVIDER as SearchProvider) ?? 'local',
    apiUrl: process.env.SEARCH_API_URL,
    apiKey: process.env.SEARCH_API_KEY,
  };
}

// search query params
const SAFE_SEARCH = process.env.SAFE_SEARCH ?? 0;
const LIMIT = process.env.LIMIT ?? 10;
const CATEGORIES = process.env.CATEGORIES ?? 'general';
const ENGINES = process.env.ENGINES ?? 'all';
const FORMAT = process.env.FORMAT ?? 'json';
const LANGUAGE = process.env.LANGUAGE ?? 'auto';
const TIME_RANGE = process.env.TIME_RANGE ?? '';
const USER_AGENT = process.env.SEARCH_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Helper function to get search configuration with dynamic values
function getSearchDefaultConfig() {
  return {
    limit: Number(process.env.LIMIT ?? LIMIT),
    categories: process.env.CATEGORIES ?? CATEGORIES,
    format: process.env.FORMAT ?? FORMAT,
    safesearch: process.env.SAFE_SEARCH ?? SAFE_SEARCH,
    language: process.env.LANGUAGE ?? LANGUAGE,
    engines: process.env.ENGINES ?? ENGINES,
    time_range: process.env.TIME_RANGE ?? TIME_RANGE,
    timeout: process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 10000,
    userAgent: process.env.SEARCH_USER_AGENT ?? USER_AGENT,
  };
}

// Factory function to create a new MCP server instance
// This is called for each session in streamable-http mode
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'one-search-mcp',
      version: '1.2.0',
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    },
  );

  // Helper function to wrap tool handlers with logging and error handling
  function createToolHandler<TInput, TOutput>(
    toolName: string,
    handler: (args: TInput) => Promise<TOutput>,
  ) {
    return async (args: TInput) => {
      const startTime = Date.now();

      try {
        await server.sendLoggingMessage({
          level: 'info',
          data: `[${new Date().toISOString()}] Request started for tool: [${toolName}]`,
        });

        const result = await handler(args);

        await server.sendLoggingMessage({
          level: 'info',
          data: `[${new Date().toISOString()}] Request completed in ${Date.now() - startTime}ms`,
        });

        return result;
    } catch (error) {
      await server.sendLoggingMessage({
        level: 'error',
        data: `[${new Date().toISOString()}] Error in ${toolName}: ${error}`,
      });
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text' as const,
            text: msg,
          },
        ],
        isError: true,
      };
    }
  };
}

// Register tools using the new registerTool API
server.registerTool(
  SEARCH_TOOL.name,
  {
    description: SEARCH_TOOL.description,
    inputSchema: SEARCH_TOOL.schema,
  },
  createToolHandler(SEARCH_TOOL.name, async (args: SearchInput) => {
    const config = getSearchConfig();

    // Send progress notification: search started
    await server.sendLoggingMessage({
      level: 'info',
      data: `[${new Date().toISOString()}] Search started: query="${args.query}", provider=${config.provider}`,
    });

    const { results, success } = await processSearch({
      ...args,
      apiKey: config.apiKey ?? '',
      apiUrl: config.apiUrl,
    });

    if (!success) {
      await server.sendLoggingMessage({
        level: 'error',
        data: `[${new Date().toISOString()}] Search failed`,
      });
      throw new Error('Failed to search');
    }

    // Send progress notification: search completed
    await server.sendLoggingMessage({
      level: 'info',
      data: `[${new Date().toISOString()}] Search completed: ${results.length} results found`,
    });

    const resultsText = results.map((result) => (
      `Title: ${result.title}
URL: ${result.url}
Description: ${result.snippet}
${result.markdown ? `Content: ${result.markdown}` : ''}`
    ));

    return {
      content: [
        {
          type: 'text' as const,
          text: resultsText.join('\n\n'),
        },
      ],
    };
  }),
);

server.registerTool(
  SCRAPE_TOOL.name,
  {
    description: SCRAPE_TOOL.description,
    inputSchema: SCRAPE_TOOL.schema,
  },
  createToolHandler(SCRAPE_TOOL.name, async (args: ScrapeInput) => {
    const { url, ...scrapeArgs } = args;
    const { content } = await processScrape(url, scrapeArgs);

    return {
      content,
    };
  }),
);

server.registerTool(
  MAP_TOOL.name,
  {
    description: MAP_TOOL.description,
    inputSchema: MAP_TOOL.schema,
  },
  createToolHandler(MAP_TOOL.name, async (args: MapInput) => {
    const { content } = await processMapUrl(args.url, args);

    return {
      content,
    };
  }),
);

server.registerTool(
  EXTRACT_TOOL.name,
  {
    description: EXTRACT_TOOL.description,
    inputSchema: EXTRACT_TOOL.schema,
  },
  createToolHandler(EXTRACT_TOOL.name, async (args: ExtractInput) => {
    const { content } = await processExtract(args);

    return {
      content,
    };
  }),
);

  return server;
}

// Business logic functions
async function processSearch(args: ISearchRequestOptions): Promise<ISearchResponse> {
  const config = getSearchConfig();
  switch (config.provider) {
    case 'searxng': {
      // merge default config with args
      const defaultConfig = getSearchDefaultConfig();
      const params = {
        ...defaultConfig,
        ...args,
        apiKey: config.apiKey,
      };

      // but categories and language have higher priority (ENV > args).
      const { categories, language } = defaultConfig;

      if (categories) {
        params.categories = categories;
      }
      if (language) {
        params.language = language;
      }
      return await searxngSearch(params);
    }
    case 'tavily': {
      return await tavilySearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
      });
    }
    case 'bing': {
      return await bingSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
      });
    }
    case 'duckduckgo': {
      const safeSearch = args.safeSearch ?? 0;
      const safeSearchOptions = [SafeSearchType.STRICT, SafeSearchType.MODERATE, SafeSearchType.OFF];
      return await duckDuckGoSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
        safeSearch: safeSearchOptions[safeSearch],
      });
    }
    case 'local': {
      return await localSearch({
        ...getSearchDefaultConfig(),
        ...args,
      });
    }
    case 'google': {
      return await googleSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
      });
    }
    case 'zhipu': {
      return await zhipuSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
      });
    }
    case 'exa': {
      return await exaSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
      });
    }
    case 'bocha': {
      return await bochaSearch({
        ...getSearchDefaultConfig(),
        ...args,
        apiKey: config.apiKey,
      });
    }
    default:
      throw new Error(`Unsupported search provider: ${config.provider}`);
  }
}

async function processScrape(url: string, args: Omit<ScrapeInput, 'url'>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: any;
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const res = await browser.scrapeUrl(url, args);

    if (!res.success) {
      throw new Error(`Failed to scrape: ${res.error}`);
    }

    const content: string[] = [];

    if (res.markdown) {
      content.push(res.markdown);
    }

    if (res.rawHtml) {
      content.push(res.rawHtml);
    }

    if (res.links) {
      content.push(res.links.join('\n'));
    }

    if (res.screenshot) {
      content.push(res.screenshot);
    }

    if (res.html) {
      content.push(res.html);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: content.join('\n\n') || 'No content found',
        },
      ],
      result: res,
      success: true,
    };
  } finally {
    await browser.close();
  }
}

async function processMapUrl(url: string, args: Omit<MapInput, 'url'>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  result: string[];
  success: boolean;
}> {
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const res = await browser.mapUrl(url, args);

    if (!res.success) {
      throw new Error(`Failed to map: ${res.error}`);
    }

    if (!res.links) {
      throw new Error(`No links found from: ${url}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: res.links.join('\n').trim(),
        },
      ],
      result: res.links,
      success: true,
    };
  } finally {
    await browser.close();
  }
}

async function processExtract(args: ExtractInput): Promise<{
  content: Array<{ type: 'text'; text: string }>;
}> {
  const { urls, prompt, systemPrompt, schema } = args;
  const browser = new AgentBrowser({
    headless: true,
    timeout: 30000,
  });

  try {
    const results: string[] = [];

    // Extract content from each URL
    for (const url of urls) {
      try {
        const res = await browser.scrapeUrl(url, {
          formats: ['markdown'],
          onlyMainContent: true,
        });

        if (res.success && res.markdown) {
          results.push(`## Content from ${url}\n\n${res.markdown}`);
        } else {
          results.push(`## Failed to extract from ${url}\n\nError: ${res.error || 'Unknown error'}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push(`## Failed to extract from ${url}\n\nError: ${errorMsg}`);
      }
    }

    let finalText = results.join('\n\n---\n\n');

    // Add extraction instructions if provided
    if (prompt || systemPrompt || schema) {
      const instructions: string[] = [];

      if (systemPrompt) {
        instructions.push(`System Instructions: ${systemPrompt}`);
      }

      if (prompt) {
        instructions.push(`Extraction Task: ${prompt}`);
      }

      if (schema) {
        instructions.push(`Expected Schema:\n${JSON.stringify(schema, null, 2)}`);
      }

      finalText = `${instructions.join('\n\n')}\n\n---\n\nExtracted Content:\n\n${finalText}`;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: finalText,
        },
      ],
    };
  } finally {
    await browser.close();
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const portArg = args.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : 8000;

  return { mode, port };
}

// Helper to check if request is initialize
const isInitializeRequest = (body: unknown): boolean => {
  return typeof body === 'object' && body !== null && 'method' in body && (body as { method: string }).method === 'initialize';
};

async function runServer(): Promise<void> {
  const { mode, port } = parseArgs();

  try {
    if (mode === 'streamable-http' || mode === 'http') {
      // Run in Streamable HTTP mode with session management
      // Store transports and servers by session ID
      const transports: { [sessionId: string]: WebStandardStreamableHTTPServerTransport } = {};
      const servers: { [sessionId: string]: McpServer } = {};
      const sessionLastActive: { [sessionId: string]: number } = {};
      const keepAliveTimers = new Map<string, NodeJS.Timeout>();

      // Session timeout in milliseconds (default: 10 minutes, configurable via SESSION_TIMEOUT_MINUTES)
      const SESSION_TIMEOUT_MINUTES = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '10', 10);
      const SESSION_TIMEOUT = SESSION_TIMEOUT_MINUTES * 60 * 1000;

      process.stderr.write(`Session timeout: ${SESSION_TIMEOUT_MINUTES} minutes\n`);

      // Start SSE keep-alive for a session
      // Sends SSE comment (`: keep-alive\n\n`) every 25 seconds to prevent
      // proxies/load balancers from timing out idle SSE connections (typically 60s).
      // SDK's _streamMapping: Map<StreamId, { controller, encoder, cleanup }>
      const startKeepAlive = (sessionId: string, transport: WebStandardStreamableHTTPServerTransport) => {
        const timer = setInterval(() => {
          try {
            const transportAny = transport as any;
            const streamMapping = transportAny._streamMapping as Map<string, any> | undefined;
            if (!streamMapping || streamMapping.size === 0) {
              return; // No active streams, nothing to keep alive
            }

            const encoder = new TextEncoder();
            const keepAliveData = encoder.encode(': keep-alive\n\n');

            for (const [streamId, stream] of streamMapping) {
              if (stream?.controller) {
                try {
                  stream.controller.enqueue(keepAliveData);
                  process.stderr.write(`[${new Date().toISOString()}] ♥ Keep-alive sent to stream: ${streamId} (session: ${sessionId})\n`);
                } catch {
                  // Stream already closed, ignore
                }
              }
            }
          } catch (error) {
            process.stderr.write(`[${new Date().toISOString()}] Keep-alive error for session ${sessionId}: ${error}\n`);
          }
        }, 25000); // 25 seconds (well under typical 60s proxy timeout)

        keepAliveTimers.set(sessionId, timer);
        process.stderr.write(`[${new Date().toISOString()}] Keep-alive timer started for session: ${sessionId} (interval: 25s)\n`);
      };

      // Helper to clean up a specific session
      const cleanupSession = async (sessionId: string) => {
        // Extract references before deleting from maps to prevent re-entry
        const transport = transports[sessionId];
        const server = servers[sessionId];
        const hasLastActive = !!sessionLastActive[sessionId];

        // Clear keep-alive timer first
        const timer = keepAliveTimers.get(sessionId);
        if (timer) {
          clearInterval(timer);
          keepAliveTimers.delete(sessionId);
          process.stderr.write(`[${new Date().toISOString()}] Keep-alive timer cleared for session: ${sessionId}\n`);
        }

        // Delete from maps first to prevent infinite recursion via onclose
        if (transport) {
          process.stderr.write(`[${new Date().toISOString()}] Cleaning up session: ${sessionId}\n`);
          delete transports[sessionId];
        }
        if (server) {
          delete servers[sessionId];
        }
        if (hasLastActive) {
          delete sessionLastActive[sessionId];
        }

        // Close transport FIRST to cleanup SSE streams and pending responses
        if (transport) {
          try {
            await transport.close();
          } catch (error) {
            process.stderr.write(`  Warning: Error closing transport for session ${sessionId}: ${error}\n`);
          }
        }

        // Then close the server (this may trigger onclose, but won't loop)
        if (server) {
          try {
            server.close();
          } catch (error) {
            process.stderr.write(`  Warning: Error closing server for session ${sessionId}: ${error}\n`);
          }
        }
      };

      // Periodic cleanup of inactive sessions
      const cleanupInterval = setInterval(async () => {
        const now = Date.now();
        const inactiveSessions: string[] = [];

        for (const [sessionId, lastActive] of Object.entries(sessionLastActive)) {
          if (now - lastActive > SESSION_TIMEOUT) {
            inactiveSessions.push(sessionId);
          }
        }

        if (inactiveSessions.length > 0) {
          process.stderr.write(`[${new Date().toISOString()}] Cleaning up ${inactiveSessions.length} inactive session(s)\n`);
          for (const sessionId of inactiveSessions) {
            await cleanupSession(sessionId);
          }
        }
      }, 60 * 1000); // Check every minute

      // Helper to convert Node.js request to Web Standard Request
      const toWebRequest = (req: any, body?: unknown): Request => {
        const url = `http://${req.headers.host || 'localhost'}${req.url || '/'}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value) {
            headers.set(key, Array.isArray(value) ? value[0] : value as string);
          }
        }

        const init: RequestInit = {
          method: req.method,
          headers,
        };

        if (body !== undefined) {
          const bodyString = JSON.stringify(body);
          init.body = bodyString;
          // Update Content-Length and Content-Type for reconstructed body
          headers.set('content-type', 'application/json');
          headers.set('content-length', Buffer.byteLength(bodyString, 'utf8').toString());
        }

        return new Request(url, init);
      };

      // Helper to send Web Standard Response to Node.js response
      const sendWebResponse = async (webRes: Response, res: any) => {
        res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));

        if (webRes.body) {
          const reader = webRes.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          } finally {
            reader.releaseLock();
          }
        }

        res.end();
      };

      // Parse JSON body
      const parseBody = async (req: any): Promise<unknown> => {
        // If Express already parsed the body, use it directly
        if (req.body && typeof req.body === 'object') {
          const bodyStr = JSON.stringify(req.body);
          process.stderr.write(`  Body (pre-parsed by Express, ${bodyStr.length} bytes): ${bodyStr.substring(0, 200)}${bodyStr.length > 200 ? '...' : ''}\n`);
          return req.body;
        }

        // Otherwise, read from stream
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(chunk as Buffer);
        }
        const body = Buffer.concat(chunks).toString();
        process.stderr.write(`  Raw body (${body.length} bytes): ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}\n`);
        try {
          return JSON.parse(body);
        } catch (error) {
          process.stderr.write(`  JSON parse error: ${error instanceof Error ? error.message : String(error)}\n`);
          return null;
        }
      };

      // Create Express app for combined MCP + REST API server
      const app = express();

      // Middleware
      app.use(cors());
      app.use(express.json({ limit: '50mb' }));

      // Request logging middleware
      app.use((req, res, next) => {
        const startTime = Date.now();
        res.on('finish', () => {
          const duration = Date.now() - startTime;
          console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        });
        next();
      });

      // Mount REST API routes under /api
      app.use('/api', createApiRouter());

      // Health check (also available at root level)
      app.get('/health', (_req, res) => {
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.2.0',
          modes: ['mcp', 'api'],
        });
      });

      // MCP endpoint handler
      app.all('/mcp', async (req, res) => {

        // Get session ID from header (handle both string and array)
        const sessionIdRaw = req.headers['mcp-session-id'];
        const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw as string | undefined;

        // Debug logging
        process.stderr.write(`\n[${new Date().toISOString()}] ${req.method} ${req.url}\n`);
        process.stderr.write(`  Session ID: ${sessionId || 'none'}\n`);
        process.stderr.write(`  Accept: ${req.headers['accept']}\n`);
        process.stderr.write(`  Content-Type: ${req.headers['content-type'] || 'none'}\n`);
        process.stderr.write(`  Active sessions: ${Object.keys(transports).join(', ') || 'none'}\n`);

        try {

          let transport: WebStandardStreamableHTTPServerTransport;
          let webRequest: Request;

          if (sessionId && transports[sessionId]) {
            process.stderr.write(`  → Reusing existing session\n`);
            // Update last active timestamp
            sessionLastActive[sessionId] = Date.now();
            // Reuse existing transport for established sessions
            transport = transports[sessionId];

            // For GET requests, don't parse body
            if (req.method === 'GET') {
              webRequest = toWebRequest(req);
            } else {
              // For POST, parse body
              const parsedBody = await parseBody(req);
              webRequest = toWebRequest(req, parsedBody);
            }
          } else if (sessionId && !transports[sessionId]) {
            // Session ID provided but not found - session may have expired or been cleaned up
            process.stderr.write(`  ✗ Session not found: ${sessionId}\n`);
            process.stderr.write(`  Available sessions: ${Object.keys(transports).join(', ') || 'none'}\n`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: `Session not found: ${sessionId}. Session may have expired or been cleaned up.`
              },
              id: null,
            }));
            return;
          } else if (!sessionId && req.method === 'POST') {
            // Parse request body to check if it's an initialize request
            const parsedBody = await parseBody(req);

            if (!parsedBody) {
              process.stderr.write(`  ✗ Failed to parse request body\n`);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32700, message: 'Parse error: Invalid JSON in request body' },
                id: null,
              }));
              return;
            }

            if (isInitializeRequest(parsedBody)) {
              process.stderr.write(`  → Initialize request detected\n`);
              // Create new transport and server for initialization requests
              const mcpServer = createMcpServer();

              transport = new WebStandardStreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                eventStore: new InMemoryEventStore(),
                retryInterval: 2000,
                onsessioninitialized: (newSessionId: string) => {
                  transports[newSessionId] = transport;
                  servers[newSessionId] = mcpServer;
                  sessionLastActive[newSessionId] = Date.now();
                  // Start keep-alive timer for this session
                  startKeepAlive(newSessionId, transport);
                },
              });

              transport.onclose = () => {
                const sid = transport.sessionId;
                if (sid) {
                  // Fire-and-forget cleanup (already removed from maps to prevent infinite recursion)
                  cleanupSession(sid).catch(err => {
                    process.stderr.write(`  Warning: Error in onclose cleanup for session ${sid}: ${err}\n`);
                  });
                }
              };

              await mcpServer.connect(transport);

              // Create Web Standard Request with parsed body
              webRequest = toWebRequest(req, parsedBody);
              const webResponse = await transport.handleRequest(webRequest);

              // Get session ID from response headers and register BEFORE sending response
              const responseSessionId = webResponse.headers.get('mcp-session-id');

              if (responseSessionId) {
                transports[responseSessionId] = transport;
                servers[responseSessionId] = mcpServer;
                sessionLastActive[responseSessionId] = Date.now();
                process.stderr.write(`  → Session registered: ${responseSessionId}\n`);
              }

              // Send response AFTER registration
              await sendWebResponse(webResponse, res);
              process.stderr.write(`  ✓ Initialize response sent\n`);
              return;
            } else {
              // Not an initialize request and no session ID
              process.stderr.write(`  ✗ Not an initialize request and no session ID\n`);
              process.stderr.write(`  Request body: ${JSON.stringify(parsedBody)}\n`);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Bad Request: No valid session ID or not an initialize request' },
                id: null,
              }));
              return;
            }
          } else if (req.method === 'GET') {
            // GET request without session ID - MCP client checking for SSE support
            // Return 405 Method Not Allowed as per MCP spec (we don't support SSE streams)
            process.stderr.write(`  → GET request without session ID (SSE check)\n`);
            process.stderr.write(`  ← Returning 405 Method Not Allowed (no SSE support)\n`);
            res.writeHead(405, {
              'Content-Type': 'application/json',
              'Allow': 'POST',
            });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Method Not Allowed: SSE streams not supported. Use POST for stateless requests.',
              },
              id: null,
            }));
            return;
          } else {
            // Invalid request
            process.stderr.write(`  ✗ Invalid request: method=${req.method}, sessionId=${sessionId}\n`);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Bad Request: Invalid request' },
              id: null,
            }));
            return;
          }

          process.stderr.write(`  → Handling request via transport\n`);
          const webResponse = await transport.handleRequest(webRequest);
          process.stderr.write(`  ← Response status: ${webResponse.status}\n`);
          await sendWebResponse(webResponse, res);
          process.stderr.write(`  ✓ Response sent\n`);
        } catch (error) {
          process.stderr.write(`  ✗ ERROR: ${error instanceof Error ? error.message : String(error)}\n`);
          if (error instanceof Error && error.stack) {
            process.stderr.write(`  Stack: ${error.stack}\n`);
          }

          // Send error response if headers not yet sent
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Internal server error' },
              id: null,
            }));
          }
        }
      });

      // Create HTTP server from Express app
      const httpServer = createHttpServer(app);

      // Configure server timeouts to prevent session disconnections
      // Keep-alive timeout should be longer than typical idle periods
      httpServer.keepAliveTimeout = 120000; // 120 seconds
      // Headers timeout should be slightly longer than keep-alive timeout
      httpServer.headersTimeout = 125000; // 125 seconds
      // Request timeout for the entire request (0 = no timeout)
      httpServer.requestTimeout = 0;

      httpServer.listen(port, () => {
        process.stderr.write(`OneSearch MCP server (Streamable HTTP) listening on http://0.0.0.0:${port}\n`);
        process.stderr.write(`MCP Endpoint: http://0.0.0.0:${port}/mcp\n`);
        process.stderr.write(`REST API: http://0.0.0.0:${port}/api\n`);
      });

      // Handle shutdown gracefully
      const shutdown = async () => {
        process.stderr.write('\nShutting down...\n');

        // Clear cleanup interval
        clearInterval(cleanupInterval);

        // Clean up all active sessions
        const activeSessions = Object.keys(transports);
        if (activeSessions.length > 0) {
          process.stderr.write(`Cleaning up ${activeSessions.length} active session(s)...\n`);
          for (const sessionId of activeSessions) {
            await cleanupSession(sessionId);
          }
        }

        httpServer.close(() => {
          process.exit(0);
        });
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

    } else {
      // Default: Run in stdio mode
      // Create a single server instance for stdio
      const server = createMcpServer();

      // Do NOT write to stdout before connecting - it will break MCP protocol
      const transport = new StdioServerTransport();
      await server.connect(transport);

      // Now we can send logging messages through MCP protocol
      await server.sendLoggingMessage({
        level: 'info',
        data: 'OneSearch MCP server (stdio) started',
      });
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error starting server: ${msg}\n`);
    process.exit(1);
  }
}

// run server
runServer().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error running server: ${msg}\n`);
  process.exit(1);
});

// export types
export * from './interface.js';

#!/usr/bin/env node

/**
 * Simple REST API wrapper for one-search-mcp
 * Provides easy-to-use HTTP endpoints for search, scrape, map, and extract operations
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { bingSearch, duckDuckGoSearch, searxngSearch, tavilySearch, localSearch, googleSearch, zhipuSearch, exaSearch, bochaSearch } from './search/index.js';
import { AgentBrowser } from './libs/agent-browser/index.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { ISearchRequestOptions, SearchProvider } from './interface.js';
import dotenvx from '@dotenvx/dotenvx';

// Load environment variables
dotenvx.config({ quiet: true });

const app = express();
const PORT = process.env.API_PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Helper: Get search config from headers or env
function getSearchConfig(req: Request) {
  return {
    provider: (req.headers['x-search-provider'] as SearchProvider) || (process.env.SEARCH_PROVIDER as SearchProvider) || 'local',
    apiUrl: (req.headers['x-search-api-url'] as string) || process.env.SEARCH_API_URL,
    apiKey: (req.headers['x-search-api-key'] as string) || process.env.SEARCH_API_KEY,
    timeout: Number(req.headers['x-search-timeout']) || Number(process.env.TIMEOUT) || 30000,
    userAgent: (req.headers['x-user-agent'] as string) || process.env.SEARCH_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

// Helper: Process search based on provider
async function processSearch(args: SearchInput & { apiKey?: string; apiUrl?: string }, config: ReturnType<typeof getSearchConfig>) {
  const options: ISearchRequestOptions = {
    query: args.query,
    limit: args.limit || 10,
    categories: args.categories || 'general',
    language: args.language || 'auto',
    time_range: args.timeRange || '',
    timeout: config.timeout,
    userAgent: config.userAgent,
  };

  const searchFunctions = {
    searxng: () => searxngSearch({ ...options, apiUrl: config.apiUrl }),
    tavily: () => tavilySearch({ ...options, apiKey: config.apiKey || '' }),
    duckduckgo: () => duckDuckGoSearch(options),
    bing: () => bingSearch({ ...options, apiKey: config.apiKey || '' }),
    google: () => googleSearch({ ...options, apiKey: config.apiKey || '' }),
    exa: () => exaSearch({ ...options, apiKey: config.apiKey || '' }),
    zhipu: () => zhipuSearch({ ...options, apiKey: config.apiKey || '' }),
    bocha: () => bochaSearch({ ...options, apiKey: config.apiKey || '' }),
    local: () => localSearch(options),
  };

  const searchFn = searchFunctions[config.provider];
  if (!searchFn) {
    throw new Error(`Unknown search provider: ${config.provider}`);
  }

  return await searchFn();
}

// POST /api/tools/search
app.post('/api/tools/search', async (req: Request, res: Response) => {
  try {
    const args: SearchInput = req.body;
    const config = getSearchConfig(req);

    console.log(`[Search] query="${args.query}", provider=${config.provider}`);

    const { results, success } = await processSearch(args, config);

    if (!success || !results) {
      return res.status(500).json({
        error: 'Search failed',
        message: 'No results returned from search provider',
      });
    }

    res.json({
      results: results.map((r) => ({
        url: r.url,
        title: r.title,
        description: r.description || r.content,
        content: r.content,
      })),
      total: results.length,
      provider: config.provider,
    });
  } catch (error) {
    console.error('[Search Error]', error);
    res.status(500).json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/tools/scrape
app.post('/api/tools/scrape', async (req: Request, res: Response) => {
  try {
    const args: ScrapeInput = req.body;
    const config = getSearchConfig(req);

    console.log(`[Scrape] url="${args.url}", formats=${args.formats?.join(',') || 'markdown'}`);

    const browser = new AgentBrowser({
      userAgent: config.userAgent,
      headless: process.env.HEADLESS !== 'false',
      timeout: config.timeout,
    });

    await browser.init();

    try {
      const result = await browser.scrape({
        url: args.url,
        formats: args.formats || ['markdown'],
        onlyMainContent: args.onlyMainContent,
        includeTags: args.includeTags,
        excludeTags: args.excludeTags,
        waitFor: args.waitFor,
        timeout: args.timeout || config.timeout,
        actions: args.actions,
        extract: args.extract,
        location: args.location,
        mobile: args.mobile,
        removeBase64Images: args.removeBase64Images,
        skipTlsVerification: args.skipTlsVerification,
      });

      res.json({
        url: args.url,
        data: result,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[Scrape Error]', error);
    res.status(500).json({
      error: 'Scrape failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/tools/map
app.post('/api/tools/map', async (req: Request, res: Response) => {
  try {
    const args: MapInput = req.body;
    const config = getSearchConfig(req);

    console.log(`[Map] url="${args.url}", limit=${args.limit || 'unlimited'}`);

    const browser = new AgentBrowser({
      userAgent: config.userAgent,
      headless: process.env.HEADLESS !== 'false',
      timeout: config.timeout,
    });

    await browser.init();

    try {
      const result = await browser.map({
        url: args.url,
        search: args.search,
        ignoreSitemap: args.ignoreSitemap,
        sitemapOnly: args.sitemapOnly,
        includeSubdomains: args.includeSubdomains,
        limit: args.limit,
      });

      res.json({
        url: args.url,
        urls: result.urls || [],
        total: result.urls?.length || 0,
        source: args.sitemapOnly ? 'sitemap' : args.ignoreSitemap ? 'html' : 'sitemap+html',
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[Map Error]', error);
    res.status(500).json({
      error: 'Map failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/tools/extract
app.post('/api/tools/extract', async (req: Request, res: Response) => {
  try {
    const args: ExtractInput = req.body;
    const config = getSearchConfig(req);

    console.log(`[Extract] urls=${args.urls.length}, schema=${args.schema ? 'defined' : 'none'}`);

    const browser = new AgentBrowser({
      userAgent: config.userAgent,
      headless: process.env.HEADLESS !== 'false',
      timeout: config.timeout,
    });

    await browser.init();

    try {
      const result = await browser.extract({
        urls: args.urls,
        prompt: args.prompt,
        schema: args.schema,
        systemPrompt: args.systemPrompt,
        allowExternalLinks: args.allowExternalLinks,
        includeSubdomains: args.includeSubdomains,
        enableWebSearch: args.enableWebSearch,
      });

      res.json({
        results: result.data || [],
        total: result.data?.length || 0,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[Extract Error]', error);
    res.status(500).json({
      error: 'Extract failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// GET /health - Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// GET /api/info - Server info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'one-search-mcp-api',
    version: '1.0.0',
    provider: process.env.SEARCH_PROVIDER || 'local',
    endpoints: [
      'POST /api/tools/search',
      'POST /api/tools/scrape',
      'POST /api/tools/map',
      'POST /api/tools/extract',
    ],
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[OneSearch API Server]`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Provider: ${process.env.SEARCH_PROVIDER || 'local'}`);
  console.log(`  Endpoints:`);
  console.log(`    POST http://localhost:${PORT}/api/tools/search`);
  console.log(`    POST http://localhost:${PORT}/api/tools/scrape`);
  console.log(`    POST http://localhost:${PORT}/api/tools/map`);
  console.log(`    POST http://localhost:${PORT}/api/tools/extract`);
  console.log(`    GET  http://localhost:${PORT}/health`);
  console.log(`    GET  http://localhost:${PORT}/api/info`);
  console.log();
  console.log(`Server ready at http://localhost:${PORT}`);
});

export default app;

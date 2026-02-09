/**
 * REST API routes for one-search-mcp
 * Shared between standalone API server and integrated MCP+API server
 */

import { Request, Response, Router } from 'express';
import { bingSearch, duckDuckGoSearch, searxngSearch, tavilySearch, localSearch, googleSearch, zhipuSearch, exaSearch, bochaSearch } from './search/index.js';
import { AgentBrowser } from './libs/agent-browser/index.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { ISearchRequestOptions, SearchProvider } from './interface.js';

// Helper: Get search config from environment variables only
function getSearchConfig() {
  return {
    provider: (process.env.SEARCH_PROVIDER as SearchProvider) || 'local',
    apiUrl: process.env.SEARCH_API_URL,
    apiKey: process.env.SEARCH_API_KEY,
    timeout: Number(process.env.TIMEOUT) || 30000,
    userAgent: process.env.SEARCH_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

// Helper: Process search based on provider (copied from index.ts)
async function processSearch(args: SearchInput & { apiKey?: string; apiUrl?: string }) {
  const options: ISearchRequestOptions = {
    query: args.query,
    limit: args.limit || 10,
    categories: args.categories || 'general',
    language: args.language || 'auto',
    timeRange: args.timeRange || '',
  };

  const config = {
    provider: (process.env.SEARCH_PROVIDER as SearchProvider) ?? 'local',
    apiUrl: args.apiUrl || process.env.SEARCH_API_URL,
    apiKey: args.apiKey || process.env.SEARCH_API_KEY,
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

/**
 * Create API router with all REST API routes
 */
export function createApiRouter(): Router {
  const router = Router();

  // POST /api/tools/search
  router.post('/tools/search', async (req: Request, res: Response) => {
    try {
      const args: SearchInput = req.body;
      const config = getSearchConfig();

      console.log(`[Search] query="${args.query}", provider=${config.provider}`);

      const { results, success } = await processSearch({
        ...args,
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
      });

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
          content: r.title,
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
  router.post('/tools/scrape', async (req: Request, res: Response) => {
    try {
      const args: ScrapeInput = req.body;
      const config = getSearchConfig();

      console.log(`[Scrape] url="${args.url}", formats=${args.formats?.join(',') || 'markdown'}`);

      const browser = new AgentBrowser({
        headless: process.env.HEADLESS !== 'false',
        timeout: config.timeout,
      });

      try {
        const result = await browser.scrapeUrl(args.url, {
          formats: args.formats || ['markdown'],
          onlyMainContent: args.onlyMainContent,
          includeTags: args.includeTags,
          excludeTags: args.excludeTags,
          waitFor: args.waitFor,
          timeout: args.timeout || config.timeout,
          extract: args.extract,
          location: args.location,
          mobile: args.mobile,
          removeBase64Images: args.removeBase64Images,
          skipTlsVerification: args.skipTlsVerification,
        });

        res.json({
          url: args.url,
          success: result.success,
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
  router.post('/tools/map', async (req: Request, res: Response) => {
    try {
      const args: MapInput = req.body;
      const config = getSearchConfig();

      console.log(`[Map] url="${args.url}", limit=${args.limit || 'unlimited'}`);

      const browser = new AgentBrowser({
        headless: process.env.HEADLESS !== 'false',
        timeout: config.timeout,
      });

      try {
        const result = await browser.mapUrl(args.url, {
          search: args.search,
          ignoreSitemap: args.ignoreSitemap,
          sitemapOnly: args.sitemapOnly,
          includeSubdomains: args.includeSubdomains,
          limit: args.limit,
        });

        res.json({
          url: args.url,
          success: result.success,
          urls: result.links || [],
          total: result.links?.length || 0,
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
  router.post('/tools/extract', async (req: Request, res: Response) => {
    try {
      const args: ExtractInput = req.body;
      const config = getSearchConfig();

      console.log(`[Extract] urls=${args.urls.length}, schema=${args.schema ? 'defined' : 'none'}`);

      const browser = new AgentBrowser({
        headless: process.env.HEADLESS !== 'false',
        timeout: config.timeout,
      });

      try {
        const results: any[] = [];

        // Extract content from each URL
        for (const url of args.urls) {
          const res = await browser.scrapeUrl(url, {
            formats: ['markdown'],
            onlyMainContent: true,
          });

          if (res.success && res.markdown) {
            results.push({
              url,
              content: res.markdown,
            });
          }
        }

        res.json({
          results,
          total: results.length,
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
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.2.0',
    });
  });

  // GET /api/info - Server info
  router.get('/info', (_req: Request, res: Response) => {
    res.json({
      name: 'one-search-mcp',
      version: '1.2.0',
      modes: ['mcp', 'api'],
      provider: process.env.SEARCH_PROVIDER || 'local',
      endpoints: {
        mcp: '/mcp (POST)',
        api: [
          'POST /api/tools/search',
          'POST /api/tools/scrape',
          'POST /api/tools/map',
          'POST /api/tools/extract',
          'GET  /api/info',
          'GET  /health',
        ],
      },
    });
  });

  return router;
}

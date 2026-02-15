/**
 * REST API routes for one-search-mcp
 * Shared between standalone API server and integrated MCP+API server
 */

import { Request, Response, Router } from 'express';
import { withBrowser } from './browser-helpers.js';
import { executeSearch } from './search/provider-factory.js';
import { getSearchConfig } from './config.js';
import { SERVER } from './constants.js';
import type { SearchInput, MapInput, ScrapeInput, ExtractInput } from './schemas.js';
import { ISearchRequestOptions } from './interface.js';

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

      const options: ISearchRequestOptions = {
        query: args.query,
        limit: args.limit,
        categories: args.categories,
        language: args.language,
        timeRange: args.timeRange,
      };

      const { results, success } = await executeSearch(config.provider, options, {
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

      console.log(`[Scrape] url="${args.url}", formats=${args.formats?.join(',') || 'markdown'}`);

      const result = await withBrowser(async (browser) => {
        return await browser.scrapeUrl(args.url, {
          formats: args.formats || ['markdown'],
          onlyMainContent: args.onlyMainContent,
          maxLength: args.maxLength,
          includeTags: args.includeTags,
          excludeTags: args.excludeTags,
          waitFor: args.waitFor,
          timeout: args.timeout,
          extract: args.extract,
          location: args.location,
          mobile: args.mobile,
          removeBase64Images: args.removeBase64Images,
          skipTlsVerification: args.skipTlsVerification,
        });
      });

      res.json({
        url: args.url,
        success: result.success,
        data: result,
      });
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

      console.log(`[Map] url="${args.url}", limit=${args.limit || 'unlimited'}`);

      const result = await withBrowser(async (browser) => {
        return await browser.mapUrl(args.url, {
          search: args.search,
          ignoreSitemap: args.ignoreSitemap,
          sitemapOnly: args.sitemapOnly,
          includeSubdomains: args.includeSubdomains,
          limit: args.limit,
        });
      });

      res.json({
        url: args.url,
        success: result.success,
        urls: result.links || [],
        total: result.links?.length || 0,
        source: args.sitemapOnly ? 'sitemap' : args.ignoreSitemap ? 'html' : 'sitemap+html',
      });
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

      console.log(`[Extract] urls=${args.urls.length}, schema=${args.schema ? 'defined' : 'none'}`);

      const results = await withBrowser(async (browser) => {
        const extractedResults: any[] = [];

        // Extract content from each URL
        for (const url of args.urls) {
          const res = await browser.scrapeUrl(url, {
            formats: ['markdown'],
            onlyMainContent: true,
          });

          if (res.success && res.markdown) {
            extractedResults.push({
              url,
              content: res.markdown,
            });
          }
        }

        return extractedResults;
      });

      res.json({
        results,
        total: results.length,
      });
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
      version: SERVER.DEFAULT_VERSION,
    });
  });

  // GET /api/info - Server info
  router.get('/info', (_req: Request, res: Response) => {
    const config = getSearchConfig();
    res.json({
      name: 'one-search-mcp',
      version: SERVER.DEFAULT_VERSION,
      modes: ['mcp', 'api'],
      provider: config.provider,
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

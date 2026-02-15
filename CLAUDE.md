# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OneSearch MCP Server is a Model Context Protocol (MCP) server implementation that provides web search, scraping, and content extraction capabilities. It integrates with multiple search providers (SearXNG, Tavily, DuckDuckGo, Bing) and supports local browser-based search using agent-browser with Playwright.

## Development Commands

### Development
```bash
npm run dev
```
Runs the server in development mode with hot reload using tsx and dotenvx for environment variables.

### Build
```bash
npm run build
```
Builds the project using tsup, generating both CommonJS and ESM outputs in the `dist/` directory. The build also makes the main entry point executable.

### Linting
```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting errors
```

### Running Built Server
```bash
npm start
```
Runs the compiled server from `dist/index.js`.

## Architecture

### Core Components

**Main Entry Point** ([src/index.ts](src/index.ts))

- Initializes the MCP server using `@modelcontextprotocol/sdk` v1.25+
- Configures StdioServerTransport for communication
- Registers four main tools: `one_search`, `one_scrape`, `one_map`, `one_extract`
- Routes tool requests to appropriate handlers based on configured search provider

**Configuration Management** ([src/config.ts](src/config.ts), [src/constants.ts](src/constants.ts))

- **Centralized Configuration**: All environment variable handling in one place
  - `getSearchConfig()`: Get search provider settings
  - `getSearchDefaultConfig()`: Get search parameter defaults
  - `getBrowserConfig()`: Get browser configuration with defaults
  - `getSessionConfig()`: Get session timeout configuration
- **Constants Module**: Magic numbers replaced with named constants
  - `TIMEOUTS`: Browser, API, SSE keep-alive intervals
  - `SEARCH_DEFAULTS`: Default search parameters
  - `SERVER`: Server version and configuration
  - `CONTENT_LIMITS`: Content length constraints

**Browser Helpers** ([src/browser-helpers.ts](src/browser-helpers.ts))

- `createBrowser()`: Create AgentBrowser with consistent configuration
- `withBrowser()`: Execute browser operations with automatic cleanup (ensures browser is always closed)
- Eliminates repetitive try-finally blocks throughout codebase

#### Search Provider Architecture

The server supports multiple search providers through a **Strategy pattern** implementation ([src/search/provider-factory.ts](src/search/provider-factory.ts)):

- **searxng**: Self-hosted meta-search engine ([src/search/searxng.ts](src/search/searxng.ts))
- **tavily**: Cloud-based search API ([src/search/tavily.ts](src/search/tavily.ts))
- **bing**: Microsoft Bing Search API ([src/search/bing.ts](src/search/bing.ts))
- **duckduckgo**: DuckDuckGo search ([src/search/duckduckgo.ts](src/search/duckduckgo.ts))
- **local**: Browser-based search using agent-browser ([src/search/local.ts](src/search/local.ts))
- **google**, **zhipu**, **exa**, **bocha**: Additional provider integrations

**Provider Factory Pattern:**
- `executeSearch()`: Main entry point that delegates to appropriate provider strategy
- `SearchProviderRegistry`: Singleton that caches provider strategies
- Type-safe safe search conversion with boundary checking
- Eliminates large switch statements (previously 90+ lines, now ~8 lines)

The active provider is determined by the `SEARCH_PROVIDER` environment variable (defaults to `local`).

#### Agent Browser Integration

The server uses `agent-browser` with Playwright for browser automation ([src/libs/agent-browser/](src/libs/agent-browser/)):

- Supports multiple search engines: Bing, Google, Baidu, Sogou
- Uses `playwright-core` with local browser installations
- Extracts content using Readability algorithm and converts to Markdown using Turndown
- Manages browser lifecycle and provides methods for navigation, scraping, and URL mapping
- Implements search result extraction for different search engines

### Tool Definitions

All MCP tools are defined in [src/tools.ts](src/tools.ts):

- `SEARCH_TOOL`: Web search with configurable parameters
- `SCRAPE_TOOL`: Advanced page scraping with format options (markdown, HTML, screenshots)
- `MAP_TOOL`: URL discovery via HTML link extraction
- `EXTRACT_TOOL`: Structured data extraction from multiple URLs with optional LLM prompts

### Configuration

Environment variables control behavior:

- `SEARCH_PROVIDER`: Which search backend to use (default: `local`)
- `SEARCH_API_URL`: API endpoint for SearXNG
- `SEARCH_API_KEY`: API key for Tavily/Bing
- Search parameters: `LIMIT`, `CATEGORIES`, `ENGINES`, `LANGUAGE`, `TIME_RANGE`, `SAFE_SEARCH`

### Build System

- **TypeScript**: Strict mode enabled with NodeNext module resolution
- **tsup**: Bundles to both CJS and ESM formats with sourcemaps and minification
- **Module Type**: ESM (type: "module" in package.json)
- **File Extensions**: All imports use `.js` extensions (TypeScript convention for ESM)

## Key Implementation Details

### Search Flow

1. Request arrives via MCP protocol
2. `processSearch()` calls `executeSearch()` from provider factory
3. Provider factory selects appropriate strategy based on `SEARCH_PROVIDER`
4. Strategy executes search with merged default configuration
5. For `local` provider: `withBrowser()` ensures safe browser lifecycle management
6. Results formatted as text with title, URL, description, and optional markdown content

**Code Example (simplified):**
```typescript
async function processSearch(args: ISearchRequestOptions): Promise<ISearchResponse> {
  const config = getSearchConfig();
  return await executeSearch(config.provider, args, {
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
  });
}
```

### Browser Management

- Local browser operations use `agent-browser` with `playwright-core` (no bundled Chromium)
- Browser must be installed separately via `agent-browser install` or `npx playwright install chromium`
- Browser lifecycle managed via `withBrowser()` helper for guaranteed cleanup
- `createBrowser()` provides consistent configuration from environment variables
- All browser operations (search, scrape, map, extract) use the same helper pattern

**Code Example:**
```typescript
return await withBrowser(async (browser) => {
  const res = await browser.scrapeUrl(url, options);
  return processResult(res);
}); // Browser automatically closed here
```

### Scraping and Extraction

- `processScrape()`: Scrapes a single URL with configurable formats (markdown, HTML, links, screenshots)
- `processMapUrl()`: Discovers URLs from a starting page with filtering options
- `processExtract()`: Extracts content from multiple URLs with optional LLM prompts and schemas
- All operations use `withBrowser()` for consistent behavior and automatic cleanup
- Content length limits configurable via `getScrapeMaxLength()` with proper constant references

### Error Handling
- All tool handlers wrapped in try-catch with logging
- Errors returned as MCP responses with success: false
- Server logs all requests, errors, and timing information

## Important Notes

- All four MCP tools (`one_search`, `one_scrape`, `one_map`, `one_extract`) are fully implemented
- Local search and scraping require a local Chromium installation (Chrome, Chromium, Edge, etc.)
- The project uses ESM modules exclusively - all imports must include `.js` extensions
- MCP SDK v1.25+ uses the new `registerTool` API pattern instead of `setRequestHandler`
- Zod schemas provide runtime validation and type inference for all tool inputs

## Code Organization Best Practices

The codebase follows clean code principles with centralized configuration and helper functions:

- **No Magic Numbers**: All constants defined in `constants.ts` (timeouts, defaults, limits)
- **DRY Principle**: Shared logic extracted to helpers (`withBrowser()`, `createBrowser()`)
- **Strategy Pattern**: Search providers use factory pattern instead of large switch statements
- **Type Safety**: Safe search type conversion with boundary checking
- **Automatic Cleanup**: `withBrowser()` ensures resources are always freed
- **Single Source of Truth**: All environment variable handling in `config.ts`

**Before refactoring:**
```typescript
// 90+ line switch statement
switch (config.provider) {
  case 'searxng': { /* 10 lines */ }
  case 'tavily': { /* 10 lines */ }
  // ... 7 more cases
}
```

**After refactoring:**
```typescript
// 8 lines with strategy pattern
async function processSearch(args) {
  const config = getSearchConfig();
  return await executeSearch(config.provider, args, config);
}
```

## Migration from Firecrawl

Version 1.0.11+ removed Firecrawl integration in favor of `agent-browser`:

- **Benefits**: No external API dependencies, better privacy, no API costs, local control
- **Requirements**: Must install Chromium browser locally
- **Breaking Changes**: `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` environment variables removed
- **Functionality**: All scraping and mapping features preserved with similar or better performance

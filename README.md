# 🚀 OneSearch MCP Server: Web Search & Crawl & Scraper & Extract

A Model Context Protocol (MCP) server implementation that integrates with multiple search providers for web search, local browser search, and scraping capabilities with agent-browser.

## Features

- Web Search, scrape, crawl and extract content from websites.
- Support multiple search engines and web scrapers: **SearXNG**, **Tavily**, **DuckDuckGo**, **Bing**, **Google**, **Zhipu (智谱)**, **Exa**, **Bocha (博查)**, etc.
- **Local web search** (browser search), support multiple search engines: **Bing**, **Google**, **Baidu**, **Sogou**, etc.
  - Use `agent-browser` for browser automation.
  - Free, no API keys required.
- **Enabled tools:** `one_search`, `one_scrape`, `one_map`, `one_extract`
- **Multiple Transports:** Supports both stdio (default) and Streamable HTTP transports

## Transport Modes

OneSearch MCP Server supports two transport modes:

### stdio (Default)

The standard stdin/stdout transport, used by most MCP clients like Claude Desktop:

```bash
# Run with stdio transport (default)
npx -y one-search-mcp
```

### Streamable HTTP

HTTP-based transport for remote access and web integration:

```bash
# Run with Streamable HTTP transport on port 8000 (default)
npx -y one-search-mcp streamable-http

# Or specify custom port
npx -y one-search-mcp streamable-http --port=8080
```

**Client Configuration:**

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "url": "http://localhost:8000"
    }
  }
}
```

**Features:**
- ✅ Remote access over HTTP
- ✅ Session management with unique session IDs
- ✅ Server-Sent Events (SSE) for real-time updates
- ✅ Compatible with MCP Streamable HTTP specification
- ✅ Easy to deploy behind reverse proxies

## Migration from v1.1.0 and Earlier

**Breaking Changes in v1.1.0:**

- **Firecrawl Removed**: The Firecrawl integration has been removed in favor of `agent-browser`, which provides similar functionality without requiring external API services.
- **New Browser Requirement**: You must install Chromium browser (see Prerequisites section).
- **Environment Variables**: `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` are no longer used.

**What Changed:**

- `one_scrape` and `one_map` now use `agent-browser` instead of Firecrawl
- `one_extract` tool is now fully implemented for structured data extraction from multiple URLs
- All browser-based operations are now handled locally, providing better privacy and no API costs

**Migration Steps:**

1. Install Chromium browser (see Prerequisites)
2. Remove `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY` from your environment variables
3. Update to the latest version: `npm install -g one-search-mcp@latest`

## Prerequisites

**Browser Requirement**: This server uses `agent-browser` for web scraping and local search, which requires a Chromium-based browser.

**Good News**: The server will automatically detect and use browsers already installed on your system:

- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Chromium
- ✅ Google Chrome Canary

**If you don't have any of these browsers installed**, you can:

```bash
# Option 1: Install Google Chrome (Recommended)
# Download from: https://www.google.com/chrome/

# Option 2: Install Microsoft Edge
# Download from: https://www.microsoft.com/edge

# Option 3: Install Chromium via agent-browser
npx agent-browser install

# Option 4: Install Chromium directly
# Download from: https://www.chromium.org/getting-involved/download-chromium/
```

## Installation

### Using Claude Code CLI (Recommended)

```bash
# Add to Claude Code with default settings (local search)
claude mcp add one-search-mcp -- npx -y one-search-mcp

# Add with custom search provider (e.g., SearXNG)
claude mcp add one-search-mcp -e SEARCH_PROVIDER=searxng -e SEARCH_API_URL=http://127.0.0.1:8080 -- npx -y one-search-mcp

# Add with Tavily API
claude mcp add one-search-mcp -e SEARCH_PROVIDER=tavily -e SEARCH_API_KEY=your_api_key -- npx -y one-search-mcp
```

### Manual Installation

```bash
# Install globally (Optional)
npm install -g one-search-mcp

# Or run directly with npx
npx -y one-search-mcp
```

### Using Docker

Docker image includes all dependencies (Chromium browser) pre-installed, no additional setup required.

**Pull the image:**

```bash
# From GitHub Container Registry
docker pull ghcr.io/yokingma/one-search-mcp:latest

# Or from Docker Hub
docker pull zacma/one-search-mcp:latest
```

#### Docker with stdio (Claude Desktop)

**Configure with Claude Desktop:**

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ghcr.io/yokingma/one-search-mcp:latest", "node", "dist/index.js"],
      "env": {
        "SEARCH_PROVIDER": "local"
      }
    }
  }
}
```

**With custom search provider:**

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "SEARCH_PROVIDER=tavily",
        "-e", "SEARCH_API_KEY=your_api_key",
        "ghcr.io/yokingma/one-search-mcp:latest",
        "node", "dist/index.js"
      ]
    }
  }
}
```

#### Docker with Streamable HTTP (LibreChat / Remote Access)

**Run with Docker:**

```bash
# Run on default port 8000
docker run -d -p 8000:8000 ghcr.io/yokingma/one-search-mcp:latest

# Or with custom port and search provider
docker run -d \
  -p 8080:8080 \
  -e SEARCH_PROVIDER=searxng \
  -e SEARCH_API_URL=http://your-searxng:8080 \
  ghcr.io/yokingma/one-search-mcp:latest \
  node dist/index.js streamable-http --port=8080
```

**Using Docker Compose:**

```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

**Configure with LibreChat:**

Add to your LibreChat MCP configuration:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "url": "http://one-search-mcp:8000"
    }
  }
}
```

Or if running externally:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "url": "http://localhost:8000"
    }
  }
}
```

## Environment Variables

**Search Engine:**

- **SEARCH_PROVIDER** (Optional): The search provider to use, supports `searxng`, `duckduckgo`, `bing`, `tavily`, `google`, `zhipu`, `exa`, `bocha`, `local`, default is `local`.
- **SEARCH_API_URL** (Optional): The URL of the SearxNG API, or Google Custom Search Engine ID for `google`.
- **SEARCH_API_KEY** (Optional): The API key for the search provider, required for `tavily`, `bing`, `google`, `zhipu`, `exa`, `bocha`.

```ts
// supported search providers
export type SearchProvider = 'searxng' | 'duckduckgo' | 'bing' | 'tavily' | 'google' | 'zhipu' | 'exa' | 'bocha' | 'local';
```

### Search Provider Configuration

| Provider | API Key Required | API URL Required | Notes |
|----------|-----------------|------------------|-------|
| `local` | No | No | Free, uses browser automation |
| `duckduckgo` | No | No | Free, no API key needed |
| `searxng` | Optional | Yes | Self-hosted meta search engine |
| `bing` | Yes | No | [Bing Search API](https://learn.microsoft.com/en-us/previous-versions/bing/search-apis/bing-web-search/create-bing-search-service-resource) |
| `tavily` | Yes | No | [Tavily API](https://tavily.com/) |
| `google` | Yes | Yes (Search Engine ID) | [Google Custom Search](https://developers.google.com/custom-search/v1/overview) |
| `zhipu` | Yes | No | [智谱 AI](https://bigmodel.cn/dev/api/search-tool/web-search) |
| `exa` | Yes | No | [Exa AI](https://exa.ai/) |
| `bocha` | Yes | No | [博查 AI](https://open.bochaai.com/) |

## Configuration for Other MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "local"
      }
    }
  }
}
```

### Cursor

Add to your `mcp.json` file:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "local"
      }
    }
  }
}
```

### Windsurf

Add to your `./codeium/windsurf/model_config.json` file:

```json
{
  "mcpServers": {
    "one-search-mcp": {
      "command": "npx",
      "args": ["-y", "one-search-mcp"],
      "env": {
        "SEARCH_PROVIDER": "local"
      }
    }
  }
}
```

## Self-hosting SearXNG (Optional)

If you want to use SearXNG as your search provider, you can deploy it locally using Docker:

**Prerequisites:**

- Docker installed and running (version 20.10.0 or higher)
- At least 4GB of RAM available

**Quick Start:**

```bash
# Clone SearXNG Docker repository
git clone https://github.com/searxng/searxng-docker.git
cd searxng-docker

# Start SearXNG
docker compose up -d
```

After deployment, SearXNG will be available at `http://127.0.0.1:8080` by default.

**Configure OneSearch to use SearXNG:**

```bash
# Set environment variables
export SEARCH_PROVIDER=searxng
export SEARCH_API_URL=http://127.0.0.1:8080
```

For more details, see the [official SearXNG Docker documentation](https://github.com/searxng/searxng-docker).

## Troubleshooting

### Browser not found error

If you see an error like "Browser not found", the server couldn't detect any installed Chromium-based browser. Please install one of the following:

- **Google Chrome**: <https://www.google.com/chrome/>
- **Microsoft Edge**: <https://www.microsoft.com/edge>
- **Chromium**: <https://www.chromium.org/getting-involved/download-chromium/>

Or install via agent-browser:

```bash
npx agent-browser install
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.

# 🔍 OneSearch MCP Server

Web search, scrape, and extract capabilities for Model Context Protocol (MCP) clients.

## ✨ Features

- **Multiple Search Providers**: SearXNG, Tavily, DuckDuckGo, Bing, Google, and more
- **Local Browser Search**: Free search without API keys using browser automation
- **Web Scraping**: Extract content from websites
- **Dual Transport**: Supports both stdio (Claude Desktop) and HTTP (LibreChat)
- **Session Management**: Handle multiple concurrent sessions

## 🛠️ Tools Available

| Tool | Description |
|------|-------------|
| `one_search` | Search the web using configured provider |
| `one_scrape` | Scrape content from a single URL |
| `one_map` | Crawl and map all links from a website |
| `one_extract` | Extract structured data from multiple URLs |

## 🚀 Quick Start

### For Claude Desktop (stdio mode)

1. Install the package:
```bash
npm install -g one-search-mcp
```

2. Add to Claude Desktop config (`claude_desktop_config.json`):
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

### For LibreChat (HTTP mode)

1. Start the HTTP server:
```bash
npx -y one-search-mcp streamable-http --port=8000
```

2. Add to LibreChat MCP config:
```json
{
  "mcpServers": {
    "one-search-mcp": {
      "url": "http://localhost:8000",
      "transport": "streamable-http",
      "timeout": 60000
    }
  }
}
```

### Unified MCP + REST API Server (Recommended)

**NEW**: Run both MCP and REST API endpoints on a single server! No need for separate Docker containers.

1. Start the unified server:
```bash
npx -y one-search-mcp streamable-http --port=8000
```

2. Access both interfaces:
   - **MCP endpoint**: `http://localhost:8000/mcp` (for LibreChat, Claude Desktop with HTTP)
   - **REST API**: `http://localhost:8000/api/tools/*` (for custom integrations)

**Available REST API endpoints:**
```bash
# Search
POST http://localhost:8000/api/tools/search
Content-Type: application/json
{"query": "AI news", "limit": 10}

# Scrape
POST http://localhost:8000/api/tools/scrape
{"url": "https://example.com"}

# Map (discover URLs)
POST http://localhost:8000/api/tools/map
{"url": "https://example.com"}

# Extract (structured data)
POST http://localhost:8000/api/tools/extract
{"urls": ["https://example.com"], "prompt": "Extract main topics"}

# Health check
GET http://localhost:8000/health

# Server info
GET http://localhost:8000/api/info
```

**Benefits:**
- ✅ Single server process for both MCP and REST API
- ✅ One Docker container instead of two
- ✅ Shared configuration and resources
- ✅ Easier deployment and management

### Standalone REST API Server (API-only)

If you only need the REST API without MCP:

```bash
# Development
npm run dev:api

# Production
npm run build
npm run start:api

# Or docker
docker build -t one-search-api .
docker run -p 8000:8000 one-search-api
```

## 🔧 Configuration

### Search Providers

| Provider | Description | API Key Required | Configuration |
|----------|-------------|------------------|---------------|
| `local` | Browser automation (default) | ❌ No | Chromium browser needed |
| `searxng` | Self-hosted meta-search | ❌ No | Set `SEARCH_API_URL` |
| `tavily` | AI-optimized search | ✅ Yes | Set `SEARCH_API_KEY` |
| `duckduckgo` | Privacy-focused search | ❌ No | None |
| `bing` | Microsoft Bing API | ✅ Yes | Set `SEARCH_API_KEY` |
| `google` | Google Custom Search | ✅ Yes | Set `SEARCH_API_KEY` |
| `exa` | Semantic search | ✅ Yes | Set `SEARCH_API_KEY` |
| `zhipu` | 智谱 (China) | ✅ Yes | Set `SEARCH_API_KEY` |
| `bocha` | 博查 (China) | ✅ Yes | Set `SEARCH_API_KEY` |

### Environment Variables

**Basic Configuration:**
```bash
SEARCH_PROVIDER=searxng        # Search provider (default: local)
SEARCH_API_URL=http://nas:11111  # API endpoint for provider
SEARCH_API_KEY=your-api-key    # API key if required
TIMEOUT=30000                   # Request timeout in ms (default: 10000)
```

**Search Parameters:**
```bash
LIMIT=10                        # Max results per search (default: 10)
SAFE_SEARCH=0                   # Safe search: 0=off, 1=moderate, 2=strict
LANGUAGE=auto                   # Language code (e.g., en, zh)
CATEGORIES=general              # Search categories
ENGINES=all                     # Specific engines to use
```

**Advanced:**
```bash
SEARCH_USER_AGENT=Mozilla/5.0...  # Custom user agent
HEADLESS=true                   # Headless browser mode (default: true)
```

## 📋 Prerequisites

### For Browser-Based Search (`local` provider)

The server automatically detects installed browsers:
- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Chromium
- ✅ Google Chrome Canary

**Don't have a browser?** Install one:
- [Google Chrome](https://www.google.com/chrome/) (Recommended)
- [Microsoft Edge](https://www.microsoft.com/edge)

### For SearXNG

Deploy your own SearXNG instance:

**Using Docker:**
```bash
docker run -d \
  -p 8080:8080 \
  -e BASE_URL=http://localhost:8080 \
  searxng/searxng
```

**Configuration:**
```bash
SEARCH_PROVIDER=searxng
SEARCH_API_URL=http://localhost:8080
```

## 🐛 Troubleshooting

### SearXNG Timeout Issues

If you see `Request timeout after 10000ms`:

**Solution 1: Increase Timeout**
```bash
# Environment variable
TIMEOUT=30000

# Or HTTP header
X-Search-Timeout: 30000
```

**Solution 2: Use Reliable Engines**

Some SearXNG engines are more stable:
```bash
ENGINES=bing,qwant,yahoo,mojeek
```

**Solution 3: Check SearXNG Server**
```bash
# Test SearXNG directly
curl "http://localhost:8080/search?q=test&format=json"
```

### Network Connection Failed

Error: `Network connection failed. Check if SearXNG server (URL) is accessible.`

**Causes:**
- SearXNG server is down
- Wrong `SEARCH_API_URL`
- Firewall blocking connection

**Solution:**
```bash
# Verify SearXNG is accessible
curl http://localhost:8080

# Check Docker container
docker ps | grep searxng
```

### DNS Resolution Failed

Error: `DNS resolution failed for URL. Check the hostname.`

**Solution:**
- Use IP address instead of hostname
- Check `/etc/hosts` or DNS configuration

### User-Agent Blocking

Some SearXNG instances block requests without proper User-Agent header.

**Solution:**
```bash
# Set custom User-Agent
SEARCH_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# Or via HTTP header
X-User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

## 📚 Examples

### Basic Search
```javascript
// Using one_search tool
{
  "query": "MCP protocol documentation",
  "max_results": 5
}
```

### Scrape Website
```javascript
// Using one_scrape tool
{
  "url": "https://example.com",
  "formats": ["markdown", "html"]
}
```

### Extract Structured Data
```javascript
// Using one_extract tool
{
  "urls": ["https://example.com/page1", "https://example.com/page2"],
  "schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "price": { "type": "number" }
    }
  }
}
```

## 🐳 Docker Deployment

**dockerfile included:**
```bash
# Build image
docker build -t one-search-mcp .

# Run HTTP server
docker run -d \
  -p 8000:8000 \
  -e SEARCH_PROVIDER=searxng \
  -e SEARCH_API_URL=http://searxng:8080 \
  one-search-mcp streamable-http --port=8000
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  one-search-mcp:
    build: .
    ports:
      - "8000:8000"
    environment:
      SEARCH_PROVIDER: searxng
      SEARCH_API_URL: http://searxng:8080
      TIMEOUT: 30000
    command: ["streamable-http", "--port=8000"]
```

## 🔄 Migration from v1.1.0

**Breaking Changes:**
- ❌ Firecrawl support removed
- ✅ Now uses `agent-browser` for scraping
- 🔄 `one_extract` tool is now fully implemented

**Migration Steps:**
1. Install Chromium browser
2. Remove `FIRECRAWL_API_URL` and `FIRECRAWL_API_KEY`
3. Update: `npm install -g one-search-mcp@latest`

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Need Help?**
- 📖 [MCP Documentation](https://modelcontextprotocol.io/)
- 🐛 [Report Issues](https://github.com/yokingma/one-search-mcp/issues)
- ⭐ [Star on GitHub](https://github.com/yokingma/one-search-mcp)

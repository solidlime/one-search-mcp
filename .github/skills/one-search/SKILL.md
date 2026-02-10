---
name: one-search
description: Web search, scraping, URL discovery, and data extraction using OneSearch MCP server. Use when user says "search the web", "scrape this page", "get content from", "map this website", "find URLs", "extract data from", or asks for current information, web research, content collection, or structured data extraction. Supports browser automation, dynamic content, AI-powered extraction, and batch processing.
---

# OneSearch

Execute web searches, scrape content, discover URLs, and extract structured data using the OneSearch MCP server's REST API.

## Quick Start

**Prerequisites**: OneSearch MCP server running (see [SETUP.md](references/SETUP.md) for installation details)

**Web Search**:
```bash
python scripts/search.py '{"query": "AI news", "limit": 10}'
```

**Scrape Page**:
```bash
python scripts/scrape.py '{"url": "https://example.com", "formats": ["markdown"]}'
```

**Discover URLs**:
```bash
python scripts/map.py '{"url": "https://example.com", "limit": 100}'
```

**Extract Data**:
```bash
python scripts/extract.py '{"urls": ["https://example.com"], "prompt": "Extract main topics"}'
```

## Instructions

### Web Search

Execute web searches and retrieve results.

**When to use:** User asks to search the web, find information, or research a topic

**Script:** `scripts/search.py`

**Parameters:**
- `query` (required): Search keywords
- `limit`: Number of results (default: 10)
- `language`: Language code (`en`, `ja`, `auto`)
- `categories`: Category filter (`general`, `news`, `images`, `it`, `science`)
- `timeRange`: Time filter (`all`, `day`, `week`, `month`, `year`)

**Example:**
```bash
python scripts/search.py '{"query": "TypeScript MCP", "limit": 10, "language": "auto"}'
```

**Expected output:** JSON array with search results including titles, URLs, and content snippets

### Web Scraping

Scrape webpage content with optional browser automation.

**When to use:** User asks to get content from a page, scrape a website, or extract article text

**Script:** `scripts/scrape.py`

**Parameters:**
- `url` (required): Target URL
- `formats`: Output formats (`markdown`, `html`, `rawHtml`, `screenshot`, `links`)
- `onlyMainContent`: Extract only main content (default: true)
- `waitFor`: Wait time in milliseconds for dynamic content
- `actions`: Browser automation actions (click, scroll, wait, etc.)

**Basic scraping:**
```bash
python scripts/scrape.py '{"url": "https://example.com/article", "formats": ["markdown"]}'
```

**With browser actions for dynamic content:**
```bash
python scripts/scrape.py '{"url": "https://example.com", "actions": [{"type": "wait", "milliseconds": 2000}, {"type": "click", "selector": "#load-more"}], "formats": ["markdown"]}'
```

**Expected output:** Page content in requested format(s)

### URL Discovery

Discover and map URLs from a website.

**When to use:** User asks to find pages on a site, map website structure, or discover URLs

**Script:** `scripts/map.py`

**Parameters:**
- `url` (required): Starting URL
- `search`: Filter URLs by keyword
- `limit`: Maximum URLs to discover (default: 100)
- `ignoreSitemap`: Skip sitemap.xml
- `sitemapOnly`: Only use sitemap.xml
- `includeSubdomains`: Include subdomains

**Example:**
```bash
python scripts/map.py '{"url": "https://example.com", "search": "tutorial", "limit": 100}'
```

**Expected output:** JSON array of discovered URLs matching criteria

### Data Extraction

Extract structured data from multiple URLs using AI.

**When to use:** User asks to extract specific data from pages, analyze multiple URLs, or collect structured information

**Script:** `scripts/extract.py`

**Parameters:**
- `urls` (required): Array of URLs to extract from
- `prompt` (required): Extraction instructions
- `schema`: Optional JSON schema for structured output

**Example:**
```bash
python scripts/extract.py '{"urls": ["https://example.com/product1", "https://example.com/product2"], "prompt": "Extract product name, price, and availability"}'
```

**Expected output:** Structured data extracted from all specified URLs

## Examples

### Example 1: Research News

User says: "Search for recent AI developments"

Actions:
```bash
python scripts/search.py '{"query": "AI developments", "limit": 10, "timeRange": "week"}'
```

Result: List of recent articles with titles, URLs, and snippets

### Example 2: Scrape Article Content

User says: "Get the content from this article"

Actions:
```bash
python scripts/scrape.py '{"url": "https://example.com/article", "formats": ["markdown"]}'
```

Result: Clean markdown text of article content

### Example 3: Map Website Structure

User says: "Find all tutorial pages on this site"

Actions:
```bash
python scripts/map.py '{"url": "https://example.com", "search": "tutorial", "limit": 50}'
```

Result: List of URLs containing "tutorial" keyword

### Example 4: Extract Product Data

User says: "Extract product info from these pages"

Actions:
```bash
python scripts/extract.py '{"urls": ["url1", "url2"], "prompt": "Extract name, price, rating"}'
```

Result: Structured data with product information from all pages

## Troubleshooting

### Error: Connection refused

**Cause:** OneSearch MCP server is not running

**Solution:**
1. Verify server is running: `curl http://localhost:8000/health`
2. Check server URL in config.json or ONE_SEARCH_URL environment variable
3. Start server if needed (see main README.md)

### Error: Module not found

**Cause:** Required Python packages not installed

**Solution:**
```bash
pip install requests
```

### Error: Encoding issues on Windows

**Cause:** Terminal doesn't support UTF-8

**Solution:**
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

### Error: Empty or incomplete scraping results

**Cause:** Page content is dynamically loaded

**Solution:** Add wait time or browser actions:
```bash
python scripts/scrape.py '{"url": "...", "waitFor": 3000, "actions": [{"type": "wait", "milliseconds": 2000}]}'
```

## Configuration

**See [SETUP.md](references/SETUP.md)** for detailed configuration options including:
- Configuration file vs environment variables
- Global skill setup
- Windows encoding fixes
- Server URL configuration

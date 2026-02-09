---
name: one-search
description: Web search, scraping, URL discovery, and data extraction using OneSearch MCP server. Use for web research, content collection, site mapping, and extracting structured data from websites.
---

# OneSearch

## Overview

Execute web searches, scrape webpage content, discover URLs from websites, and extract structured data using the OneSearch MCP server's REST API.

## Setup

**Method 1: Configuration File (Recommended)**

1. Copy the example config:
```bash
cp assets/config.example.json assets/config.json
```

2. Edit `assets/config.json` with your server URL:
```json
{
  "mcp_server_url": "http://your-server:8000"
}
```

**Method 2: Environment Variable**

Set the OneSearch server URL:

```bash
export ONE_SEARCH_URL=http://localhost:8000
```

Windows PowerShell:
```powershell
$env:ONE_SEARCH_URL="http://localhost:8000"
```

> **Note**: Configuration file takes priority over environment variable.

## Quick Start

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

## Web Search

Execute web searches and retrieve results.

**Script**: `scripts/search.py`

**Parameters**:
- `query` (required): Search keywords
- `limit`: Number of results (default: 10)
- `language`: Language code (`en`, `ja`, `auto`)
- `categories`: Category filter (`general`, `news`, `images`, `it`, `science`)
- `timeRange`: Time filter (`all`, `day`, `week`, `month`, `year`)

**Example**:
```bash
python scripts/search.py '{
  "query": "TypeScript MCP",
  "limit": 10,
  "language": "auto",
  "categories": "general"
}'
```

## Web Scraping

Scrape webpage content with optional browser automation.

**Script**: `scripts/scrape.py`

**Parameters**:
- `url` (required): Target URL
- `formats`: Output formats (`markdown`, `html`, `rawHtml`, `screenshot`, `links`)
- `onlyMainContent`: Extract only main content (default: true)
- `waitFor`: Wait time in milliseconds for dynamic content
- `actions`: Browser automation actions (click, scroll, wait, etc.)

**Basic Scraping**:
```bash
python scripts/scrape.py '{
  "url": "https://example.com/article",
  "formats": ["markdown"],
  "onlyMainContent": true
}'
```

**With Browser Actions**:
```bash
python scripts/scrape.py '{
  "url": "https://example.com",
  "actions": [
    {"type": "wait", "milliseconds": 2000},
    {"type": "click", "selector": "#load-more"}
  ],
  "formats": ["markdown"]
}'
```

## URL Discovery

Discover and map URLs from a website.

**Script**: `scripts/map.py`

**Parameters**:
- `url` (required): Starting URL
- `search`: Filter URLs by keyword
- `limit`: Maximum URLs to discover (default: 100)
- `ignoreSitemap`: Skip sitemap.xml
- `sitemapOnly`: Only use sitemap.xml
- `includeSubdomains`: Include subdomains

**Example**:
```bash
python scripts/map.py '{
  "url": "https://example.com",
  "search": "tutorial",
  "limit": 100
}'
```

## Data Extraction

Extract structured data from multiple URLs using AI.

**Script**: `scripts/extract.py`

**Parameters**:
- `urls` (required): Array of URLs to extract from
- `prompt` (required): Extraction instructions
- `schema`: Optional JSON schema for structured output

**Example**:
```bash
python scripts/extract.py '{
  "urls": [
    "https://example.com/product1",
    "https://example.com/product2"
  ],
  "prompt": "Extract product name, price, and availability"
}'
```

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Codex for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Codex's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Codex should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Codex produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Not every skill requires all three types of resources.**

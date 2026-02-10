# OneSearch Setup Guide

## Prerequisites

- Python 3.7 or higher
- OneSearch MCP server running (see main README.md)

## Configuration Methods

### Method 1: Configuration File (Recommended)

1. Copy the example config:
```bash
cp references/config.example.json references/config.json
```

2. Edit `references/config.json` with your server URL:
```json
{
  "mcp_server_url": "http://your-server:8000",
  "skill_root_path": null
}
```

**Configuration Fields:**
- `mcp_server_url`: Required. URL of your OneSearch MCP server
- `skill_root_path`: Optional. Absolute path to skill root directory. If `null`, scripts auto-detect their location using `__file__`. Set this when using the skill as a global skill outside the workspace.

### Method 2: Environment Variable

Set the OneSearch server URL:

**Linux/macOS:**
```bash
export ONE_SEARCH_URL=http://localhost:8000
```

**Windows PowerShell:**
```powershell
$env:ONE_SEARCH_URL="http://localhost:8000"
```

**Note:** Configuration file takes priority over environment variable.

## Global Skills Configuration

When using this skill as a global skill (not in the current workspace), set the `skill_root_path` in config.json:

**macOS/Linux example:**
```json
{
  "mcp_server_url": "http://localhost:8000",
  "skill_root_path": "/Users/you/.claude/skills/one-search"
}
```

**Windows example:**
```json
{
  "mcp_server_url": "http://localhost:8000",
  "skill_root_path": "C:\\Users\\You\\.claude\\skills\\one-search"
}
```

**Note:** When `skill_root_path` is `null`, scripts automatically detect their location using `__file__`. This works perfectly for workspace-local skills.

## Windows-Specific Configuration

### Encoding Fix

All scripts include automatic UTF-8 encoding for Windows environments. If you still encounter encoding issues, ensure your terminal supports UTF-8:

**PowerShell:**
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001
```

## Troubleshooting

### Server Connection Issues

If you get connection errors:
1. Verify the OneSearch server is running
2. Check the server URL in your config or environment variable
3. Test the server with: `curl http://localhost:8000/health`

### Import Errors

Ensure required Python packages are installed:
```bash
pip install requests
```

### Permission Issues

On Unix systems, ensure scripts are executable:
```bash
chmod +x scripts/*.py
```

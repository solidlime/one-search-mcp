#!/usr/bin/env python3
"""OneSearch MCP Skill - Simple Python wrapper for one-search API"""

import sys
import json
import urllib.request
import urllib.error
from pathlib import Path

def load_config():
    """Load configuration from mcp-config.json"""
    config_path = Path(__file__).parent.parent / "mcp-config.json"
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "one_search_url": "http://localhost:8000",
            "search_provider": "local",
            "search_timeout": 30000
        }

def call_api(endpoint, data=None, headers=None):
    """Call OneSearch API"""
    config = load_config()
    base_url = config.get("one_search_url", "http://localhost:8000")
    timeout = config.get("search_timeout", 30000) / 1000  # ms to seconds

    url = f"{base_url}{endpoint}"
    default_headers = {
        "Content-Type": "application/json"
    }

    if headers:
        default_headers.update(headers)

    try:
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=json_data, headers=default_headers, method='POST')
        else:
            req = urllib.request.Request(url, headers=default_headers)

        with urllib.request.urlopen(req, timeout=timeout) as response:
            result = json.loads(response.read().decode('utf-8'))
            return {"success": True, "result": result}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get('error', str(e))
        except:
            error_msg = f"HTTP {e.code}: {error_body}"
        return {"success": False, "error": error_msg}
    except urllib.error.URLError as e:
        return {"success": False, "error": f"接続エラー: {str(e.reason)}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def search(args):
    """Execute search"""
    return call_api("/api/tools/search", args)

def scrape(args):
    """Execute scrape"""
    return call_api("/api/tools/scrape", args)

def map_urls(args):
    """Execute map"""
    return call_api("/api/tools/map", args)

def extract(args):
    """Execute extract"""
    return call_api("/api/tools/extract", args)

def health(args=None):
    """Check server health"""
    config = load_config()
    base_url = config.get("one_search_url", "http://localhost:8000")
    try:
        req = urllib.request.Request(f"{base_url}/health")
        with urllib.request.urlopen(req, timeout=5) as response:
            result = json.loads(response.read().decode('utf-8'))
            return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python one_search_mcp.py <command> [json_args]\n"
                    "Commands: search, scrape, map, extract, health"
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    command = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

    commands = {
        "search": search,
        "scrape": scrape,
        "map": map_urls,
        "extract": extract,
        "health": health
    }

    if command not in commands:
        print(json.dumps({
            "success": False,
            "error": f"Unknown command: {command}\n"
                    f"Available commands: {', '.join(commands.keys())}"
        }, ensure_ascii=False, indent=2))
        sys.exit(1)

    result = commands[command](args)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    sys.exit(0 if result.get("success") else 1)

if __name__ == "__main__":
    main()

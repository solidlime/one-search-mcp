#!/usr/bin/env python3
"""
OneSearch - Web Scraping Tool

Usage:
    python scrape.py '{"url": "https://example.com", "formats": ["markdown"]}'

Environment variable required:
    ONE_SEARCH_URL - URL of the OneSearch MCP server (e.g., http://localhost:8000)
"""

import json
import os
import sys
import urllib.request
import urllib.error


def main():
    # Check environment variable
    server_url = os.environ.get('ONE_SEARCH_URL')
    if not server_url:
        print('❌ エラー: 環境変数 ONE_SEARCH_URL が設定されていません', file=sys.stderr)
        print('\n設定方法:', file=sys.stderr)
        print('  export ONE_SEARCH_URL=http://localhost:8000', file=sys.stderr)
        print('\n使用例:', file=sys.stderr)
        print('  python scrape.py \'{"url": "https://example.com"}\'', file=sys.stderr)
        sys.exit(1)

    # Parse arguments
    if len(sys.argv) < 2:
        print('❌ エラー: スクレイピングパラメータが必要です', file=sys.stderr)
        print('\n使用例:', file=sys.stderr)
        print('  python scrape.py \'{"url": "https://example.com", "formats": ["markdown"]}\'', file=sys.stderr)
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f'❌ エラー: 無効なJSON形式: {e}', file=sys.stderr)
        sys.exit(1)

    # Make HTTP request
    url = f"{server_url.rstrip('/')}/api/tools/scrape"
    data = json.dumps(params).encode('utf-8')
    headers = {'Content-Type': 'application/json'}

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(json.dumps(result, ensure_ascii=False, indent=2))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f'❌ HTTPエラー [{e.code}]: {error_body}', file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f'❌ 接続エラー: {e.reason}', file=sys.stderr)
        print(f'サーバーURL: {server_url}', file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f'❌ エラー: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

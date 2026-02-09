#!/usr/bin/env python3
"""
OneSearch - Web Search Tool

Usage:
    python search.py '{"query": "AI news", "limit": 10}'

Environment variable required:
    ONE_SEARCH_URL - URL of the OneSearch MCP server (e.g., http://localhost:8000)
"""

import json
import os
import sys
import urllib.request
import urllib.error


def get_server_url():
    """Get server URL from config file or environment variable"""
    # 1. Try to load from config.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)  # scripts/ の親
    config_path = os.path.join(skill_dir, 'references', 'config.json')

    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get('mcp_server_url')
        except Exception as e:
            print(f'⚠ 警告: 設定ファイル読み込みエラー: {e}', file=sys.stderr)

    # 2. Fallback to environment variable
    server_url = os.environ.get('ONE_SEARCH_URL')
    if server_url:
        return server_url

    # 3. Error
    print('❌ エラー: サーバーURLが設定されていません', file=sys.stderr)
    print('\n設定方法1: 設定ファイル', file=sys.stderr)
    print('  1. references/config.example.json を references/config.json にコピー', file=sys.stderr)
    print('  2. mcp_server_url を編集', file=sys.stderr)
    print('\n設定方法2: 環境変数', file=sys.stderr)
    print('  export ONE_SEARCH_URL=http://localhost:8000', file=sys.stderr)
    return None


def main():
    # Get server URL
    server_url = get_server_url()
    if not server_url:
        sys.exit(1)

    # Parse arguments
    if len(sys.argv) < 2:
        print('❌ エラー: 検索パラメータが必要です', file=sys.stderr)
        print('\n使用例:', file=sys.stderr)
        print('  python search.py \'{"query": "AI news", "limit": 10}\'', file=sys.stderr)
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f'❌ エラー: 無効なJSON形式: {e}', file=sys.stderr)
        sys.exit(1)

    # Make HTTP request
    url = f"{server_url.rstrip('/')}/api/tools/search"
    data = json.dumps(params).encode('utf-8')
    headers = {'Content-Type': 'application/json'}

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=60) as response:
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

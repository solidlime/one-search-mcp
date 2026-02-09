#!/usr/bin/env python3
"""
OneSearch - URL Mapping Tool

Usage:
    python map.py '{"url": "https://example.com", "limit": 100}'

Environment variable required:
    ONE_SEARCH_URL - URL of the OneSearch MCP server (e.g., http://localhost:8000)
"""

import json
import os
import sys
import urllib.request
import urllib.error

# 環境変数でPythonのI/OエンコーディングをUTF-8に強制
os.environ['PYTHONIOENCODING'] = 'utf-8'

# コンソール出力のエンコーディングをUTF-8に設定（Windows対応）
if sys.platform == "win32":
    import io
    import ctypes

    # Windows APIでコンソールをUTF-8モードに設定
    try:
        # コンソールの出力コードページをUTF-8 (65001) に設定
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleOutputCP(65001)
        kernel32.SetConsoleCP(65001)
    except Exception:
        pass  # 失敗しても続行（管理者権限不要の環境用）

    # stdout/stderrをUTF-8でラップ
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
else:
    # Linux/Macでもエンコーディングを明示
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)


def get_server_url():
    """Get server URL from config file or environment variable"""
    # 1. Try to load from config.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    skill_dir = os.path.dirname(script_dir)  # scripts/ の親

    # config.jsonのパスを決定（skill_root_pathが設定されていればそれを使用）
    config_path = os.path.join(skill_dir, 'references', 'config.json')

    config = None
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)

                # skill_root_pathが設定されている場合はそれを使用
                if config.get('skill_root_path'):
                    skill_dir = config['skill_root_path']
                    config_path = os.path.join(skill_dir, 'references', 'config.json')
                    # 再度読み込み
                    with open(config_path, 'r', encoding='utf-8') as f2:
                        config = json.load(f2)

                return config.get('mcp_server_url')
        except Exception as e:
            print(f'⚠ 警告: 設定ファイル読み込みエラー: {{e}}', file=sys.stderr)

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
        print('❌ エラー: マッピングパラメータが必要です', file=sys.stderr)
        print('\n使用例:', file=sys.stderr)
        print('  python map.py \'{"url": "https://example.com", "limit": 100}\'', file=sys.stderr)
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(f'❌ エラー: 無効なJSON形式: {e}', file=sys.stderr)
        sys.exit(1)

    # Make HTTP request
    url = f"{server_url.rstrip('/')}/api/tools/map"
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

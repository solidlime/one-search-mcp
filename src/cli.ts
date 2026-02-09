#!/usr/bin/env node

/**
 * OneSearch Skill CLI - Simple command-line interface for OneSearch MCP
 *
 * Usage with environment variable:
 *   ONE_SEARCH_URL=http://localhost:8000 npx one-search-skill search '{"query": "AI"}'
 *
 * Commands:
 *   search  - Web search
 *   scrape  - Scrape webpage content
 *   map     - Discover URLs from a website
 *   extract - Extract structured data from URLs
 *   health  - Server health check
 */

import { request } from 'node:http';
import { request as httpsRequest } from 'node:https';

// Check for required environment variable
const serverUrl = process.env.ONE_SEARCH_URL;

if (!serverUrl) {
  console.error('❌ エラー: 環境変数 ONE_SEARCH_URL が設定されていません\n');
  console.error('設定方法:');
  console.error('  ONE_SEARCH_URL=http://localhost:8000\n');
  console.error('使用例:');
  console.error('  ONE_SEARCH_URL=http://localhost:8000 npx one-search-skill search \'{"query": "AI"}\'\n');
  console.error('Windows PowerShellの場合:');
  console.error('  $env:ONE_SEARCH_URL="http://localhost:8000"; npx one-search-skill search \'{"query": "AI"}\'\n');
  process.exit(1);
}

// Parse command and arguments
const [,, command, argsJson] = process.argv;

if (!command) {
  console.error('❌ エラー: コマンドが指定されていません\n');
  console.error('使用可能なコマンド:');
  console.error('  search  - Web検索');
  console.error('  scrape  - ページスクレイピング');
  console.error('  map     - URLマッピング');
  console.error('  extract - データ抽出');
  console.error('  health  - サーバー健全性チェック\n');
  console.error('例:');
  console.error('  npx one-search-skill search \'{"query": "AI news"}\'');
  process.exit(1);
}

// Map commands to API endpoints
const endpoints: Record<string, string> = {
  search: '/api/tools/search',
  scrape: '/api/tools/scrape',
  map: '/api/tools/map',
  extract: '/api/tools/extract',
  health: '/health',
};

const endpoint = endpoints[command];

if (!endpoint) {
  console.error(`❌ エラー: 不明なコマンド "${command}"\n`);
  console.error('使用可能なコマンド: search, scrape, map, extract, health');
  process.exit(1);
}

// Parse arguments (except for health check)
let requestData: any = null;
if (command !== 'health') {
  if (!argsJson) {
    console.error(`❌ エラー: コマンド "${command}" には引数が必要です\n`);
    console.error('例:');
    console.error(`  npx one-search-skill ${command} '{"query": "example"}'`);
    process.exit(1);
  }

  try {
    requestData = JSON.parse(argsJson);
  } catch (error) {
    console.error('❌ エラー: JSONパースに失敗しました\n');
    console.error('引数は有効なJSON形式で指定してください:');
    console.error(`  npx one-search-skill ${command} '{"query": "example"}'`);
    process.exit(1);
  }
}

// Make API request
async function callApi(url: string, endpoint: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint, url);
    const isHttps = urlObj.protocol === 'https:';
    const requestFn = isHttps ? httpsRequest : request;

    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'one-search-skill/1.0',
      },
      timeout: 60000, // 60 seconds
    };

    const req = requestFn(urlObj, options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(body);
            console.log(JSON.stringify(result, null, 2));
            resolve();
          } catch {
            console.log(body);
            resolve();
          }
        } else {
          console.error(`❌ エラー: サーバーがステータス ${res.statusCode} を返しました\n`);
          try {
            const error = JSON.parse(body);
            console.error(JSON.stringify(error, null, 2));
          } catch {
            console.error(body);
          }
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ エラー: サーバーへの接続に失敗しました\n`);
      console.error(`URL: ${url}`);
      console.error(`エラー内容: ${error.message}\n`);
      console.error('確認事項:');
      console.error('  1. MCPサーバーが起動していますか？');
      console.error('  2. ONE_SEARCH_URL が正しく設定されていますか？');
      console.error(`  3. ${url} にアクセスできますか？`);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('❌ エラー: リクエストがタイムアウトしました\n');
      console.error('サーバーの応答が遅い可能性があります。');
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Execute
(async () => {
  try {
    await callApi(serverUrl, endpoint, requestData);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})();

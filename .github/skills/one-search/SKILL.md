---
name: one-search
description: 複数の検索エンジンを統合した検索スキル。Web検索、ページスクレイピング、URLマッピング、構造化データ抽出を提供します。
---

# OneSearch Skill

Web検索とコンテンツ抽出を行います。簡単なPythonスクリプトで操作できます。

## 使い方

```bash
# スクリプトの場所に移動
cd .github/skills/scripts

# Web検索
python one_search_mcp.py search '{"query": "TypeScript tutorial", "limit": 5}'

# ページスクレイピング
python one_search_mcp.py scrape '{"url": "https://example.com", "formats": ["markdown"]}'

# URLマッピング
python one_search_mcp.py map '{"url": "https://example.com", "limit": 100}'

# データ抽出
python one_search_mcp.py extract '{"urls": ["https://example.com"], "prompt": "タイトルを抽出"}'

# サーバー健全性チェック
python one_search_mcp.py health
```

## 主な操作

### search - Web検索
```bash
python one_search_mcp.py search '{
  "query": "TypeScript MCP",
  "limit": 10,
  "language": "auto",
  "categories": "general"
}'
```

**パラメータ**:
- `query` (必須): 検索キーワード
- `limit`: 取得件数（デフォルト: 10）
- `language`: 言語コード（`en`, `ja`, `auto`）
- `categories`: `general`, `news`, `images`, `videos`, `it`, `science`, `map`, `music`, `files`, `social_media`
- `timeRange`: `all`, `day`, `week`, `month`, `year`

### scrape - ページスクレイピング
```bash
# 基本的なスクレイピング
python one_search_mcp.py scrape '{
  "url": "https://example.com/article",
  "formats": ["markdown"],
  "onlyMainContent": true
}'

# アクション実行後にスクレイピング
python one_search_mcp.py scrape '{
  "url": "https://example.com",
  "actions": [
    {"type": "wait", "milliseconds": 2000},
    {"type": "click", "selector": "#load-more"}
  ],
  "formats": ["markdown"]
}'
```

**パラメータ**:
- `url` (必須): スクレイピング対象URL
- `formats`: `markdown`, `html`, `rawHtml`, `screenshot`, `links`, `screenshot@fullPage`, `extract`
- `onlyMainContent`: メインコンテンツのみ抽出
- `waitFor`: 動的コンテンツ読み込み待機時間（ms）
- `actions`: 実行するアクション配列

**アクションタイプ**: `wait`, `click`, `screenshot`, `write`, `press`, `scroll`, `scrape`, `executeJavascript`

### map - URLマッピング
```bash
python one_search_mcp.py map '{
  "url": "https://example.com",
  "search": "tutorial",
  "limit": 100
}'
```

**パラメータ**:
- `url` (必須): 開始URL
- `search`: URLフィルター用キーワード
- `ignoreSitemap`: sitemap.xmlをスキップ
- `sitemapOnly`: sitemap.xmlのみ使用
- `includeSubdomains`: サブドメインも含める
- `limit`: 取得URL数の上限

### extract - 構造化データ抽出
```bash
python one_search_mcp.py extract '{
  "urls": [
    "https://example.com/product1",
    "https://example.com/product2"
  ],
  "schema": {
    "name": "string",
    "price": "number",
    "inStock": "boolean"
  },
  "prompt": "商品名、価格、在庫状況を抽出してください"
}'
```

**パラメータ**:
- `urls` (必須): 抽出対象URLの配列
- `schema`: 構造化データのスキーマ定義
- `prompt`: LLM抽出用プロンプト
- `systemPrompt`: システムプロンプト
- `enableWebSearch`: 追加コンテキストのためWeb検索を有効化

## コツ

1. **limit設定**: 必要最小限の件数だけ取得して高速化
2. **onlyMainContent**: スクレイピング時は不要な部分を除外
3. **プロバイダー選択**: 開発は `local` や `duckduckgo`、本番は `searxng` が安定
4. **タイムアウト調整**: 遅いサイトは `mcp-config.json` で `search_timeout` を増やす
5. **アクション活用**: 動的コンテンツは `actions` で読み込みを待機

---

**作成日**: 2026年2月9日

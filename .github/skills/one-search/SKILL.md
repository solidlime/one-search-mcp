---
name: one-search
description: 複数の検索エンジンを統合した検索スキル。Web検索、ページスクレイピング、URLマッピング、構造化データ抽出を提供します。
---

# OneSearch Skill

Web検索とコンテンツ抽出を行います。npxコマンドで簡単に操作できます。

## インストール

### 自動実行（推奨）
npxを使えばインストール不要で実行できます：
```bash
npx one-search-skill health
```

### グローバルインストール
頻繁に使う場合はグローバルインストールも可能：
```bash
npm install -g one-search-mcp
one-search-skill health
```

## 設定
MCPサーバーのアドレスを環境変数で指定：

```bash
export ONE_SEARCH_URL=http://nas:8000
```

## 使い方

### Web検索
```bash
npx one-search-skill search '{"query": "TypeScript tutorial", "limit": 5}'
```

### ページスクレイピング
```bash
npx one-search-skill scrape '{"url": "https://example.com", "formats": ["markdown"]}'
```

### URLマッピング
```bash
npx one-search-skill map '{"url": "https://example.com", "limit": 100}'
```

### データ抽出
```bash
npx one-search-skill extract '{"urls": ["https://example.com"], "prompt": "タイトルを抽出"}'
```

### サーバー健全性チェック
```bash
npx one-search-skill health
```

## 主な操作

### search - Web検索

```bash
npx one-search-skill search '{
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
npx one-search-skill scrape '{
  "url": "https://example.com/article",
  "formats": ["markdown"],
  "onlyMainContent": true
}'

# アクション実行後にスクレイピング
npx one-search-skill scrape '{
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
npx one-search-skill map '{
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
npx one-search-skill extract '{
  "urls": [
    "https://example.com/product1",
    "https://example.com/product2"
  ],
  "prompt": "商品名、価格、在庫状況を抽出してください"
}'
```

**パラメータ**:
- `urls` (必須): 抽出対象URLの配列
- `schema`: 構造化データのスキーマ定義（オプション）
- `prompt`: LLM抽出用プロンプト
- `systemPrompt`: システムプロンプト（オプション）
- `enableWebSearch`: 追加コンテキストのためWeb検索を有効化（オプション）

## コツ

1. **limit設定**: 必要最小限の件数だけ取得して高速化
2. **onlyMainContent**: スクレイピング時は不要な部分を除外
3. **環境変数の永続化**: `.bashrc` や `.zshrc` に `export ONE_SEARCH_URL=...` を追加
4. **プロバイダー選択**: サーバー側で環境変数 `SEARCH_PROVIDER` で設定
5. **アクション活用**: 動的コンテンツは `actions` で読み込みを待機

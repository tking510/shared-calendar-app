# 共有カレンダーアプリ デプロイガイド

このガイドでは、アプリを永続的にデプロイする方法を説明します。

## 必要なサービス

| サービス | 用途 | 料金 |
|---------|------|------|
| [Vercel](https://vercel.com) | フロントエンド（ウェブUI） | 無料 |
| [Railway](https://railway.app) | バックエンド + データベース | 無料枠あり（月$5〜） |

## デプロイ手順

### Step 1: Railwayでバックエンド + データベースをデプロイ

1. [Railway](https://railway.app) にGitHubでログイン
2. 「New Project」→「Deploy from GitHub repo」を選択
3. `tking510/shared-calendar-app` リポジトリを選択
4. 以下の設定を行う：
   - **Root Directory**: `server`
   - **Start Command**: `pnpm start`

5. 「Add Service」→「Database」→「MySQL」を追加

6. 環境変数を設定（Settings → Variables）：
   ```
   DATABASE_URL=mysql://[Railwayが自動生成]
   NODE_ENV=production
   ```

7. デプロイ完了後、RailwayのURLをメモ（例: `https://your-app.railway.app`）

### Step 2: Vercelでフロントエンドをデプロイ

1. [Vercel](https://vercel.com) にGitHubでログイン
2. 「Add New」→「Project」を選択
3. `tking510/shared-calendar-app` リポジトリをインポート
4. 以下の設定を行う：
   - **Framework Preset**: Other
   - **Build Command**: `pnpm expo export -p web`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

5. 環境変数を設定：
   ```
   EXPO_PUBLIC_API_URL=https://[RailwayのURL]/api
   ```

6. 「Deploy」をクリック

### Step 3: 動作確認

1. Vercelが発行したURLにアクセス
2. ログインして予定を作成
3. Telegram通知が届くか確認

## 環境変数一覧

### バックエンド（Railway）

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | MySQLデータベースURL（Railwayが自動設定） |
| `NODE_ENV` | `production` |

### フロントエンド（Vercel）

| 変数名 | 説明 |
|--------|------|
| `EXPO_PUBLIC_API_URL` | バックエンドAPIのURL |

## トラブルシューティング

### データベース接続エラー
- RailwayのMySQLサービスが起動しているか確認
- `DATABASE_URL`が正しく設定されているか確認

### API接続エラー
- `EXPO_PUBLIC_API_URL`がRailwayのURLと一致しているか確認
- CORSの設定を確認

### Telegram通知が届かない
- Bot TokenとChat IDが正しく設定されているか確認
- Botがグループに追加されているか確認（グループ通知の場合）

## カスタムドメインの設定

### Vercel
1. Settings → Domains
2. カスタムドメインを追加
3. DNSレコードを設定

### Railway
1. Settings → Domains
2. カスタムドメインを追加
3. DNSレコードを設定

## サポート

問題が発生した場合は、GitHubのIssuesでお知らせください。

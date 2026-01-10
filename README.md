<div align="center">
  <h1 align="center">Doc</h1>
  <h3>安全的文件分享平台</h3>
</div>

<div align="center">
  <a href="https://doc.rwa.nexus">doc.rwa.nexus</a>
</div>

<br/>

Doc 是一個自架的文件分享平台，提供安全的文件連結分享、瀏覽追蹤和自訂品牌功能。

## 功能特色

- **安全連結分享:** 透過自訂連結安全分享文件
- **自訂品牌:** 支援自訂網域和品牌設定
- **瀏覽分析:** 文件追蹤和頁面分析
- **自架部署:** 完全掌控資料和自訂功能
- **中文介面:** 登入和認證頁面完整中文化

## 技術架構

| 技術 | 用途 |
|------|------|
| [Next.js](https://nextjs.org/) | 前端框架 |
| [TypeScript](https://www.typescriptlang.org/) | 程式語言 |
| [Tailwind CSS](https://tailwindcss.com/) | CSS 框架 |
| [shadcn/ui](https://ui.shadcn.com) | UI 元件 |
| [Prisma](https://prisma.io) | ORM |
| [PostgreSQL](https://www.postgresql.org/) | 資料庫 |
| [NextAuth.js](https://next-auth.js.org/) | 身份驗證 |
| [Gmail SMTP](https://support.google.com/mail/answer/7126229) | 郵件發送 |

## 部署資訊

### 伺服器配置

| 項目 | 值 |
|------|-----|
| 主機 | 192.168.1.105 |
| Port | 6010 |
| 網域 | doc.rwa.nexus |
| 服務 | doc.service (systemd) |
| 反向代理 | 192.168.1.114 (Apache) |

### 資料庫

| 項目 | 值 |
|------|-----|
| 類型 | PostgreSQL |
| Host | localhost:5432 |
| 資料庫名稱 | doc |
| 使用者 | doc |

### 認證方式

- ✅ Google OAuth
- ✅ Email Magic Link (Gmail SMTP)

### 郵件發送

使用 Gmail SMTP 發送驗證郵件：
- 帳號: reyerchu@defintek.io
- 使用應用程式密碼認證

## 自架優化

本專案針對自架部署進行了以下優化：

### 已移除的功能

| 功能 | 原因 |
|------|------|
| Upstash Qstash | 改用直接發送 |
| Upstash Redis | 自架不需要 Rate Limiting |
| Resend | 改用 Gmail SMTP |
| Slack Integration | 不需要 |
| LinkedIn Login | 不需要 |
| Passkey Login | 不需要 |
| Pro/Business 升級廣告 | 自架不需要 |
| Usage Progress | 自架不需要 |

### 已新增/修改的功能

| 功能 | 說明 |
|------|------|
| Gmail SMTP | 郵件發送改用 Nodemailer + Gmail |
| 中文介面 | 登入/註冊/驗證頁面中文化 |
| RWA Nexus 品牌 | 自訂 Logo 和配色 (#1a3a6e) |
| 簡化登入頁面 | 移除右側 testimonials |

## 本地開發

### 前置需求

- Node.js >= 22
- PostgreSQL 資料庫
- Gmail 帳號 (需開啟應用程式密碼)

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/rwanexus/doc.git
cd doc

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 設定:
# - NEXTAUTH_URL
# - NEXTAUTH_SECRET
# - POSTGRES_PRISMA_URL
# - GMAIL_USER
# - GMAIL_APP_PASSWORD
# - GOOGLE_CLIENT_ID (可選)
# - GOOGLE_CLIENT_SECRET (可選)

# 4. 初始化資料庫
npx prisma db push

# 5. 啟動開發伺服器
npm run dev
```

### 生產環境部署

```bash
# 建置
npm run build

# 啟動 (指定 port)
npm start -- -p 6010
```

### Systemd 服務

```ini
[Unit]
Description=Doc Document Sharing Service
After=network.target postgresql.service

[Service]
Type=simple
User=reyerchu
WorkingDirectory=/home/reyerchu/doc
Environment=NODE_ENV=production
ExecStart=/home/reyerchu/.nvm/versions/node/v22.21.1/bin/npx next start -p 6010
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 環境變數

| 變數 | 說明 | 必要 |
|------|------|------|
| NEXTAUTH_URL | 網站 URL (https://doc.rwa.nexus) | ✅ |
| NEXTAUTH_SECRET | NextAuth 加密金鑰 | ✅ |
| POSTGRES_PRISMA_URL | PostgreSQL 連線字串 | ✅ |
| GMAIL_USER | Gmail 帳號 | ✅ |
| GMAIL_APP_PASSWORD | Gmail 應用程式密碼 | ✅ |
| GOOGLE_CLIENT_ID | Google OAuth Client ID | 可選 |
| GOOGLE_CLIENT_SECRET | Google OAuth Secret | 可選 |
| NEXT_PUBLIC_UPLOAD_TRANSPORT | 上傳方式 (local) | ✅ |
| UPLOAD_DIR | 上傳目錄路徑 | ✅ |

## 授權

本專案基於 AGPLv3 授權。詳見 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)。

## 來源

本專案 Fork 自 [mfts/papermark](https://github.com/mfts/papermark)，並進行自架部署優化。

---

**維護者:** RWA Nexus Team  
**原始專案:** [Papermark](https://github.com/mfts/papermark)

## Bug 修復記錄

### 2026-01-07: 登入按鈕顯示問題修復

**問題描述:**
- 用戶已登入但左下角仍顯示「登入」按鈕
- 點擊「登入」按鈕卻執行登出操作 (signOut)

**原因分析:**
- `session.user` 資料載入延遲時，判斷邏輯錯誤
- 原本的條件 `status === "unauthenticated" || !session?.user` 在 session 還在載入時也會觸發

**修復內容:**
- 修改 `components/sidebar/nav-user.tsx`
- 當 `status === "authenticated"` 但 `session.user` 尚未載入時，顯示載入動畫
- 只有在 `status === "unauthenticated"` 時才顯示「登入」按鈕
- 將「登入」按鈕改為導向 `/login` 頁面

## 最近更新 (2026-01-11)

### 品牌更新
- 更新 Logo 和 Icon 為 RWA Nexus 品牌
- 更新 Favicon 為 RWA Nexus 圖標

### 法律頁面
新增法律頁面（位於 `/public/legal/`）：
- 隱私權政策：`/legal/privacy-policy.html`
- 免責聲明：`/legal/disclaimer.html`
- 使用條款：`/legal/terms-of-use.html`

### 側邊欄更新
- 新增法律頁面連結（隱私權政策、免責聲明、使用條款）
- 移除 All Datarooms、Visitors、Branding 選項
- 簡化導航選單為：Dashboard、All Documents、Settings

### 檔案變更
- `/public/_static/doc-logo.png` - RWA Nexus 主 logo
- `/public/_static/doc-icon.svg` - RWA Nexus 圖標 (SVG)
- `/public/_static/doc-logo.svg` - RWA Nexus logo (SVG)
- `/public/favicon.ico` - RWA Nexus favicon
- `/components/sidebar/app-sidebar.tsx` - 側邊欄更新

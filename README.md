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

## 技術架構

- [Next.js](https://nextjs.org/) – 前端框架
- [TypeScript](https://www.typescriptlang.org/) – 程式語言
- [Tailwind](https://tailwindcss.com/) – CSS 框架
- [shadcn/ui](https://ui.shadcn.com) - UI 元件
- [Prisma](https://prisma.io) - ORM
- [PostgreSQL](https://www.postgresql.org/) - 資料庫
- [NextAuth.js](https://next-auth.js.org/) – 身份驗證

## 部署資訊

### 伺服器

| 項目 | 值 |
|------|-----|
| 主機 | 192.168.1.105 |
| Port | 6010 |
| 網域 | doc.rwa.nexus |
| 服務 | doc.service (systemd) |

### 資料庫

| 項目 | 值 |
|------|-----|
| 類型 | PostgreSQL |
| Host | localhost:5432 |
| 資料庫名稱 | doc |

### 認證方式

- Google OAuth
- Email 登入

### 郵件發送

- Gmail SMTP (reyerchu@defintek.io)

## 本地開發

### 前置需求

- Node.js >= 22
- PostgreSQL 資料庫

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/rwanexus/doc.git
cd doc

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 設定資料庫和認證

# 4. 初始化資料庫
npx prisma db push

# 5. 啟動開發伺服器
npm run dev
```

### 生產環境部署

```bash
# 建置
npm run build

# 啟動
npm start -- -p 6010
```

## 自架優化

本專案針對自架部署進行了以下優化：

- ❌ 移除 Upstash/Qstash 依賴
- ❌ 移除 Rate Limiting (自架不需要)
- ❌ 移除升級提示和廣告
- ✅ 支援 Gmail SMTP 發送郵件
- ✅ 支援 Google OAuth 登入
- ✅ 本地 PostgreSQL 資料庫

## 授權

本專案基於 AGPLv3 授權。詳見 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)。

## 來源

本專案 Fork 自 [mfts/papermark](https://github.com/mfts/papermark)，並進行自架部署優化。

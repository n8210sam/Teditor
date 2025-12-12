# TextEdit - 文字編輯器

支援 TXT 和 HTML 編輯與預覽的 PWA 文字編輯器

## ✨ 功能特點

- 📝 **雙模式編輯**：支援純文字（TXT）和富文本（HTML）編輯
- 🎨 **所見即所得**：HTML 模式提供完整的格式化工具列
- 👁️ **即時預覽**：隨時切換編輯和預覽模式
- 📱 **響應式設計**：完美適配手機和桌面裝置
- 💾 **檔案管理**：支援開啟和儲存 .txt / .html 檔案
- 🌓 **深色主題**：內建優雅的深色介面
- 📦 **PWA 支援**：可安裝為獨立應用程式
- 🔒 **隱私優先**：所有操作在本地進行，不上傳資料

## 🚀 快速開始

### 本地開發

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev

# 開啟瀏覽器訪問
# http://localhost:3000
```

### 建置生產版本

```bash
# 建置
pnpm build

# 啟動生產伺服器
pnpm start
```

## 📦 Android APK

### 自動建置

本專案已設置 GitHub Actions 自動建置 APK：

1. **推送到 main/master 分支**：自動建置並上傳 APK artifact
2. **建立版本標籤**：例如 `git tag v1.0.0 && git push --tags`，會自動建立 Release 並附上 APK

### 下載 APK

- 前往 [Actions](../../actions) 頁面查看建置結果
- 前往 [Releases](../../releases) 下載最新版本

## 🛠️ 技術棧

- **框架**：Next.js 16 + React 19
- **語言**：TypeScript
- **樣式**：Tailwind CSS v4
- **UI 元件**：shadcn/ui
- **打包**：PWA Builder (GitHub Actions)

## 📱 PWA 功能

### 網頁版（含分析）
- 直接訪問網站使用
- 包含 Vercel Analytics 追蹤

### PWA 安裝版（無分析）
- 可安裝為獨立應用程式
- 自動停用 Analytics
- 離線可用（Service Worker）
- 全螢幕體驗

## 📄 授權

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！（AI場面話，勿當真）

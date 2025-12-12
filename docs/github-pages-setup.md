# GitHub Pages 部署指南

## 🎯 目的

將 TextEdit PWA 部署到 GitHub Pages，獲得一個公開的 HTTPS 網址，以便：
1. 讓 TWA (Trusted Web Activity) 可以使用（不支援 localhost）
2. 讓用戶可以直接訪問網頁版
3. PWA 可以被安裝和離線使用

---

## 📋 前置準備

### ✅ 已完成
- [x] Next.js 專案配置為靜態導出 (`output: 'export'`)
- [x] GitHub Actions workflow (`deploy-pages.yml`)
- [x] 入口頁面 (`public/index.html`)
- [x] Analytics 在 GitHub Pages 自動停用

---

## 🚀 部署步驟

### **步驟 1：啟用 GitHub Pages**

1. 前往你的 GitHub 倉庫
2. 點擊 **Settings** (設定)
3. 在左側選單找到 **Pages**
4. 在 **Build and deployment** 區域：
   - Source: 選擇 **GitHub Actions**
   
5. 儲存設定

### **步驟 2：推送代碼觸發部署**

```bash
git add .
git commit -m "feat: 新增 GitHub Pages 部署配置"
git push origin main
```

### **步驟 3：等待部署完成**

1. 前往 **Actions** 頁籤
2. 觀察 "Deploy to GitHub Pages" workflow 執行
3. 完成後會顯示部署的網址

### **步驟 4：取得你的網址**

部署完成後，你的網址會是：
```
https://你的使用者名稱.github.io/Teditor/
```

---

## 🔧 配置說明

### **`next.config.mjs` 重要設定**

```javascript
{
  // 啟用靜態導出
  output: 'export',
  
  // 如果倉庫名稱不是根目錄，需要設定 basePath
  // basePath: '/Teditor',  // 倉庫名稱為 Teditor
  
  // 圖片優化需停用
  images: {
    unoptimized: true,
  },
}
```

### **`basePath` 何時需要？**

- ✅ **需要設定**：倉庫網址是 `https://username.github.io/Teditor/`
- ❌ **不需要設定**：倉庫網址是 `https://username.github.io/` (使用 username.github.io 作為倉庫名稱)

**如何設定 basePath：**
1. 打開 `next.config.mjs`
2. 取消註解 `basePath` 那一行
3. 改為你的倉庫名稱：`basePath: '/Teditor'`
4. 重新推送並部署

---

## 📱 更新 TWA 配置

部署完成後，需要更新 Android APK 建置配置：

### **更新 GitHub Actions (`build-apk.yml`)**

將 `localhost:3000` 改為你的 GitHub Pages 網址：

```yaml
# 建立自動回答腳本
cat > answers.txt << 'ANSWERS'
Y
Y
TextEdit
TextEdit
com.textedit.app
你的使用者名稱.github.io      # ← 改這裡
/Teditor/                      # ← 改這裡（如果有 basePath）
standalone
#1a1a1a
https://你的使用者名稱.github.io/Teditor/apple-icon.png  # ← 改這裡
ANSWERS

# 初始化時使用 GitHub Pages URL
bubblewrap init --manifest=https://你的使用者名稱.github.io/Teditor/manifest.json --directory=./twa-project
```

### **更新本地建置腳本**

如果你要在本地建置 APK，也需要更新 `build-apk-local.ps1` 中的網址。

---

## 🧪 測試部署

### **驗證清單：**

1. **網站可訪問**
   ```
   https://你的使用者名稱.github.io/Teditor/
   ```

2. **Manifest 正常**
   ```
   https://你的使用者名稱.github.io/Teditor/manifest.json
   ```

3. **圖示載入**
   ```
   https://你的使用者名稱.github.io/Teditor/apple-icon.png
   ```

4. **PWA 可安裝**
   - 在 Chrome 開啟網站
   - 網址列應該出現「安裝」圖示
   - 點擊安裝測試

5. **Analytics 已停用**
   - 開啟開發者工具 Console
   - 應該看到：`[Analytics] PWA 模式: 否 (已啟用)` 或沒有 Analytics 相關訊息

---

## ⚠️ 常見問題

### **Q1: 部署後頁面是 404**

**A:** 檢查是否需要設定 `basePath`：
- 如果網址是 `https://username.github.io/Teditor/`，需要在 `next.config.mjs` 加上：
  ```javascript
  basePath: '/Teditor',
  ```

### **Q2: 圖片或資源無法載入**

**A:** 確認：
1. `images.unoptimized: true` 已設定
2. 資源路徑使用相對路徑（以 `/` 開頭）
3. 如果有 basePath，資源路徑會自動加上前綴

### **Q3: manifest.json 找不到**

**A:** 檢查：
1. `manifest.json` 在 `public/` 目錄下
2. 建置時有正確複製到 `out/` 目錄
3. 網址路徑正確（包含 basePath）

### **Q4: PWA 無法安裝**

**A:** 必須滿足：
1. 使用 HTTPS（GitHub Pages 自動提供）
2. 有效的 `manifest.json`
3. 至少一個 192x192 和 512x512 的圖示
4. 註冊 Service Worker（Next.js PWA 自動處理）

### **Q5: 部署成功但網址訪問很慢**

**A:** GitHub Pages 首次部署可能需要幾分鐘：
- 等待 5-10 分鐘
- 清除瀏覽器快取
- 嘗試無痕模式

---

## 🔄 重新部署

當你更新代碼後：

```bash
# 提交變更
git add .
git commit -m "更新內容"
git push origin main

# GitHub Actions 會自動觸發部署
# 約 3-5 分鐘完成
```

---

## 📊 部署時間參考

| 階段 | 時間 |
|------|------|
| 安裝依賴 | 1-2 分鐘 |
| 建置 Next.js | 1-2 分鐘 |
| 上傳 Pages | 30 秒 |
| 部署生效 | 1-2 分鐘 |
| **總計** | **3-6 分鐘** |

---

## 🔐 自訂網域（可選）

如果你有自己的網域：

1. 在 GitHub Pages 設定中加入 Custom domain
2. 在你的 DNS 提供商設定 CNAME 記錄
3. 更新 `next.config.mjs` 的 `basePath` 為空或移除
4. 更新 TWA 配置中的網址

---

## 📚 相關資源

- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages 文件](https://docs.github.com/en/pages)
- [PWA Manifest 規範](https://web.dev/add-manifest/)

---

_最後更新：2025-01-XX_

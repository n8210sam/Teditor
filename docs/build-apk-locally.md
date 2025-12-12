# 本地建置 Android APK 指南

## 📋 前置準備

### ✅ 已完成
- [x] Node.js 22.17.0
- [x] pnpm 10.24.0
- [x] Bubblewrap CLI 已安裝
- [x] Next.js 伺服器運行中（http://localhost:3000）

### ⚠️ 需要準備
- [ ] 第一次執行時，Bubblewrap 會自動下載：
  - JDK 17（約 200MB）
  - Android SDK（約 500MB）
  - 總共需要約 10-15 分鐘

---

## 🚀 建置步驟

### **方法 A：使用腳本（推薦）**

1. **確保 Next.js 伺服器運行中**
   ```powershell
   # 如果還沒啟動，執行：
   pnpm dev
   ```

2. **執行建置腳本**
   ```powershell
   .\build-apk-local.ps1
   ```

3. **按提示輸入**
   - 提示 1：`Do you want Bubblewrap to install the JDK?` → 輸入 `Y`
   - 提示 2：`Do you want Bubblewrap to install the Android SDK?` → 輸入 `Y`
   - 等待下載和建置（首次約 10-15 分鐘）

4. **完成！**
   - APK 位置：`twa-project/app/build/outputs/apk/release/app-release-unsigned.apk`

---

### **方法 B：手動執行（完整控制）**

#### **步驟 1：啟動 Next.js 伺服器**
```powershell
pnpm dev
# 確保 http://localhost:3000 可訪問
```

#### **步驟 2：初始化 Bubblewrap 專案**
```powershell
bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project
```

**互動式問答：**
```
? Do you want Bubblewrap to install the JDK? → Y
  (下載 JDK 17，約 3-5 分鐘)

? Do you want Bubblewrap to install the Android SDK? → Y
  (下載 Android SDK，約 5-10 分鐘)

? Application name: → 直接按 Enter（使用預設值 "TextEdit - 文字編輯器"）
? Short name: → 直接按 Enter（使用預設值 "TextEdit"）
? Application ID: → 直接按 Enter（使用預設值 "app.textedit"）
? Host: → 輸入你的網域（測試可用 "localhost"）
? Start URL: → 直接按 Enter（使用預設值 "/"）
? Display mode: → 直接按 Enter（使用預設值 "standalone"）
? Status bar color: → 直接按 Enter（使用預設值）
? Icon URL: → 直接按 Enter（使用 manifest.json 中的圖示）
```

#### **步驟 3：建置 APK**
```powershell
cd twa-project
bubblewrap build
```

**等待建置完成**（約 2-5 分鐘）

#### **步驟 4：找到 APK**
```powershell
# 查找 APK 檔案
Get-ChildItem -Recurse -Filter "*.apk"

# 通常位置：
# twa-project/app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 📱 安裝測試

### **Windows 上測試 APK：**

1. **使用 Android 模擬器**
   - 安裝 Android Studio
   - 啟動 AVD Manager
   - 拖曳 APK 到模擬器

2. **使用實體手機**
   ```powershell
   # 啟用 USB 偵錯
   # 連接手機
   # 使用 adb 安裝
   adb install twa-project/app/build/outputs/apk/release/app-release-unsigned.apk
   ```

3. **直接複製到手機**
   - 將 APK 複製到手機
   - 在手機上開啟檔案管理器
   - 點擊 APK 安裝（需啟用「未知來源」）

---

## ⚠️ 常見問題

### **Q1: Bubblewrap 卡在等待輸入**
**A:** 請手動輸入 `Y` 並按 Enter。PowerShell 的自動輸入在某些情況下無法正常工作。

### **Q2: 找不到 JDK 或 Android SDK**
**A:** Bubblewrap 會自動下載到：
- JDK: `C:\Users\你的使用者名稱\.bubblewrap\jdk`
- Android SDK: `C:\Users\你的使用者名稱\.bubblewrap\android_sdk`

### **Q3: 建置失敗 - Gradle 錯誤**
**A:** 首次建置可能需要下載額外的 Gradle 依賴，請確保網路連接正常並重試。

### **Q4: APK 無法安裝 - 解析錯誤**
**A:** 這是 unsigned APK，需要簽名才能在某些裝置上安裝。參考下方簽名步驟。

### **Q5: manifest.json 錯誤**
**A:** 確保：
- Next.js 伺服器正在運行
- 可訪問 http://localhost:3000/manifest.json
- manifest.json 包含必要的欄位（name, icons, start_url 等）

---

## 🔐 簽名 APK（可選）

未簽名的 APK 只能用於測試。如需發布，需要簽名：

### **步驟 1：生成金鑰**
```powershell
# 進入 twa-project 目錄
cd twa-project

# 生成簽名金鑰
bubblewrap create-key
```

### **步驟 2：建置簽名版本**
```powershell
bubblewrap build --signingKeyPath=./android.keystore --signingKeyAlias=android
```

### **步驟 3：驗證簽名**
```powershell
# 使用 apksigner 驗證（需 Android SDK）
apksigner verify --verbose app-release-signed.apk
```

---

## 📊 建置時間參考

| 階段 | 首次 | 後續 |
|------|------|------|
| 下載 JDK | 3-5 分鐘 | - |
| 下載 Android SDK | 5-10 分鐘 | - |
| 初始化專案 | 1 分鐘 | 30 秒 |
| 建置 APK | 3-5 分鐘 | 2-3 分鐘 |
| **總計** | **12-21 分鐘** | **2-4 分鐘** |

---

## 🔄 重新建置

如果需要重新建置（例如更新了程式碼）：

```powershell
# 方法 1：刪除舊專案重新初始化
Remove-Item -Recurse -Force twa-project
bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project
cd twa-project
bubblewrap build

# 方法 2：僅重新建置
cd twa-project
bubblewrap build
```

---

## 📝 下一步

建置成功後，你可以：

1. ✅ **測試 APK** - 在模擬器或實體裝置上安裝測試
2. ✅ **簽名 APK** - 使用 `bubblewrap create-key` 建立簽名金鑰
3. ✅ **優化圖示** - 建立標準尺寸的圖示（192x192, 512x512）
4. ✅ **設定 GitHub Actions** - 自動化建置流程
5. ✅ **發布到 Google Play** - 提交到商店

---

## 📚 相關資源

- [Bubblewrap 官方文件](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA 最佳實踐](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [Android 開發者指南](https://developer.android.com/)

---

_最後更新：2025-01-XX_

# GitHub Actions 自動建置 APK 設置記錄

## 📋 目標

使用 GitHub Actions 自動將 Next.js PWA 專案打包成 Android APK

---

## 🛠️ 最終採用方案

**工具選擇：Bubblewrap CLI**
- Google 官方的 TWA (Trusted Web Activity) 打包工具
- 將 PWA 包裝為原生 Android 應用程式
- 自動從 `manifest.json` 讀取配置

---

## 🔄 設置過程與問題修正

### **版本 1：嘗試使用 PWABuilder GitHub Action**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Generate Android APK with PWABuilder
  uses: pwa-builder/pwabuilder-github-action@v2
  with:
    site-url: 'http://localhost:3000'
    package-id: 'com.textedit.app'
```

**錯誤：**
```
Unable to resolve action pwa-builder/pwabuilder-github-action, repository not found
```

**原因：**
- PWABuilder 官方並未提供 GitHub Action
- Action marketplace 中不存在此 Action

**解決方案：**
改用 Bubblewrap CLI 直接建置

---

### **版本 2：初次使用 Bubblewrap CLI**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v3

- name: Install Bubblewrap CLI
  run: npm install -g @bubblewrap/cli

- name: Initialize Bubblewrap project
  run: |
    bubblewrap init --manifest=http://localhost:3000/manifest.json \
      --directory=./twa-project
```

**錯誤：**
```
? Do you want Bubblewrap to install the JDK (recommended)?
  (Enter "No" to use your own JDK 17 installation) (Y/n) 
Error: Process completed with exit code 130.
```

**原因：**
- Bubblewrap CLI 在初始化時會進行互動式問答
- GitHub Actions 無法提供互動式輸入
- Exit code 130 表示程序被中斷（等待輸入超時）

**解決方案：**
1. 在 Setup Android SDK 之前先安裝 JDK 17
2. 使用 `echo "Y"` 自動回答問題

---

### **版本 3：自動回答 JDK 問題**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Setup JDK 17
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'

- name: Initialize Bubblewrap project (non-interactive)
  run: |
    echo "Y" | bubblewrap init --manifest=http://localhost:3000/manifest.json \
      --directory=./twa-project
  env:
    CI: true
```

**錯誤：**
```
? Do you want Bubblewrap to install the JDK (recommended)? Yes
Downloading JDK 17 to /home/runner/.bubblewrap/jdk
...
? Do you want Bubblewrap to install the Android SDK (recommended)?
  (Enter "No" to use your own Android SDK installation) (Y/n) 
Error: Process completed with exit code 130.
```

**原因：**
- 第一個問題（JDK）成功自動回答
- 但還有第二個問題（Android SDK）等待輸入
- 單個 "Y" 只能回答一個問題

**解決方案：**
使用 `echo -e "Y\nY"` 提供多個回答

---

### **版本 4：使用 echo -e 多行輸入**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Initialize Bubblewrap project (non-interactive)
  run: |
    echo -e "Y\nY" | bubblewrap init --manifest=http://localhost:3000/manifest.json \
      --directory=./twa-project
  env:
    CI: true
```

**錯誤：**
```
? Do you want Bubblewrap to install the JDK (recommended)? Yes
Y
Downloading JDK 17...
? Do you want Bubblewrap to install the Android SDK (recommended)? 
Error: Process completed with exit code 130.
```

**原因：**
- `echo -e "Y\nY"` 在某些 shell 環境下無法正確產生多行輸入
- 第一個 "Y" 被讀取，但第二個 "Y" 並未正確傳遞
- 可能是 timing 問題或 buffer 問題

**解決方案：**
使用 `yes` 指令持續輸出 "y"

---

### **版本 5：使用 yes 指令（當前版本）**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Setup JDK 17
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'

- name: Setup Android SDK
  uses: android-actions/setup-android@v3

- name: Install Bubblewrap CLI
  run: npm install -g @bubblewrap/cli

- name: Start Next.js server
  run: |
    pnpm start &
    echo $! > server.pid
    sleep 10
    curl -f http://localhost:3000 || (echo "Server failed to start" && exit 1)

- name: Initialize Bubblewrap project (non-interactive)
  run: |
    # 使用 yes 指令自動回答所有問題為 Yes
    yes | bubblewrap init --manifest=http://localhost:3000/manifest.json \
      --directory=./twa-project || true
  env:
    CI: true

- name: Build Android APK
  run: |
    cd twa-project
    bubblewrap build --skipPwaValidation
  env:
    CI: true

- name: Stop Next.js server
  if: always()
  run: |
    if [ -f server.pid ]; then
      kill $(cat server.pid) || true
      rm server.pid
    fi

- name: Find and prepare APK
  run: |
    mkdir -p apk-output
    find twa-project -name "*.apk" -exec cp {} apk-output/ \;
    ls -lh apk-output/

- name: Upload APK artifact
  uses: actions/upload-artifact@v4
  with:
    name: TextEdit-APK
    path: apk-output/*.apk
    if-no-files-found: error
```

**狀態：** 🔄 待測試

**說明：**
- 使用 `yes` 指令持續輸出 "y"，自動回答所有 Y/n 問題
- 加上 `|| true` 避免 yes 指令被中斷時導致失敗（正常行為）
- `yes` 會持續運行直到 bubblewrap init 完成並關閉 stdin
- 設定 `CI=true` 環境變數告知 Bubblewrap 在 CI 環境運行
- 啟動臨時 Next.js 伺服器供 Bubblewrap 讀取 manifest.json
- 建置完成後自動清理伺服器進程

---

## 📝 關鍵學習點

### **1. 互動式 CLI 在 CI 環境的處理**
- ❌ `echo -e "Y\nY"` - 在某些環境下無法正確處理多行輸入
- ✅ `yes` 指令 - 持續輸出 "y" 直到程序完成，最可靠的方法
- 使用 `|| true` 避免 yes 被中斷時返回非零退出碼
- 設定 `CI=true` 環境變數可能影響某些工具的行為

### **2. Bubblewrap 的互動問題清單**
1. JDK 安裝確認
2. Android SDK 安裝確認
3. （可能還有其他問題，待實際執行時確認）

### **3. Next.js 伺服器管理**
- 使用 `&` 在背景執行
- 記錄 PID 以便後續清理
- 使用 `if: always()` 確保清理步驟總是執行

### **4. APK 檔案查找**
- Bubblewrap 產生的 APK 位置可能不固定
- 使用 `find` 指令遞迴搜尋所有 `.apk` 檔案
- 統一複製到 `apk-output/` 目錄便於管理

---

## 🚀 使用方法

### **自動觸發建置：**
```bash
# 推送到主分支
git push origin main

# 建立版本標籤（會產生 Release）
git tag v1.0.0
git push --tags
```

### **手動觸發建置：**
1. 前往 GitHub 倉庫的 **Actions** 頁面
2. 選擇 "Build Android APK" workflow
3. 點擊 **Run workflow**

### **下載 APK：**
- **Artifacts**: Actions 頁面 → 選擇執行記錄 → 下載 TextEdit-APK
- **Releases**: 推送標籤後在 Releases 頁面下載

---

## 🔮 未來可能的改進

### **1. 簽名配置**
- 目前產生的是未簽名的 debug APK
- 需要設定 keystore 以產生可發布的 release APK
- 可使用 GitHub Secrets 儲存簽名金鑰

### **2. 版本號自動化**
- 從 `package.json` 讀取版本號
- 或從 git tag 自動提取版本號

### **3. 多平台支援**
- 增加 iOS 建置（需要 macOS runner）
- Windows 版本打包

### **4. 快取優化**
- 快取 Node.js 依賴
- 快取 Bubblewrap 的 JDK 和 Android SDK 下載

### **5. 測試自動化**
- APK 建置前執行測試
- 使用 APK Analyzer 檢查產出檔案

---

## 📚 參考資源

- [Bubblewrap 官方文件](https://github.com/GoogleChromeLabs/bubblewrap)
- [TWA (Trusted Web Activity) 介紹](https://developer.chrome.com/docs/android/trusted-web-activity/)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
- [Android SDK Setup Action](https://github.com/android-actions/setup-android)

---

## 📊 建置狀態

| 版本 | 狀態 | 說明 |
|------|------|------|
| v1 (PWABuilder Action) | ❌ 失敗 | Action 不存在 |
| v2 (Basic Bubblewrap) | ❌ 失敗 | 互動式輸入問題 |
| v3 (Single Answer) | ❌ 失敗 | 仍有第二個互動問題 |
| v4 (echo -e Multi-line) | ❌ 失敗 | echo -e 無法正確傳遞多行 |
| v5 (yes Command) | 🔄 待測試 | 目前版本 |

---

_最後更新：2025-01-XX_

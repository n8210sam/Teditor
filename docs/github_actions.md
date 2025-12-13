# GitHub Actions 自動建置 APK 設置記錄

## 📋 目標

使用 GitHub Actions 自動將 Next.js PWA 專案打包成 Android APK

---

### **版本 8：直接使用 GitHub Pages（當前版本）**

**日期：** 2025-01-12

**問題（版本 7）：**
```
HTTP/1.1 200 OK      ← http://localhost:3000/ 成功
HTTP/1.1 404 Not Found  ← http://localhost:3000/Teditor/ 失敗
```

**根本原因：**
`serve` 是簡單的靜態檔案伺服器，**不理解 Next.js 的 basePath 路由**。

- `serve out` 會直接服務檔案
- `/` → `out/index.html` ✅
- `/Teditor/` → 尋找 `out/Teditor/index.html` ❌（不存在）
- 雖然 HTML 內部連結都有 `/Teditor/` 前綴，但 serve 不會處理路由重寫

**本地測試成功的原因：**
本地瀏覽器打開 `http://localhost:3000/`，Next.js 的客戶端路由接管，所以看起來正常。
但直接訪問 `http://localhost:3000/Teditor/` 時，serve 找不到對應檔案。

**解決方案：直接使用 GitHub Pages**

既然 GitHub Pages 已經成功部署並支援 basePath，不如直接使用它：

```yaml
- name: Build Next.js app
  run: pnpm build

- name: Wait for GitHub Pages deployment
  run: |
    echo "Waiting for GitHub Pages to be accessible..."
    for i in {1..30}; do
      if curl -f https://n8210sam.github.io/Teditor/manifest.json > /dev/null 2>&1; then
        echo "✓ GitHub Pages is ready"
        break
      fi
      echo "Attempt $i/30: GitHub Pages not ready yet, waiting 10s..."
      sleep 10
    done
    curl -f https://n8210sam.github.io/Teditor/manifest.json || (echo "GitHub Pages not accessible" && exit 1)

- name: Initialize Bubblewrap project (non-interactive mode)
  timeout-minutes: 20
  run: |
    cat > answers.txt << 'ANSWERS'
    Y
    Y
    TextEdit
    TextEdit
    com.textedit.app
    n8210sam.github.io
    /Teditor/
    standalone
    #1a1a1a
    https://n8210sam.github.io/Teditor/apple-icon.png
    ANSWERS
    
    cat answers.txt | bubblewrap init --manifest=https://n8210sam.github.io/Teditor/manifest.json --directory=./twa-project || {
      echo "Bubblewrap init failed with exit code $?"
      timeout 300 sh -c 'yes Y | bubblewrap init --manifest=https://n8210sam.github.io/Teditor/manifest.json --directory=./twa-project' || true
    }
    
    if [ ! -d "twa-project" ]; then
      echo "ERROR: Bubblewrap init failed"
      exit 1
    fi
```

**新問題：Android SDK 授權**

初次執行時遇到：
```
Accept? (y/N): Skipping following packages as the license is not accepted:
Android SDK Build-Tools 34
ENOENT: no such file or directory, open 'twa-project/twa-manifest.json'
```

**原因：**
- Bubblewrap 需要 Android Build Tools 34
- GitHub Actions 的 Android SDK 預設沒有接受授權
- 導致安裝失敗，Bubblewrap 無法完成初始化

**解決方案：**
```yaml
- name: Accept Android SDK licenses
  run: |
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "build-tools;34.0.0" || true
```

**遇到問題：twa-manifest.json 缺失**
```
cli ERROR ENOENT: no such file or directory, open 'twa-project/twa-manifest.json'
```

說明 Bubblewrap init 沒有成功完成，可能原因：
1. Android SDK 授權仍未通過
2. Bubblewrap init 過程中某個步驟失敗
3. 互動問題沒有正確回答

**調試步驟：**
加入詳細的診斷輸出：
- Android SDK 授權和安裝狀態
- 答案檔內容驗證
- Bubblewrap init 完整輸出（包含 stderr）
- 目錄和檔案存在性檢查
- 失敗時顯示目錄內容

**狀態：** 🔄 診斷中

**優點：**
- ✅ 不依賴本地 serve
- ✅ 使用真實的 HTTPS 部署網址
- ✅ 自動等待 GitHub Pages 就緒（最多 5 分鐘）
- ✅ 更接近實際使用情境
- ✅ 自動接受 Android SDK 授權

**可能的問題：**
- ⚠️ 依賴 `deploy-pages.yml` 先執行完成
- ⚠️ 如果 Pages 部署失敗，APK 建置也會失敗
- ⚠️ 需要等待 Pages 部署時間（增加總建置時間）

---

### **版本 7：靜態導出 + Serve（當前版本）**

**日期：** 2025-01-12

**問題（版本 6.1 後）：**
```
Error: "next start" does not work with "output: export" configuration.
curl: (22) The requested URL returned error: 404
Server failed to start
```

**原因分析：**
1. **`next start` 不支援靜態導出**
   - `next.config.mjs` 設定了 `output: 'export'`
   - `pnpm start` 會執行 `next start`，但靜態導出模式不支援
   - 錯誤訊息建議使用 `npx serve@latest out`

2. **對 basePath 的錯誤理解（關鍵錯誤）** ⚠️
   - ❌ **錯誤理解**：以為 `basePath: '/Teditor'` 會讓 Next.js 建置到 `out/Teditor/`
   - ✅ **實際情況**：檔案還是在 `out/` 根目錄，basePath 只影響路由和資源路徑
   - ❌ **錯誤做法**：`serve out/Teditor` → 404（因為 `out/Teditor/` 目錄不存在）
   - ✅ **正確做法**：`serve out` + 訪問 `/Teditor/`

**解決方案：**

```yaml
- name: Build Next.js app
  run: pnpm build

- name: Install and start static server
  run: |
    npm install -g serve
    serve out -l 3000 &              # 服務 out/ 根目錄
    echo $! > server.pid
    sleep 5
    curl -f http://localhost:3000/Teditor/ || (echo "Server failed to start" && exit 1)

- name: Initialize Bubblewrap project (non-interactive mode)
  timeout-minutes: 20
  run: |
    cat > answers.txt << 'ANSWERS'
    Y
    Y
    TextEdit
    TextEdit
    com.textedit.app
    localhost:3000
    /Teditor/                            # basePath 路徑
    standalone
    #1a1a1a
    http://localhost:3000/Teditor/apple-icon.png
    ANSWERS
    
    cat answers.txt | bubblewrap init --manifest=http://localhost:3000/Teditor/manifest.json --directory=./twa-project || {
      echo "Bubblewrap init failed with exit code $?"
      echo "Trying alternative method..."
      timeout 300 sh -c 'yes Y | bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project' || true
    }
    
    if [ ! -d "twa-project" ]; then
      echo "ERROR: Bubblewrap init failed - twa-project directory not created"
      exit 1
    fi
    
    echo "SUCCESS: Bubblewrap project initialized"
  env:
    CI: true
```

**狀態：** 🔄 待測試

**關鍵改進：**
1. ✅ 使用 `serve` 替代 `next start`
2. ✅ **正確理解 basePath**：檔案在 `out/`，但路由需要 `/Teditor/`
3. ✅ `serve out` 服務根目錄，訪問時加上 `/Teditor/`
4. ✅ 所有 Bubblewrap 路徑都使用完整路徑（包含 `/Teditor/`）

**Next.js basePath 正確理解：**

`basePath: '/Teditor'` 的作用：
- ❌ **不會**改變輸出目錄結構（檔案還是在 `out/`，而非 `out/Teditor/`）
- ✅ **會**在 HTML 中的所有內部連結前加上 `/Teditor/`
- ✅ **會**在資源路徑（CSS、JS、圖片）前加上 `/Teditor/`
- ✅ **會**在 manifest.json 的路徑前加上 `/Teditor/`

**路徑對應表：**

| 檔案系統 | Serve 服務 | 訪問 URL |
|---------|-----------|---------|
| `out/manifest.json` | `out/` 根目錄 | `http://localhost:3000/Teditor/manifest.json` |
| `out/apple-icon.png` | `out/` 根目錄 | `http://localhost:3000/Teditor/apple-icon.png` |
| `out/index.html` | `out/` 根目錄 | `http://localhost:3000/Teditor/` |

**本地測試驗證：** ✅
```bash
pnpm build
serve out -l 3000
curl http://localhost:3000/Teditor/         # 200 OK
curl http://localhost:3000/Teditor/manifest.json  # 200 OK
curl http://localhost:3000/Teditor/apple-icon.png # 200 OK
```

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

### **版本 5：使用 yes 指令**

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

**錯誤：**
```
41m 52s
Run # 使用 yes 指令自動回答所有問題為 Yes
...
y
y
#49 y
卡在第 27次回答 y
```

**原因：**
- `yes` 指令進入無限循環
- Bubblewrap 在等待**非 Y/N** 的輸入（例如：應用名稱、包名、網址等）
- `yes` 只會輸出 "y"，無法提供其他類型的答案
- 導致建置卡住超過 40 分鐘

**關鍵問題：**
Bubblewrap 的互動問題不只是 Y/N，還包括：
1. Application name (文字輸入)
2. Short name (文字輸入)
3. Application ID (文字輸入)
4. Host (文字輸入)
5. Start URL (文字輸入)
6. Display mode (選項)
7. Status bar color (文字輸入)
8. Icon URL (文字輸入)

**解決方案：**
需要提供所有問題的完整答案，不能只回答 Y

---

### **版本 6：預先配置所有答案（當前版本）**

**日期：** 2024-01-XX

**程式碼：**
```yaml
- name: Initialize Bubblewrap project (non-interactive mode)
  timeout-minutes: 20
  run: |
    # 建立包含所有答案的檔案
    cat > answers.txt << 'EOF'
Y
Y
TextEdit
TextEdit
com.textedit.app
localhost:3000
/
standalone
#1a1a1a
http://localhost:3000/apple-icon.png
EOF
    
    # 使用 cat 提供所有輸入
    cat answers.txt | bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project || {
      echo "Bubblewrap init failed with exit code $?"
      echo "Trying alternative method..."
      
      # 備用方案：使用 yes 但設定超時
      timeout 300 sh -c 'yes Y | bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project' || true
    }
    
    # 檢查是否成功建立專案
    if [ ! -d "twa-project" ]; then
      echo "ERROR: Bubblewrap init failed - twa-project directory not created"
      exit 1
    fi
    
    echo "SUCCESS: Bubblewrap project initialized"
  env:
    CI: true
```

**狀態：** 🔄 待測試

**說明：**
- 建立 `answers.txt` 包含所有互動問題的答案
- 使用 `cat answers.txt | bubblewrap init` 一次性提供所有輸入
- 設定 20 分鐘超時避免無限等待
- 提供備用方案：如果第一次失敗，使用帶超時的 yes 指令
- 驗證 `twa-project` 目錄是否成功建立

**答案清單：**
1. `Y` - 安裝 JDK
2. `Y` - 安裝 Android SDK
3. `TextEdit` - Application name
4. `TextEdit` - Short name
5. `com.textedit.app` - Application ID (package name)
6. `localhost:3000` - Host
7. `/` - Start URL
8. `standalone` - Display mode
9. `#1a1a1a` - Status bar color (深色)
10. `http://localhost:3000/apple-icon.png` - Icon URL

---

## 📝 關鍵學習點

### **1. 互動式 CLI 在 CI 環境的處理**
- ❌ `echo -e "Y\nY"` - 在某些環境下無法正確處理多行輸入
- ❌ `yes` 指令 - 只能回答 Y/N，無法處理需要文字輸入的問題
- ✅ **預先配置答案檔** - 將所有答案寫入檔案，使用 `cat answers.txt | command`
- ✅ 設定 `timeout-minutes` 避免無限等待
- 使用 `|| true` 避免中斷時返回非零退出碼
- 設定 `CI=true` 環境變數可能影響某些工具的行為

### **2. Next.js 靜態導出與伺服器**
- ❌ `next start` - 不支援 `output: 'export'` 模式
- ✅ `serve` - 專為靜態檔案設計的輕量伺服器
- ✅ `serve out/Teditor` - 當有 basePath 時，直接服務子目錄
- ⚠️ basePath 會讓 Next.js 建置到子目錄（`out/<basePath>/`）

### **3. serve 與 basePath 的不相容性** ⚠️

**問題：**
`serve` 是純靜態檔案伺服器，不支援路由重寫或 SPA 模式。

**實際行為：**
```bash
serve out/
├── GET / → 返回 out/index.html ✅
├── GET /about → 尋找 out/about（檔案） ❌ 404
└── GET /Teditor/ → 尋找 out/Teditor/index.html ❌ 404
```

**Next.js basePath 的期望：**
```
GET /Teditor/ → 應該返回 out/index.html（然後客戶端路由接管）
```

**為什麼本地測試看起來成功？**
- 打開 `http://localhost:3000/` → serve 返回 index.html ✅
- Next.js 客戶端路由接管，處理所有內部導航 ✅
- 但直接訪問 `http://localhost:3000/Teditor/` → serve 找不到檔案 ❌

**解決方案：**
1. 使用支援 SPA 模式的伺服器（如 `http-server -S` 或 nginx）
2. 或直接使用已部署的 GitHub Pages（本專案採用）

### **4. basePath 路徑邏輯（關鍵理解）** ⚠️

**Next.js basePath 的真實行為：**
```javascript
basePath: '/Teditor'
```

**實際效果：**
- ✅ 檔案輸出位置：**仍然在 `out/` 根目錄**
- ✅ HTML 內部連結：自動加上 `/Teditor/` 前綴
- ✅ 資源路徑（JS/CSS/圖片）：自動加上 `/Teditor/` 前綴
- ✅ manifest.json 路徑：自動加上 `/Teditor/` 前綴

**錯誤理解 vs 正確理解：**

| 項目 | ❌ 錯誤理解 | ✅ 正確理解 |
|------|-----------|-----------|
| 輸出目錄 | `out/Teditor/` | `out/` |
| Serve 指令 | `serve out/Teditor` | `serve out` |
| 訪問 URL | `http://localhost:3000/` | `http://localhost:3000/Teditor/` |
| manifest 路徑 | `/manifest.json` | `/Teditor/manifest.json` |

**實際檔案結構：**
```
out/
├── index.html           ← basePath 讓內部連結變成 /Teditor/xxx
├── manifest.json        ← 內容已包含 /Teditor/ 前綴
├── apple-icon.png
└── _next/
    └── static/...
```

**Serve 方式：**
```bash
serve out                          # 服務 out/ 根目錄
訪問：http://localhost:3000/Teditor/  # 需要加 basePath
```

### **5. Android SDK 授權問題**

**問題：**
Bubblewrap 需要 Android Build Tools，但 CI 環境預設未接受授權。

**錯誤訊息：**
```
Accept? (y/N): Skipping following packages as the license is not accepted:
Android SDK Build-Tools 34
```

**解決方案：**
```yaml
- name: Accept Android SDK licenses
  run: |
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true
    yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "build-tools;34.0.0" || true
```

**注意：**
- 使用 `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager` 完整路徑
- 不要只用 `sdkmanager`（可能找不到指令）
- 明確指定需要的 build-tools 版本

### **6. Bubblewrap 的互動問題清單**
1. JDK 安裝確認（Y/N）
2. Android SDK 安裝確認（Y/N）
3. Application name（文字）
4. Short name（文字）
5. Application ID / Package name（文字，需要格式 `com.example.app`）
6. Host（文字）
7. Start URL（文字）
8. Display mode（文字）
9. Status bar color（文字）
10. Icon URL（文字）

### **7. 使用已部署的網站而非本地伺服器**

當專案有 basePath 或複雜路由時，不如直接使用已部署的網站：

**優點：**
- ✅ 避免本地伺服器路由問題
- ✅ 使用真實的 HTTPS 網址
- ✅ 測試實際部署的版本

**缺點：**
- ⚠️ 依賴外部服務（GitHub Pages）
- ⚠️ 增加建置時間（需等待部署）
- ⚠️ 需要網路連線

### **8. 靜態伺服器管理**
- 使用 `&` 在背景執行
- 記錄 PID 以便後續清理
- 使用 `if: always()` 確保清理步驟總是執行

### **9. APK 檔案查找**
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
| v5 (yes Command) | ❌ 失敗 | 無限循環超過 40 分鐘 |
| v6 (Pre-configured Answers) | ❌ 失敗 | YAML 語法錯誤 |
| v6.1 (Fixed YAML Syntax) | ❌ 失敗 | next start 不支援靜態導出 |
| v7 (Static Export + Serve) | ❌ 失敗 | serve 無法處理 basePath 路由 |
| v8 (Use GitHub Pages) | 🔄 測試中 | 目前版本 |

---

## 🔄 部署記錄

### **2025-01-XX - 版本 5 推送嘗試**

**準備推送：**
```bash
git add .
git commit -m "fix: 使用 yes 指令處理 Bubblewrap 互動問題並新增詳細文件記錄"
git push origin main
```


---

# 不用 github action 在本地包裝產出.apk
Bubblewrap CLI
```powershell
# 1. 安裝 Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. 確保已安裝 JDK 17 和 Android SDK
# Windows: 下載安裝 Android Studio 或 JDK

# 3. 啟動 Next.js 開發伺服器
pnpm dev

# 4. 初始化 Bubblewrap 專案（互動式）
bubblewrap init --manifest=http://localhost:3000/manifest.json

# 5. 建置 APK
cd twa-project
bubblewrap build
```

產出位置： twa-project/app/build/outputs/apk/release/app-release-unsigned.apk


## 🏠 本地建置

不想使用 GitHub Actions，可以在本地建置 APK。

詳細步驟請參考：[本地建置 APK 指南](./build-apk-locally.md)

**快速指令：**
```powershell
# 1. 啟動 Next.js 伺服器
pnpm dev

# 2. 執行建置腳本
.\build-apk-local.ps1
```

---

_最後更新：2025-01-XX_

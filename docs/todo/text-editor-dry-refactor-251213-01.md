# TextEditor DRY 精修計畫（components/text-editor.tsx）

版本: 25'12/13-01
主代理最後閱讀必讀文件: 不存在 .rovodev/main-agent.md（本次無可讀）；AGENTS.* 未見（已掃描根目錄）

目標
- 依用戶要求移除重複「預覽」按鈕（Header 與 Dropdown），僅保留 wsgi 編輯器上方工具列的預覽（HTML 工具列）
- 抽取重複的游標移動按鈕群為可重用元件（6個按鈕：開頭/左/上/下/右/結尾）並在 HTML/TXT 模式共用
- 統一 TXT 模式按鈕排序為：全選/複製/貼上 → 分隔線 → 游標按鈕（與 HTML 模式一致）
- 其他可見且安全的 DRY 化（最小改動、功能不變）

關鍵原則
- DRY：相同 UI/邏輯集中到單一元件/函式
- 最小改動：不改行為、不動樣式（除刪重複）
- 可維護性：未來只需改一處

關鍵路徑（依賴順序）
1) 刪除 Header/Dropdown 的預覽按鈕 → 2) 建立 CursorNavigationButtons 元件 → 3) 以新元件替換兩處游標群 → 4) 調整 TXT 排序與樣式對齊 → 5) 補齊型別/匯入 → 6) 簡易回歸測試

檔案範圍
- 單檔：components/text-editor.tsx（688 行）

子任務清單（可供 Coder 單次完成）

A. 移除重複「預覽」按鈕 [High]
- 位置1（Header 桌面版）：約 344-349 行
  - 動作：刪除 {mode === "html" && (<Button ...>預覽</Button>)} 整段
  - 驗收：Header 右側在桌面視窗不再出現預覽按鈕
- 位置2（Header Dropdown 手機版）：約 390-395 行
  - 動作：刪除 {mode === "html" && (<DropdownMenuItem ...>預覽</DropdownMenuItem>)} 整段
  - 驗收：手機版更多選單中不再出現預覽
- 保留位置（HTML 工具列）：405-408 行
  - 動作：不變
  - 驗收：仍可在 HTML 模式工具列觸發 handlePreview

B. 抽取 CursorNavigationButtons 元件 [High]
- 新增：在同檔案內建立內聯元件 CursorNavigationButtons（放在 TextEditor 內回傳之前或外部同檔案，依最小改動偏好外部同檔案頂部區塊）
  - 介面：
    - props: { onMove: (dir: "start"|"left"|"up"|"down"|"right"|"end") => void, className?: string }
  - 內容：渲染 6 顆按鈕，沿用現有 Button 風格與 icon（ChevronsLeft, ChevronLeft, ChevronUp, ChevronDown, ChevronRight, ChevronsRight）
  - 樣式：同原本群組（variant="ghost" size="icon" className="h-8 w-8"），保持 title 與順序
  - 驗收：元件可被兩處重用，不改視覺與行為

C. 用元件替換 HTML 模式游標群 [High]
- 位置：531-562 行整段按鈕群
- 動作：以 <CursorNavigationButtons onMove={moveCursor} /> 取代整段
- 驗收：HTML 工具列第二排分隔線後顯示相同 6 顆游標按鈕，操作無差異

D. 用元件替換 TXT 模式游標群 [High]
- 位置：583-613 行整段按鈕群
- 動作：以 <CursorNavigationButtons onMove={moveCursor} /> 取代整段
- 驗收：TXT 模式分隔線後顯示相同 6 顆游標按鈕，操作無差異

E. 統一 TXT 模式按鈕順序 [Medium]
- 位置：569-581 行 + 分隔線 + 游標群
- 動作：確認順序為「全選/複製/貼上 → 分隔線 → 游標按鈕」；目前已符合，只需保持
- 驗收：與 HTML 模式 515-527 的順序一致

F. 型別/匯入與 Lint 檢查 [Medium]
- 動作：
  - 確認新元件不需新增圖示匯入（圖示已於檔案頂端），若移到外部檔案則需確保圖示與 Button 匯入正確
  - 透過 pnpm lint / typecheck（若專案有）檢查；無則手動檢查 TSX 無錯
- 驗收：專案可編譯，頁面可載入

G. 簡易回歸測試 [High]
- HTML 模式：
  - 工具列「預覽」存在且可開新頁
  - 全選/複製/貼上按鈕仍可作用於 contentEditable 節點
  - 游標六鍵功能正常（開頭/左/上/下/右/結尾）
- TXT 模式：
  - 全選/複製/貼上仍作用於 Textarea
  - 游標六鍵功能正常（以 moveCursor 作用於 contentEditable；注意 TXT 模式目前游標移動針對 contentEditable，屬既有設計，維持不改行為）
- Header/Dropdown：預覽不再出現

H. 可選 DRY 優化（僅當風險極低）[Low]
- 全選/複製/貼上三鍵的 HTML 與 TXT 邏輯相似，可評估抽象「ActionButton」或「ClipboardActionButtons」元件；本次先不做，避免超出最小改動

提交說明（PR 驗收標準）
- 僅修改 components/text-editor.tsx（新增 CursorNavigationButtons 於同檔案）
- 刪除兩處預覽重複，保留 HTML 工具列預覽
- 兩處游標群改用共用元件，UI/行為一致
- TXT 排序與 HTML 一致
- 所有互動測試通過

風險與備援
- 若抽出元件造成樣式偏差，保留原 className，並允許傳入 className 以微調
- 若需要對 TXT 模式游標行為調整到 textarea，屬需求變更，另立 Issue（本次不變更）

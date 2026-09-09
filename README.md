# 郭奕圻｜作品集與工具房

這份是目前互動作品集的 GitHub Pages 完整包，含首頁、作品內頁、七個工具、圖片、樣式、原始碼與測試。檔案皆放在根目錄，可直接使用，不必先安裝套件或建置。工具操作詳見 TOOL-NOTES.md。

## 上傳既有 portfolio 儲存庫

1. 解壓縮，將 index.html、其他 HTML、assets 及其餘內容放到儲存庫根目錄，不要再套一層 portfolio-github-ready 資料夾。保留既有其他專案檔案及自訂網域設定。
2. 提交至預計發布的分支。在 Settings → Pages，選 Deploy from a branch，再選該分支（例如 main）與 /(root)，儲存。若既有專案已用 Actions 部署，沿用或調整既有工作流，不必同時設定兩種流程。
3. 等待 Pages 部署成功後，開啟 https://tyughjbnm123.github.io/portfolio/index.html。
4. LINE 編排器網址為 /portfolio/line-message.html；分鏡工具為 /portfolio/ad-storyboard.html。此靜態包使用 .html 路徑，與預覽站的無副檔名網址不同。

設定依據：[GitHub Pages 官方說明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。本次只準備檔案，沒有推送或修改 GitHub 設定。

## 本機預覽與維護

安裝 Node.js 後執行 npm run dev，開啟 http://127.0.0.1:4186/index.html。執行 npm test 可測試核心邏輯；npm run build 可另產生 dist。此包可直接由根目錄發布，不需要上傳 dist。

## 已完成檢查與範圍

- LINE 與分鏡核心邏輯 27 項測試通過，涵蓋排序、限制、網址與 JSON、分鏡時序及匯入匯出。
- 原工具控制項與腳本掛接、UTM 編碼與歷史紀錄、FACS 預設參數、HTML 內嵌腳本語法與本機資源路徑通過檢查。
- 七工具導覽、分鏡控制項與標籤對應通過檢查。
- 封裝另以 /portfolio/ 路徑執行 HTTP 檢查，結果見交付的檢查紀錄。
- 已以桌面 1280 × 720 檢查首頁、七個工具、四個內容內頁的深淺色畫面，確認共用配色、字體及導覽；九個案例詳頁均可顯示，作品分類篩選可操作。
- 本版修正四個內容內頁的導覽寬度、字級與舊標題裝飾；案例標題移至圖片上方，流程圖完整顯示；修正跳至主要內容連結與作品圖片標籤的淺色模式對比。
- 未進行手機實機測試、正式 LINE API 發送或 Firebase 管理權限測試。

## 內容與服務依賴

網站文字沿用目前版本。另交付的「作品集文案建議」尚未套用；其中列有職稱、專案狀態及成效數字等待統一資料，請勿將功能測試通過視為履歷與成效均已核實。

指令庫沿用原 Firebase 設定，登入及資料存取受原服務與授權網域控制。部分樣式、圖示與內容來自外部 CDN，需要網路。新工具沒有 LINE 發送、雲端草稿儲存或 AI 影片生成服務。LINE 編輯草稿重新整理會重設，可先下載匯出結果；分鏡可下載專案並重新開啟。

# 郭奕圻｜互動作品集與工具房

首頁延續四個互動入口；七個工具共用深綠／米白主題、字體、導覽、按鈕、表單與卡片互動。深淺色選擇會在此裝置記住。

## 頁面

- `index.html`：首頁、自我介紹、作品、工具房、探索。
- `ai-tools.html`：短影片動作卡片庫。
- `facs-tool.html`：表情控制器。
- `prompt-library.html`：AI 指令庫，沿用原本的 Firebase 登入及資料來源。
- `raffle.html`：名單、獎項與得獎結果。
- `utm-builder.html`：UTM 設定、即時結果與本機歷史紀錄。
- `line-message.html`：LINE 商品／活動／公告卡片編排，最多 12 張輪播，即時手機預覽、UTM 與 Flex Message JSON 匯出。
- `projects.html`、`projects-detail.html`、`creative.html`、`youtube.html`：保留既有內容與功能，套用共同主題與導覽。
- `tools.html` 與 `landing.html`：保留舊網址，導向新版首頁對應入口。

- `ad-storyboard.html`：廣告分鏡工作台試作，整合原 42 張動作卡、7 種機位與 18 個 AU 控制。

## 本機使用

安裝 Node.js 後，在此資料夾執行 `npm run dev`，開啟 `http://127.0.0.1:4186/index.html`。不需要安裝套件。

## 替換 GitHub Pages

將這份資料夾中的 HTML 與 `assets` 內容合併到既有 `portfolio` 專案，保留其他原有檔案。`.openai`、`dist` 與建置腳本不需上傳到 GitHub Pages。請先備份正式站。

原有素材組及 UTM 紀錄仍使用原本的 localStorage 名稱。在原網域替換頁面時，可延續同一瀏覽器的紀錄；預覽網域會有獨立的本機紀錄。

指令庫沿用原 Firebase 設定。正式站的資料與權限未變更，新預覽網域的管理登入可能需要加入 Firebase 授權網域。其他頁面沿用原有 Tailwind、Lucide CDN 與外部內容來源，因此需要網路連線。

## 維護

共同設計樣式位於 `assets/site-theme.css`，深淺色控制位於 `assets/site-shell.js`。各工具的原始版面樣式保留在同名 CSS 檔。UTM 結果預覽已修正為顯示實際複製的網址，正確保留既有查詢參數與編碼。

內容內頁由 `assets/content-pages.css` 管理。2026-09-10 已修正導覽寬度、字級、標題裝飾、淺色模式圖片標籤對比及跳至主要內容連結，案例標題移至圖片上方，系統流程主圖保持完整比例。已檢查桌面 1280 × 720 的首頁、七個工具、四個內容內頁深淺色畫面，以及九個案例連結與作品篩選；未進行手機實機測試。

`npm run build` 會把可部署的靜態檔案複製到 `dist`。

## LINE 訊息編排器

三種卡片範例可套用至目前卡片；支援新增、複製、排序、刪除，調整圖片比例、主色及兩個網址按鈕。圖片需使用可公開讀取的 HTTPS 直連。範例使用原作品集的公開圖片。

可選「完整訊息」供 Messaging API 的 messages 陣列使用，或「模擬器版型」貼入 LINE Flex Message Simulator。文字、網址及 UTF-8 容量會在本機檢查；未執行 LINE 平台驗證或實際發送。預覽字型、換行與高度可能與 LINE 裝置不同。

編排內容僅保留於當前頁面，重新整理會重設；需要保留時請下載 JSON。工具不含憑證、帳號連接、圖片上傳或訊息發送。核心規則位於 assets/line-message-core.js，介面行為位於 assets/line-message.js。

## 廣告分鏡工作台

以 15 秒、5 鏡保養品廣告開場。可新增／複製／拖曳排序／刪除分鏡，編排每鏡秒數、畫面、字幕與旁白，切換橫式、直式或正方形。原始動作與表情資料整理於 assets/storyboard-data.js；新工具不改動舊工具的操作資料。

預演以靜態參考圖搭配構圖位移呈現鏡頭節奏，不是真實角色動畫、表情重繪或 AI 影片生成；不會播放旁白或背景音樂。表情調整會改變指令與專案內的 AU 參數。AU 0–4 是原工具的示意強度，非標準化 FACS 編碼輸出。

可選取本機圖片（JPEG／PNG／WebP，5 MB 以內），保留於當前分鏡草稿。下載專案包含圖片，並可用「開啟專案」還原。未串接雲端儲存；重新整理前請下載專案。專案限制為 12 鏡、單鏡 0.5–30 秒；總長不足或超出目標時會顯示提醒。

可複製單鏡／整支廣告指令，也可下載文字分鏡稿。npm test 檢查 LINE 編排與分鏡核心邏輯。

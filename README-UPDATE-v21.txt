小精靈 v21｜手機去背相容性修正

這是 v20 的小更新包，共 7 個網站檔案。

上傳位置（資料夾已經存在，不用再建）
1. portfolio 根目錄：上傳並覆蓋 index.html、companion-lab.html。
2. assets/companion/ 內：上傳此包內的 5 個檔案：
   companion.css
   companion.js
   portfolio-companion.css
   portfolio-companion.js
   blackhair-sprites-v2.svg
3. 在 GitHub 的 assets/companion/ 裡，拖入這 5 個檔案即可。
   不要再多包一層 companion 資料夾，也不要改名。
4. 原有圖片、影片和小精靈舊檔可以保留。
5. README-UPDATE-v21.txt 不必上傳。
6. 等 GitHub Pages 部署完成後，重新開啟正式網站確認。

這次的修正
舊版用 CSS 亮度遮罩讓角色去背，部分瀏覽器的支援不一致。
新版使用一個內嵌原圖與輪廓的 SVG，去背在 SVG 內完成，頁面不再依賴 CSS mask-mode。
造型、動作、拖曳、選單功能維持不變。SVG 不需另外載入外部圖片。
已更新 CSS／JS 版本參數，避免沿用舊快取。

檢查範圍
已核對線上 v20 的造型圖與遮罩都能載入，並非缺少遮罩檔案。
本機 Chromium 已確認淺色首頁、深色試玩頁、新 SVG 載入與跳舞切換正常。
已檢查 JavaScript 語法、SVG 內嵌資料完整性與 ZIP 完整性。
尚未在使用者的 iPhone／Safari 實機驗證；上傳後請確認該裝置的效果。

本次沒有加入新配音；台詞與生成指令另外提供，等待你的聲音檔後再串接。

作品集完整包 v28｜2026-09-24

這一包已包含整個網站，不用混用前幾版更新包。
此檔案是操作說明，可以留在電腦；不用上傳網站。

這次修改
- KKS 恢復原本的遊戲封面＋右側三段互動流程、三欄角色說明與折疊補充。
  只更新必要文字，並加入「觀看實機片段」折疊區塊；影片手動播放、播完停止。
- SlimBot 以你提供的架構圖為主，只保留簡短介紹與三個重點，圖片可點擊放大。
  刪除長篇功能表、技術機制、部署與文件說明。
- 包含小精靈 v27 程式、全部六組動畫、靜態圖與配音。
- 保留目前履歷（含星網 2025.06、華南銀行駐點專案）、全部其他案例、工具與 3D 分鏡編輯器。

小精靈為什麼不見
檢查線上網站時，assets/companion/companion-player-v27.js 和
assets/companion/companion-widget-v27.js 都是 404（找不到檔案）。
SlimBot 的新圖／樣式及 KKS 影片／樣式也缺在正確路徑。
上傳到 portfolio 最外層的同名檔案，不能代替 assets 裡的檔案。
本包保留原本動畫邏輯並補齊素材，請依下方路徑上傳。

最重要：保持資料夾結構

portfolio/
  index.html
  slimbot.html
  kks-interaction.html
  companion-lab.html
  其他 HTML 網頁
  assets/
    網站的 CSS、JS、圖片、影片
    companion/
      companion-player-v27.js
      companion-widget-v27.js
      clips-v24.json
      WebP 動畫、靜態圖與 MP3
  shot-composer/
    index.html、help.html、library.html 等檔案
    assets/
    help/
    poses/

GitHub 網頁版：按「目的位置」分批上傳
先把 ZIP 完整解壓縮到電腦，再依序做以下四步。

1. GitHub portfolio 最外層
   上傳解壓後最外層所有 .html 網頁，同名覆蓋。
   不要把圖片、MP3、CSS、JS 一起散放到最外層。

2. GitHub portfolio → assets
   先點進 GitHub 的 assets 資料夾，再按 Add file → Upload files。
   從電腦解壓後的 assets 選取直接位於此層的檔案（不含 companion 子資料夾）。
   可以每批選 50 個，分批上傳；直到全部傳完。
   特別確認：slimbot-v28.css/js、slimbot-architecture-v27.jpg、
   kks-interaction-v28.css/js、kks-interaction-demo-v27.mp4、kks-interaction-poster-v27.jpg。

3. GitHub portfolio → assets → companion
   先進入這個資料夾，再上傳電腦 assets/companion 裡面的全部檔案。
   這一步會補齊小精靈程式、動畫與聲音。

4. GitHub portfolio → shot-composer
   上傳電腦 shot-composer 裡的檔案與子資料夾，保持 assets、help、poses 的層級。
   上傳各子資料夾內容時，也要先進入 GitHub 對應的子資料夾。
   請保留 LICENSE 與 THIRD-PARTY-NOTICES.txt。

以上四步都完成後，等待 GitHub Pages 部署完成，再用無痕視窗開啟網站確認。
不用先刪除原網站；也不要刪 .github、CNAME、package.json 等既有設定。
先讓網站正常，再整理先前放在根目錄的多餘副本。
不要上傳 ZIP 本身，也不要多包一層 portfolio-complete-v28-20260924 資料夾。

驗收
- 首頁或 companion-lab.html：召喚小精靈後能拖曳、跳舞、切換聲音與收起。
- 無其他動作時：待機一輪 → 哈欠一次 → 回待機，持續循環；收起後停止。
- slimbot.html：能看到大型架構圖，點擊可放大，下方只有三個重點。
- kks-interaction.html：原本封面與三段互動恢復，展開實機片段後能播放影片。
- 廣告分鏡工作台：可開啟 3D 構圖編輯器。

此次只交付完整包，沒有代為修改 GitHub、部署正式站或修改 104 履歷。
包內沒有研究資料、私有設定、SlimBot 執行檔、SQL 或測試程式。

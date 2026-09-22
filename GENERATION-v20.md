# 網頁小精靈：自由拖曳版素材紀錄

使用內建 image_gen 編輯工具，沒有使用 CLI / API fallback。

沿用造型圖：`work/portfolio-storyboard/assets/companion/blackhair-sprites-v1.png`

新增輪廓遮罩：`work/portfolio-storyboard/assets/companion/blackhair-mask-v1.png`

兩者都是 2 × 2 姿勢圖。原造型圖仍為帶深色底的 RGB PNG；網站以 CSS luminance mask 隱藏背景，背景位置與遮罩位置同步切换。這不是聲稱原 PNG 已有 alpha 通道。

生成的遮罩保留原檔，未經程式修改影像。已在首頁淺色背景及試玩頁深色背景實際檢視待機、揮手及跳舞效果。

## 最終遮罩提示詞

Use case: background-extraction. Input image is the EDIT TARGET: a 1254x1254 sprite sheet with four chibi woman poses in exact 627x627 cells. Produce a black and white LUMINANCE MASK for this exact supplied image, same size and exact pixel alignment. All character silhouettes must be SOLID PURE WHITE (#ffffff), all background PURE BLACK (#000000). Trace the precise outer contours of all hair, hands, fingers, clothing, legs and shoes in each of the four poses, and make the open spaces between legs and arms black. Preserve the exact subject position, scale, pose, shape and occupied bounds for every cell. Do not draw any features inside the silhouettes. No gray features, no shadows, no checkerboard, no text, no new character details. This is a technical CSS mask, not an illustration. Use only opaque white silhouettes on pure black background; antialias only at silhouette edges.

# 原創可堆疊建築套件

模型：`assets/island-city/cyber-city-original.glb`。只交付模型相關檔案，沒有修改 island.html 或既有載入器。

## 重建與預覽

生成器只需要 Python 3 標準函式庫，不需要 Blender、Pillow、付費 API 或任何輸入素材。固定種子生成相同位元組。

在套件／repo 根目錄執行：

```powershell
python tools/build-cyber-city.py
node tools/serve-cyber-city.cjs
```

本機預覽： http://127.0.0.1:59219/tools/preview-cyber-city.html

GitHub Pages 預覽：將 assets/ 和 tools/ 保持相對目錄結構，打開 `/portfolio/tools/preview-cyber-city.html` 即可。測試頁的 Three.js 與 GLTFLoader 使用 CDN 的固定 0.160.0 版，需要網路；GLB 自身不依賴外部貼圖。

預覽頁提供白天／夜晚、單一零件及全套零件、滑鼠／觸控旋轉縮放、三角形與尺寸報表。街區展示為高塔 10 層、中樓 4 層、細塔 7 層，加上各自屋頂與三種獨立小建築。

## 節點與查找

GLB 的原始節點名稱完全依規格保留，例如 `tower_walls.001`。Three.js r160 的 GLTFLoader 會將它變成 `tower_walls001`。套件不複製幾何來製造別名，而是提供兩種輸入皆可用的查找函式：

```js
import { findCyberPart } from './tools/cyber-city-parts.js';
const a = findCyberPart(gltf.scene, 'tower_walls.001');
const b = findCyberPart(gltf.scene, 'tower_walls001');
console.assert(a === b);
const floor = a.clone(true);
floor.position.y = floorIndex;
```

若不使用 helper，原生 `scene.getObjectByName('tower_walls001')` 也能找到。原始含點字串則保存在 `node.userData.partName`。
不要假設原生 getObjectByName 會自動比對兩種名稱。

所有零件均是底面中心原點、Y 朝上。樓層高 1；樓頂依規格另計高度。`slim_roof` 依使用者表格製成高 1 的退階塔冠與細天線。`tower_roof` 高 0.4，`midrise_roof` 高 0.3。

各樓層共用上下接合輪廓，直接以 y += 1 堆疊，不拉長窗戶或貼圖。中間層可任意排列；上層可旋轉 90／180／270 度讓窗光分布更有變化。

## 材質

- 每個零件 1–2 個材質，全 GLB 共用 2 個不透明材質。
- 牆面使用頂點色，emissiveMap 為純黑；窗面使用內嵌色彩與發光圖集。
- 兩材質 emissiveFactor 皆為 [1,1,1]，晚上設定 emissiveIntensity = 1，白天設 0。
- 亮窗 40.18%；亮窗中暖白／琥珀 71.11%，其餘青色／洋紅。
- 玻璃從支撐立面往外 0.014；窗框的非發光像素保持黑色，不使用透明材質或法線貼圖。
- 窗光只表現材質自發光，不內建燈光、泛光或照亮周邊場景的效果。網站可沿用既有照明與後製。

GLB 中的原始套件節點刻意都放在原點，供網站按名稱取出；不要直接把整個套件 scene 加入場景，否則 14 個零件會重疊。測試頁示範了正確的取用與堆疊方式。

## 驗證

`cyber-city-original.report.json` 是生成器產生的實際尺寸與預算報告。測試頁會以 GLTFLoader 實際載入，測試：14 個名稱與別名、底部原點、實際 bounds、三角形、材質數、emissiveMap、貼圖尺寸，以及 3–12 層的 110 組配對接縫。

```powershell
python tools/check-cyber-city.py
```

此離線檢查另驗證 GLB 結構、buffer 對齊、PNG 內嵌、牆面黑色發光遮罩、索引範圍、單位法向量與確定性重建。

正式網站換用新模型的 URL 與額外 slim／podium 配置，仍由網站整合方修改；本次不變更原網站載入器。

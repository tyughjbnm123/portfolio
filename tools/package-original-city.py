"""Package only the newly authored original kit, never any earlier game assets."""
from pathlib import Path
import hashlib
import json
import shutil
import zipfile

root=Path(__file__).resolve().parents[1]
out=root/'outputs/original-city-kit-20261027'
out.mkdir(parents=True,exist_ok=True)
files=[
 'assets/island-city/cyber-city-original.glb',
 'assets/island-city/cyber-city-original.report.json',
 'assets/island-city/ATTRIBUTION.txt',
 'tools/build-cyber-city.py','tools/check-cyber-city.py','tools/cyber-city-parts.js',
 'tools/preview-cyber-city.html','tools/preview-cyber-city.js','tools/serve-cyber-city.cjs',
 'tools/ORIGINAL-CITY-README.md','tools/package-original-city.py'
]
for rel in files:
    dest=out/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/rel,dest)
(out/'START-HERE.txt').write_text('原創夜城建築模型套件\n\n模型：assets/island-city/cyber-city-original.glb\n操作說明：tools/ORIGINAL-CITY-README.md\n\n重建：python tools/build-cyber-city.py\n離線驗證：python tools/check-cyber-city.py\n預覽：node tools/serve-cyber-city.cjs\n開啟：http://127.0.0.1:59219/tools/preview-cyber-city.html\n\nGLB 的貼圖已內嵌。此包不包含舊模型或遊戲匯出素材，沒有替你修改網站入口。\n若合併 ATTRIBUTION.txt，請保留目標 repo 中其他仍在使用之素材的來源記錄。\n',encoding='utf-8')
(out/'evidence/QA.md').write_text('''# 2026-10-27 驗證紀錄

- GLB：269,612 bytes（263.3 KiB），14 個零件，全套 2,832 三角形。
- Python 離線驗證通過：GLB 結構、buffer 對齊、有限座標、有效索引、單位法向量、精確尺寸與原點、預算、內嵌 PNG、純黑牆面發光遮罩、確定性重建。
- 瀏覽器：Three.js / GLTFLoader 0.160.0 實際載入；14／14 名稱與別名解析成功，110 組 3–12 層接縫檢查通過。詳見 loader-checks.txt。
- 已操作白天／夜晚切換、街區／零件選單、退縮層近看與滑鼠拖曳旋轉，無 console error 或 warning。
- /portfolio/tools/preview-cyber-city.html?mode=night 子路徑實際載入成功。
- day.jpg、night.jpg 是同一固定視角的實際瀏覽器截圖；balcony-detail.jpg 為實際旋轉後的近看畫面。
- 測試不代表已整合到正式網站；未修改 island.html、night-city-public.js，也未部署。
- 原生 getObjectByName 仍遵循 Three.js 名稱規則；兩種寫法使用附帶 findCyberPart helper 解析，沒有重複加入模型。
''',encoding='utf-8')
entries=[]
for file in sorted(out.rglob('*')):
    if file.is_file() and file.name!='manifest.json':entries.append({'path':file.relative_to(out).as_posix(),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'purpose':'Original procedural city kit only','files':entries},ensure_ascii=False,indent=2),encoding='utf-8')
archive=out.with_suffix('.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for file in sorted(out.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(out).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for entry in entries:assert hashlib.sha256(z.read(entry['path'])).hexdigest()==entry['sha256']
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(entries)+1,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},ensure_ascii=True))

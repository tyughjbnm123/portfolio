"""Deliver five standalone GLBs, not the island preview or a deployment patch."""
from pathlib import Path
import hashlib, io, json, math, struct, zipfile
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/building-models-20261027'
FILES=[
 ('01-about.glb','我是誰・階梯露台自介館','assets/island-city/landmarks/about-landmark.glb','about_landmark'),
 ('02-work.glb','作品集・空橋雙塔','assets/island-city/landmarks/work-landmark.glb','work_landmark'),
 ('03-tool-factory.glb','工具房・鋼骨齒輪工廠','assets/island-city/gear-factory/gear-factory-original.glb','gear_factory'),
 ('04-laboratory.glb','實驗室・儲槽與管線','assets/island-city/tool-factory/tool-factory-original.glb','laboratory'),
 ('05-amusement-park.glb','遊戲室・摩天輪與遊樂設施','assets/island-city/landmarks/games-landmark.glb','games_landmark')
]
def digest(raw):return hashlib.sha256(raw).hexdigest()
def unpack(raw):
    magic,version,total=struct.unpack_from('<III',raw);assert (magic,version,total)==(0x46546c67,2,len(raw))
    size,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+size]);bs,bk=struct.unpack_from('<II',raw,20+size);assert bk==0x004e4942
    binary=raw[28+size:28+size+bs];assert len(binary)==bs
    return doc,binary
def pack(doc,data):
    data=bytes(data)+b'\0'*(-len(data)%4);doc['buffers'][0]['byteLength']=len(data)
    j=json.dumps(doc,ensure_ascii=False,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
    return struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data
def laboratory(raw):
    """Change only the embedded original LED artwork and descriptive root name."""
    doc,binary=unpack(raw);data=bytearray(binary);font=ImageFont.truetype('C:/Windows/Fonts/msjh.ttc',88)
    for index in [0,1]:
        image=doc['images'][index];view=doc['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
        im=Image.open(io.BytesIO(binary[start:start+view['byteLength']])).convert('RGB')
        draw=ImageDraw.Draw(im);draw.rectangle((384,0,511,511),fill=(10,20,29) if index==0 else (0,0,0))
        for i,ch in enumerate('實驗室'):
            mask=Image.new('L',(128,112));ImageDraw.Draw(mask).text((64,56),ch,font=font,anchor='mm',fill=255)
            mask=mask.resize((128,70),Image.Resampling.LANCZOS)
            im.paste((190,219,200) if index==0 else (181,242,221),(384,146+i*112-35,512,146+i*112+35),mask)
        buff=io.BytesIO();im.save(buff,format='PNG',optimize=True);png=buff.getvalue()
        data.extend(b'\0'*(-len(data)%4));offset=len(data);data.extend(png)
        doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(png)})
        image['bufferView']=len(doc['bufferViews'])-1;image['name']='original-laboratory-led-'+('colour' if index==0 else 'emission')
    root=doc['nodes'][doc['scenes'][doc.get('scene',0)]['nodes'][0]];root['name']='laboratory';doc['scenes'][0]['name']='laboratory'
    doc['asset']['extras']['deliveryDerivative']='tools/package-building-models.py: laboratory LED text only; geometry and original scale preserved'
    result=pack(doc,data);out_doc,out_bin=unpack(result)
    # Every mesh accessor still references exactly the same source byte range.
    for a in doc['accessors']:
        v=doc['bufferViews'][a['bufferView']];s=v.get('byteOffset',0);e=s+v['byteLength'];assert out_bin[s:e]==binary[s:e]
    return result
def validate(raw,root_name):
    doc,binary=unpack(raw);assert not any('uri' in x for x in doc['images']+doc['buffers'])
    assert any(n.get('name')==root_name for n in doc['nodes']);assert any(n.get('name')=='vertical_led' for n in doc['nodes'])
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' and 'normalTexture' not in m for m in doc['materials'])
    formats={5121:'B',5123:'H',5125:'I',5126:'f'};width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
    def accessor(i):
        a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];n=a['count']*width[a['type']];fmt=formats[a['componentType']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
        assert start+n*struct.calcsize(fmt)<=len(binary)
        return struct.unpack_from('<'+fmt*n,binary,start)
    triangles=0;positions=[]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            at=p['attributes'];v=accessor(at['POSITION']);n=accessor(at['NORMAL']);uv=accessor(at['TEXCOORD_0']);idx=accessor(p['indices'])
            assert len(v)==len(n) and len(uv)*3==len(v)*2 and len(idx)%3==0 and max(idx)<len(v)//3
            assert all(math.isfinite(x) for x in v+n+uv)
            for j in range(0,len(n),3):assert abs(sum(x*x for x in n[j:j+3])-1)<1e-5
            triangles+=len(idx)//3;positions.extend(v)
    images=[]
    for im in doc['images']:
        v=doc['bufferViews'][im['bufferView']];s=v.get('byteOffset',0)
        img=Image.open(io.BytesIO(binary[s:s+v['byteLength']]));img.load();assert max(img.size)<=512;images.append(list(img.size))
    lo=[min(positions[k::3]) for k in range(3)];hi=[max(positions[k::3]) for k in range(3)]
    assert abs(lo[1])<1e-5 and abs(lo[0]+hi[0])<1e-4 and abs(lo[2]+hi[2])<1e-4
    assert doc['asset']['extras']['gameAssets'] is False and doc['asset']['extras']['aiTexture'] is False
    return {'bytes':len(raw),'sha256':digest(raw),'triangles':triangles,'rootNode':root_name,'materials':len(doc['materials']),'embeddedTextures':images,'dimensions':[round(hi[k]-lo[k],5) for k in range(3)],'animations':len(doc.get('animations',[])),'originalModelScale':1,'validated':True}

def main():
    OUT.mkdir(parents=True,exist_ok=True);models=[];source_hashes=[]
    for name,title,source,root in FILES:
        raw=(ROOT/source).read_bytes();source_hashes.append({'path':source,'sha256':digest(raw)})
        if name.startswith('04-'):raw=laboratory(raw)
        result=validate(raw,root);(OUT/name).write_bytes(raw);models.append({'file':name,'title':title,'source':source,**result})
    manifest={'date':'2026-10-27','purpose':'Standalone original building assets. Not a website deployment package.','models':models,'sourceFilesUnchanged':all(digest((ROOT/s['path']).read_bytes())==s['sha256'] for s in source_hashes),'sourceHashes':source_hashes}
    assert manifest['sourceFilesUnchanged']
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (OUT/'README.txt').write_text('五棟 GLB 建築素材\n\n'+''.join(f"{m['file']}  {m['title']}\n" for m in models)+'\n每份 GLB 均內嵌貼圖，可分別匯入 Three.js／Blender。\n模型維持原始尺寸（scale=1），不是五島示意頁的 50% 縮圖；Y 軸向上、原點位於底面中心。\n實驗室 LED 已直接寫入 GLB，顯示「實驗室」。\n\n模型目前沒有 glTF 動畫軌。工廠齒輪與實驗室風扇保留轉軸節點資訊，若要轉動，需要由網站程式控制；遊樂設施是靜態造型。\n五個 vertical_led 節點的顯示面維持相同尺寸。\n模型不含島嶼、燈塔、道路、角色或網站互動。\n各模型尺寸、三角形數與 SHA-256 請見 manifest.json。\n\n幾何及貼圖均由本專案程式建立，沒有使用遊戲匯出素材或 AI 圖片貼圖。LED 文字由系統字型繪製，未附帶字型檔。\n',encoding='utf8')
    names=[m['file'] for m in models]+['README.txt','manifest.json'];zip_path=OUT/'five-building-models.zip'
    with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name in names:z.write(OUT/name,name)
    with zipfile.ZipFile(zip_path) as z:
        assert z.testzip() is None and sorted(z.namelist())==sorted(names)
        for name in names:assert z.read(name)==(OUT/name).read_bytes()
    print(json.dumps({'zip':str(zip_path),'bytes':zip_path.stat().st_size,'sha256':digest(zip_path.read_bytes()),'models':[(m['file'],m['bytes']) for m in models],'verified':True},ensure_ascii=False))
if __name__=='__main__':main()

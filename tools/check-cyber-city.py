"""Offline structural and reproducibility checks for the original GLB."""
import importlib.util
import json
import math
from pathlib import Path
import struct
import zlib

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('city_builder',Path(__file__).with_name('build-cyber-city.py'))
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
data=(ROOT/'assets/island-city/cyber-city-original.glb').read_bytes()
assert struct.unpack_from('<III',data)==(0x46546c67,2,len(data))
n,tag=struct.unpack_from('<II',data,12);assert tag==0x4e4f534a
doc=json.loads(data[20:20+n]);length,tag=struct.unpack_from('<II',data,20+n);assert tag==0x004e4942
binary=data[28+n:];assert length==len(binary)
assert len(data)<1_500_000 and len(doc['nodes'])==14 and len(doc['materials'])==2
assert len(set(x['name'] for x in doc['nodes']))==14
assert all('uri' not in b for b in doc['buffers'])
for view in doc['bufferViews']:
    assert view.get('byteOffset',0)%4==0
    assert view.get('byteOffset',0)+view['byteLength']<=doc['buffers'][0]['byteLength']

def read_accessor(index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
    return struct.unpack_from('<'+{5126:'f',5123:'H'}[a['componentType']]*a['count']*size,binary,v.get('byteOffset',0)+a.get('byteOffset',0))

for mesh in doc['meshes']:
    assert len(mesh['primitives'])<=2
    for p in mesh['primitives']:
        pos=read_accessor(p['attributes']['POSITION']);norm=read_accessor(p['attributes']['NORMAL']);idx=read_accessor(p['indices'])
        assert all(math.isfinite(v) for v in pos+norm) and max(idx)<len(pos)//3
        for i in range(0,len(norm),3):assert abs(sum(v*v for v in norm[i:i+3])-1)<1e-5
for material in doc['materials']:
    assert material['alphaMode']=='OPAQUE' and 'normalTexture' not in material
    assert material['emissiveFactor']==[1,1,1] and 'emissiveTexture' in material
for i,img in enumerate(doc['images']):
    assert 'uri' not in img and img['mimeType']=='image/png'
    v=doc['bufferViews'][img['bufferView']];payload=binary[v['byteOffset']:v['byteOffset']+v['byteLength']]
    assert payload[:8]==b'\x89PNG\r\n\x1a\n'
    w,h=struct.unpack_from('>II',payload,16);assert w<=512 and h<=512
    if i==2:
        offset=8;compressed=b''
        while offset<len(payload):
            count=struct.unpack_from('>I',payload,offset)[0];kind=payload[offset+4:offset+8]
            if kind==b'IDAT':compressed+=payload[offset+8:offset+8+count]
            offset+=count+12
        assert zlib.decompress(compressed)==b'\x00\x00\x00\x00'
rebuilt=builder.encode(builder.build_parts());assert data==rebuilt,'Rebuild is not byte-identical'
report=builder.validate(builder.build_parts(),data)
print(json.dumps({'status':'PASS','bytes':len(data),'parts':len(doc['nodes']),'triangles':report['triangleTotal'],'checks':['GLB structure','buffer alignment','finite geometry','index bounds','unit normals','opaque PBR','embedded PNGs','black wall emission mask','exact dimensions and pivots','triangle and size budgets','byte-identical rebuild']},indent=2))

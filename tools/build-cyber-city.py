#!/usr/bin/env python3
"""Original modular city kit. Python 3 standard library only; no input assets.

Run: python tools/build-cyber-city.py
Coordinates: right-handed, Y up, metres; each part's pivot is its bottom centre.
Outputs a deterministic glTF 2.0 binary with embedded, hand-coded PNG atlases.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import random
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SEED = 271026
WALL = '#354959'
EDGE = '#5c6f7d'
TRIM = '#21313e'
PLUM = '#46394e'
METAL = '#6b7882'


def rgb(hex_colour):
    return tuple(int(hex_colour[i:i+2], 16) for i in (1, 3, 5))


def linear(hex_colour):
    return tuple(v/3294.6 if v <= 10 else ((v/255+.055)/1.055)**2.4 for v in rgb(hex_colour))


def png(width, height, pixels):
    def chunk(kind, payload):
        return struct.pack('>I', len(payload))+kind+payload+struct.pack('>I', zlib.crc32(kind+payload)&0xffffffff)
    scanlines=b''.join(b'\0'+bytes(pixels[y*width*3:(y+1)*width*3]) for y in range(height))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(scanlines,9))+chunk(b'IEND',b'')


def atlases():
    # 4 x 4 tiles, 64px each. Dark tiles 0..3; warm tiles 4..7; cyan 8; magenta 9.
    colours=['#182b38','#22333c','#1e2a36','#2b2c3a','#ffdeb0','#ffbc68','#ffe9c9','#f4cb8b','#29e7ff','#ff488b']
    base,emit=[],[]
    for y in range(256):
        for x in range(256):
            tile=(y//64)*4+x//64
            px,py=x%64,y%64
            c=rgb(colours[tile%10]); lit=4<=tile<=9
            # Window gasket + solid mullion; black emission around glass.
            interior=6<=px<58 and 6<=py<58 and px not in (31,32)
            shade=(.78+.14*py/64) if py<39 else .62
            if py in (18,19,43,44):shade*=.64
            base.extend(tuple(round(v*(.54 if lit else 1)*shade) for v in c) if interior else (13,21,28))
            emit.extend(tuple(round(v*shade) for v in c) if interior and lit else (0,0,0))
    return png(256,256,base),png(256,256,emit),png(1,1,[0,0,0])


class Mesh:
    def __init__(self):
        self.p=[];self.n=[];self.uv=[];self.c=[];self.idx=[]

    def face(self, points, colour=WALL, uv=None):
        a,b,c=points[:3]
        ab=[b[i]-a[i] for i in range(3)];ac=[c[i]-a[i] for i in range(3)]
        normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
        length=math.sqrt(sum(n*n for n in normal));assert length>1e-9
        normal=[n/length for n in normal]
        offset=len(self.p)//3
        for i,p in enumerate(points):
            self.p.extend(p);self.n.extend(normal);self.c.extend(linear(colour))
            self.uv.extend(uv[i] if uv else (.5,.5))
        for i in range(1,len(points)-1):self.idx.extend([offset,offset+i,offset+i+1])

    def box(self, x,y,z,w,h,d,colour=WALL):
        a,b=x-w/2,x+w/2;c,e=y,y+h;f,g=z-d/2,z+d/2
        for points in [((a,c,g),(b,c,g),(b,e,g),(a,e,g)),((b,c,f),(a,c,f),(a,e,f),(b,e,f)),
                       ((b,c,g),(b,c,f),(b,e,f),(b,e,g)),((a,c,f),(a,c,g),(a,e,g),(a,e,f)),
                       ((a,e,g),(b,e,g),(b,e,f),(a,e,f)),((a,c,f),(b,c,f),(b,c,g),(a,c,g))]:self.face(points,colour)

    def chamfer(self,w,d,y,h,cut=.08,colour=WALL):
        x,z=w/2,d/2
        ring=[(-x+cut,-z),(x-cut,-z),(x,-z+cut),(x,z-cut),(x-cut,z),(-x+cut,z),(-x,z-cut),(-x,-z+cut)]
        # Ring is CCW in XZ; outward walls use reversed first edge.
        for i,(a,b) in enumerate(zip(ring,ring[1:]+ring[:1])):
            self.face([(b[0],y,b[1]),(a[0],y,a[1]),(a[0],y+h,a[1]),(b[0],y+h,b[1])],colour if i%2==0 else EDGE)
        self.face([(x,y,z) for x,z in ring],colour)
        self.face([(x,y+h,z) for x,z in reversed(ring)],colour)

    def cylinder(self,x,y,z,r,h,colour=METAL,n=6):
        ring=[(x+math.cos(i*math.tau/n)*r,z+math.sin(i*math.tau/n)*r) for i in range(n)]
        for a,b in zip(ring,ring[1:]+ring[:1]):self.face([(b[0],y,b[1]),(a[0],y,a[1]),(a[0],y+h,a[1]),(b[0],y+h,b[1])],colour)
        self.face([(x,y,z) for x,z in ring],colour)
        self.face([(x,y+h,z) for x,z in reversed(ring)],colour)


class Part:
    def __init__(self,name,size):
        self.name=name;self.size=size;self.wall=Mesh();self.glass=Mesh();self.panes=[];self.lit=0;self.warm=0

    def pane(self,side,u,y,w,h,depth):
        # Glass is 0.014 in front of its supporting facade, never coplanar.
        points=[(u-w/2,y,depth+.014),(u+w/2,y,depth+.014),(u+w/2,y+h,depth+.014),(u-w/2,y+h,depth+.014)]
        angle=side*math.pi/2
        points=[(x*math.cos(angle)+z*math.sin(angle),yy,-x*math.sin(angle)+z*math.cos(angle)) for x,yy,z in points]
        self.panes.append(points)

    def windows(self,body=.88,cols=3,rows=2,y=.15,height=.70,sides=range(4),width=None):
        span=body-.20;window_w=width or span/cols*.76;window_h=height/rows*.78
        for side in sides:
            for row in range(rows):
                for col in range(cols):self.pane(side,-span/2+(col+.5)*span/cols,y+row*height/rows,window_w,window_h,body/2)

    def finish(self):
        count=len(self.panes);self.lit=round(count*.4);self.warm=round(self.lit*.7)
        rng=random.Random(SEED+sum((i+1)*ord(c) for i,c in enumerate(self.name)))
        order=list(range(count));rng.shuffle(order)
        lit_indices=set(order[:self.lit]);warm_indices=set(order[:self.warm])
        for i,points in enumerate(self.panes):
            tile=(4+i%4 if i in warm_indices else 8+i%2) if i in lit_indices else i%4
            x,y=(tile%4)*64,(tile//4)*64
            # glTF V=0 is the top of the PNG. Interior UVs retain a 2px gutter.
            uv=[((x+2)/256,(y+62)/256),((x+62)/256,(y+62)/256),((x+62)/256,(y+2)/256),((x+2)/256,(y+2)/256)]
            self.glass.face(points,'#ffffff',uv)
        return self


def floor_edges(p,span=1,body=.88):
    p.wall.chamfer(span,span,0,.045,.10,TRIM)
    p.wall.chamfer(span,span,.955,.045,.10,EDGE)
    # Four clipped-corner piers create a vertical rhythm through mixed floors.
    for x in [-1,1]:
        for z in [-1,1]:p.wall.box(x*(body/2-.055),.045,z*(body/2-.055),.065,.91,.065,EDGE)


def build_parts():
    parts=[]
    for i,name in enumerate(['tower_walls','tower_walls.001','tower_walls.002','tower_walls.003']):
        p=Part(name,(1,1,1));floor_edges(p)
        if i==3:
            p.wall.chamfer(.88,.88,.045,.15,.10,WALL)
            p.wall.chamfer(.76,.76,.195,.64,.08,PLUM)
            p.wall.chamfer(.88,.88,.835,.12,.10,WALL)
            p.windows(.76,3,1,.25,.46)
            for side in [-1,1]:
                p.wall.box(0,.45,side*.465,.68,.035,.035,METAL)
                p.wall.box(side*.465,.45,0,.035,.035,.68,METAL)
                for u in [-.28,.28]:
                    p.wall.box(u,.195,side*.465,.025,.29,.025,EDGE)
                    p.wall.box(side*.465,.195,u,.025,.29,.025,EDGE)
        else:
            p.wall.chamfer(.88,.88,.045,.91,.10,PLUM if i==2 else WALL)
            if i==0:
                p.windows(.88,3,1,.65,.25)
                p.windows(.88,2,1,.16,.36,sides=[1,2,3])
                p.pane(0,0,.07,.24,.43,.44)
                p.wall.box(0,.51,.415,.59,.055,.17,METAL)
                for x in [-.31,.31]:p.wall.box(x,.06,.40,.06,.50,.10,EDGE)
            elif i==1:
                p.windows(.88,3,2)
                for side in [-1,1]:
                    p.wall.box(side*.475,.08,0,.035,.84,.06,METAL)
                    p.wall.box(0,.08,side*.475,.06,.84,.035,METAL)
            else:
                p.windows(.88,4,2,.14,.72)
                for side in [-1,1]:
                    p.wall.box(0,.48,side*.47,.70,.055,.05,EDGE)
                    p.wall.box(side*.47,.48,0,.05,.055,.70,EDGE)
        parts.append(p.finish())

    p=Part('tower_roof',(1,.4,1));p.wall.chamfer(1,1,0,.06,.10,EDGE)
    for sign in [-1,1]:
        p.wall.box(0,.06,sign*.455,.72,.10,.07,TRIM)
        p.wall.box(sign*.455,.06,0,.07,.10,.72,TRIM)
    p.wall.box(-.12,.06,-.08,.43,.17,.31,WALL)
    p.wall.box(.20,.06,.14,.19,.10,.28,PLUM)
    for i in range(5):p.wall.box(-.28+i*.077,.233,-.08,.032,.012,.24,METAL)
    p.wall.cylinder(.27,.06,-.25,.042,.09)
    p.wall.cylinder(.27,.15,-.25,.012,.25)
    p.wall.box(.27,.31,-.25,.12,.015,.015,EDGE)
    parts.append(p.finish())

    for i,name in enumerate(['midrise_walls','midrise_walls.001']):
        p=Part(name,(1,1,1));floor_edges(p,body=.90);p.wall.chamfer(.90,.90,.045,.91,.045,WALL if i==0 else PLUM)
        if i==0:
            p.windows(.90,2,1,.12,.52,width=.28)
            p.windows(.90,3,1,.76,.13)
            for side in [-1,1]:p.wall.box(0,.67,side*.445,.84,.05,.11,EDGE)
        else:
            p.windows(.90,3,2,.16,.67)
            for side in [-1,1]:
                p.wall.box(0,.09,side*.47,.72,.05,.04,EDGE)
                p.wall.box(side*.47,.09,0,.04,.05,.72,EDGE)
        parts.append(p.finish())
    p=Part('midrise_roof',(1,.3,1));p.wall.chamfer(1,1,0,.05,.10,EDGE)
    for sign in [-1,1]:
        p.wall.box(0,.05,sign*.46,.80,.10,.06,TRIM)
        p.wall.box(sign*.46,.05,0,.06,.10,.80,TRIM)
    p.wall.box(-.14,.05,.10,.42,.14,.38,WALL)
    p.wall.cylinder(.23,.05,-.20,.10,.25,EDGE,8)
    for i in range(4):p.wall.box(-.29+i*.095,.19,.10,.04,.012,.27,METAL)
    parts.append(p.finish())

    p=Part('corner',(1,1,1));p.wall.chamfer(1,1,0,.05,.17,TRIM)
    p.wall.chamfer(.91,.91,.05,.78,.16,WALL)
    p.windows(.91,2,1,.10,.35,width=.24);p.windows(.91,3,1,.57,.20)
    p.wall.chamfer(1,1,.46,.055,.17,EDGE);p.wall.chamfer(1,1,.83,.06,.17,EDGE)
    p.wall.box(-.10,.89,-.1,.34,.11,.28,PLUM)
    parts.append(p.finish())

    p=Part('terrace',(1,1,2));p.wall.box(0,0,0,1,.05,2,TRIM)
    for j,z in enumerate([-.64,0,.64]):
        h=[.79,.9,.84][j];p.wall.box(0,.05,z,.91,h-.05,.62,[WALL,PLUM,WALL][j])
        p.wall.box(0,h,z,1,.055,.64,EDGE)
        for side in [1,3]:
            for u in [-.16,.16]:p.pane(side,(-z if side==1 else z)+u,.19,.23,.37,.455)
        p.wall.box(0,h+.055,z,.24,.045,.28,TRIM)
    for side in [0,2]:
        for u in [-.23,.23]:p.pane(side,u,.16,.26,.42,.95)
    parts.append(p.finish())

    for i,name in enumerate(['slim_walls','slim_walls.001']):
        p=Part(name,(.7,1,.7));floor_edges(p,.7,.59)
        p.wall.chamfer(.59,.59,.045,.91,.07,PLUM if i else WALL)
        p.windows(.59,2,2,.15,.71)
        if i==0:
            p.pane(0,0,.05,.17,.34,.295)
            p.wall.box(0,.40,.30,.34,.04,.10,EDGE)
        else:
            for s in [-1,1]:p.wall.box(s*.323,.10,0,.035,.80,.055,METAL)
        parts.append(p.finish())
    # The brief lists slim_roof at height 1: a stepped crown and an antenna spire.
    p=Part('slim_roof',(.7,1,.7));p.wall.chamfer(.7,.7,0,.06,.10,EDGE)
    p.wall.chamfer(.49,.49,.06,.20,.07,WALL)
    p.wall.chamfer(.31,.31,.26,.18,.045,PLUM)
    p.wall.chamfer(.16,.16,.44,.17,.025,EDGE)
    p.wall.cylinder(0,.61,0,.018,.39,METAL)
    p.windows(.49,2,1,.10,.10,width=.06)
    parts.append(p.finish())

    p=Part('podium',(1.6,.6,1.6));p.wall.chamfer(1.6,1.6,0,.045,.18,TRIM)
    p.wall.chamfer(1.45,1.45,.045,.37,.15,WALL)
    p.windows(1.45,4,1,.085,.29,width=.24)
    p.wall.chamfer(1.6,1.6,.415,.065,.18,EDGE)
    p.wall.chamfer(1.28,1.28,.48,.07,.12,TRIM)
    p.wall.box(-.43,.55,-.42,.24,.05,.25,PLUM)
    p.wall.box(.43,.55,-.42,.24,.05,.25,WALL)
    parts.append(p.finish())
    return parts


def encode(parts):
    binary=bytearray();views=[];accessors=[];meshes=[];nodes=[]
    def view(data,target=None):
        while len(binary)%4:binary.append(0)
        v={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
        if target:v['target']=target
        views.append(v);binary.extend(data);return len(views)-1
    def accessor(values,components,kind='f',bounds=False):
        data=struct.pack('<'+kind*len(values),*values)
        a={'bufferView':view(data,34963 if kind=='H' else 34962),'componentType':5123 if kind=='H' else 5126,'count':len(values)//components,'type':{1:'SCALAR',2:'VEC2',3:'VEC3'}[components]}
        if bounds:
            a['min']=[min(values[c::components]) for c in range(components)]
            a['max']=[max(values[c::components]) for c in range(components)]
        accessors.append(a);return len(accessors)-1
    for p in parts:
        primitives=[]
        for material,m in enumerate([p.wall,p.glass]):
            if not m.idx:continue
            attrs={'POSITION':accessor(m.p,3,bounds=True),'NORMAL':accessor(m.n,3),'TEXCOORD_0':accessor(m.uv,2)}
            if material==0:attrs['COLOR_0']=accessor(m.c,3)
            primitives.append({'attributes':attrs,'indices':accessor(m.idx,1,'H'),'material':material,'mode':4})
        meshes.append({'name':p.name+'-geometry','primitives':primitives})
        nodes.append({'name':p.name,'mesh':len(meshes)-1,'extras':{'partName':p.name,'sanitizedName':p.name.replace('.',''),'dimensions':p.size,'stackHeight':p.size[1],'pivot':'bottom-centre','windowOffset':.014}})
    textures=atlases();images=[]
    for name,data in zip(['original-window-colour','original-window-emission','non-emissive-wall-mask'],textures):images.append({'name':name,'bufferView':view(data),'mimeType':'image/png'})
    materials=[
        {'name':'Original architectural alloy','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':.25,'roughnessFactor':.73},'emissiveFactor':[1,1,1],'emissiveTexture':{'index':2},'alphaMode':'OPAQUE'},
        {'name':'Original opaque window atlas','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.18,'roughnessFactor':.38},'emissiveTexture':{'index':1},'emissiveFactor':[1,1,1],'alphaMode':'OPAQUE'}]
    doc={'asset':{'version':'2.0','generator':'Original City Kit / Python standard-library procedural generator','copyright':'Original geometry and algorithmically drawn textures created for YI-CHI KUO portfolio, 2026. No third-party art inputs.','extras':{'seed':SEED,'sourceScript':'tools/build-cyber-city.py','aiGeneratedImageTextures':False}},'scene':0,'scenes':[{'name':'Original modular city kit','nodes':list(range(len(nodes)))}],'nodes':nodes,'meshes':meshes,'materials':materials,'textures':[{'sampler':0,'source':i} for i in range(3)],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}],'images':images,'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
    raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4);binary.extend(b'\0'*((-len(binary))%4))
    return struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary


def validate(parts,data):
    report=[]
    for p in parts:
        coords=p.wall.p+p.glass.p
        low=[min(coords[c::3]) for c in range(3)];high=[max(coords[c::3]) for c in range(3)]
        actual=[round(b-a,6) for a,b in zip(low,high)]
        triangles=(len(p.wall.idx)+len(p.glass.idx))//3
        limit=1000 if p.name=='tower_roof' else 600
        assert triangles<limit,(p.name,triangles)
        assert all(abs(actual[i]-p.size[i])<1e-5 for i in range(3)),(p.name,actual,p.size)
        assert abs(low[1])<1e-6 and abs(low[0]+high[0])<1e-6 and abs(low[2]+high[2])<1e-6,p.name
        report.append({'name':p.name,'loaderName':p.name.replace('.',''),'triangles':triangles,'dimensions':actual,'materials':1+bool(p.glass.idx),'windows':len(p.panes),'litWindows':p.lit,'warmLitWindows':p.warm,'glassOffset':.014 if p.panes else None})
    assert len(data)<1_500_000
    windows=sum(x['windows'] for x in report);lit=sum(x['litWindows'] for x in report);warm=sum(x['warmLitWindows'] for x in report)
    return {'generator':'tools/build-cyber-city.py','seed':SEED,'glbBytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'triangleTotal':sum(x['triangles'] for x in report),'embeddedTextures':[[256,256],[256,256],[1,1]],'litWindowRatio':round(lit/windows,4),'warmShareOfLitWindows':round(warm/lit,4),'parts':report,'validation':'geometry, bounds, pivots, budgets and deterministic material construction passed; see preview page for GLTFLoader tests'}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'assets/island-city/cyber-city-original.glb')
    args=parser.parse_args();parts=build_parts();data=encode(parts);report=validate(parts,data)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_bytes(data)
    args.output.with_suffix('.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

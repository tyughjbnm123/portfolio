#!/usr/bin/env python3
"""Five original island landmarks. Python + Pillow; no downloaded geometry.

Reuses the authored Tool Room v2 geometry/exporter, not its concept bitmap.
All dimensions are island scene units, with the original 1.22-scale avatar.
"""
from pathlib import Path
import copy, hashlib, importlib.util, io, json, math, random, struct
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('tower',ROOT/'tools/build-tool-tower.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
OUT=ROOT/'assets/island-city/landmarks'
FONT=Path('C:/Windows/Fonts/msjh.ttc')
HERO_HEIGHT=2.7151781028557695
SPECS=[
 dict(id='about',label='我是誰',led='我是誰',title='階庭 · 自介館',accent='#ffd69a',description='退台露台、轉角窗與層疊的生活空間。'),
 dict(id='work',label='我做過什麼',led='作品集',title='連結 · 作品雙塔',accent='#70dcff',description='高低雙塔，以兩段空橋串起不同樓層。'),
 dict(id='tools',label='我的工具房',led='工具房',title='構作 · 工具房高塔',accent='#29e7ff',description='保留已確認的高塔，外露管線與設備附樓。'),
 dict(id='lab',label='我正在探索',led='探索室',title='遠望 · 探索觀測館',accent='#a3ffd3',description='八角研究塔、觀測穹頂與環形觀景平台。'),
 dict(id='games',label='我的遊戲室',led='遊戲室',title='夜遊 · 摩天樂園',accent='#ff7eae',description='大摩天輪、海盜船、雲霄飛車，同一座夜間樂園。'),
]

def bounds(gs=None):
    pp=[v for pair in (gs or b.groups).values() for g in pair for v in g.p]
    return [min(pp[k::3]) for k in range(3)],[max(pp[k::3]) for k in range(3)]

def transform(g,s=(1,1,1),t=(0,0,0),angle=0):
    c=math.cos(angle);q=math.sin(angle)
    for i in range(0,len(g.p),3):
        x,y,z=[g.p[i+j]*s[j] for j in range(3)]
        g.p[i:i+3]=[x*c+z*q+t[0],y+t[1],z*c-x*q+t[2]]
        x,y,z=[g.n[i+j]/s[j] for j in range(3)];n=[x*c+z*q,y,z*c-x*q];l=math.sqrt(sum(a*a for a in n));g.n[i:i+3]=[a/l for a in n]
    return g

def append(dst,src):
    off=len(dst.p)//3
    for attr in ['p','n','uv','c']:getattr(dst,attr).extend(getattr(src,attr))
    dst.i.extend(i+off for i in src.i)

def create_tool():
    b.groups={};b.RNG=random.Random(271027);b.HUMAN_SCALE=True;b.Y_SCALE=1.6;b.build()
    for pair in b.groups.values():
        for g in pair:transform(g,(1.2,1.6,1.2))
    lo,hi=bounds();zc=(lo[2]+hi[2])/2
    for pair in b.groups.values():
        for g in pair:transform(g,t=(0,0,-zc))
    return copy.deepcopy(b.groups)

TOOL=create_tool()
LED=copy.deepcopy(TOOL['vertical_led'])
LED_LO,LED_HI=bounds({'led':LED})
LED_SIZE=[LED_HI[k]-LED_LO[k] for k in range(3)]

def sign(x,bottom,z):
    pair=b.group('vertical_led')
    for dst,src in zip(pair,LED):
        append(dst,transform(copy.deepcopy(src),t=(x-(LED_LO[0]+LED_HI[0])/2,bottom-LED_LO[1],z-LED_HI[2])))

def tile():
    # Forty percent lit windows. Of lit windows, seventy percent are warm.
    r=b.RNG.random()
    return b.RNG.choice([0,1,2,3]) if r<.60 else b.RNG.choice([4,5,6,7,8,9]) if r<.88 else b.RNG.choice([10,11])

def windows(pair,x,y,z,width,rows,cols,pitch=4.1,side=0):
    wall,gl=pair
    tmp=[b.Geometry(),b.Geometry()]
    for row in range(rows):
        for col in range(cols):
            xx=(col-(cols-1)/2)*(width/cols)
            b.window(*tmp,xx,y+row*pitch,.045,width/cols*.69,1.9,tile())
    for dst,g in zip(pair,tmp):append(dst,transform(g,t=(x,0,z),angle=side))

def entrance(pair,x=0,z=4.5,y=.6):
    wall,gl=pair
    for j in range(3):wall.box(x,j*.2,z+.85-j*.25,3.8,.2,1.4,b.BEIGE)
    for dx in [-.68,.68]:b.window(wall,gl,x+dx,y,z,1.28,3.2,19)
    for dx in [-.12,.12]:wall.box(x+dx,y+1.15,z+.1,.04,.90,.06,b.STEEL)
    wall.chamfer(x,y+3.30,z+.52,4.25,.33,1.9,.2,b.EDGE)
    b.light(gl,x,y+3.34,z+1.48,3.55,.055,16)
    for dx in [-1.72,1.72]:wall.box(x+dx,y,z+.15,.23,3.3,.4,b.EDGE)
    return [x,y,z+1.15]

def balcony(pair,x,y,z,w):
    wall,gl=pair
    wall.chamfer(x,y,z,w,.25,1.6,.12,b.EDGE)
    for xx in [x-w/2+.18,x+w/2-.18]:wall.beam((xx,y+.25,z+.67),(xx,y+1.3,z+.67),.045,b.STEEL)
    wall.beam((x-w/2+.12,y+1.3,z+.67),(x+w/2-.12,y+1.3,z+.67),.055,b.STEEL)
    wall.box(x,y+.48,z+.66,w-.3,.55,.06,b.TRIM)
    b.light(gl,x,y+.04,z+.813,w-.3,.055,16)

def planters(pair,x,y,z,n=4):
    wall,gl=pair
    for i in range(n):
        xx=x+i*.8
        wall.chamfer(xx,y,z,.62,.5,.62,.08,b.TRIM)
        wall.chamfer(xx,y+.5,z,.50,.38+(i%3)*.16,.5,.16,'#53675b')

def about():
    pair=b.group('stepped_residential_studio');w,g=pair
    w.chamfer(0,0,0,15,.6,11,.7,b.TRIM)
    w.chamfer(0,.6,0,12.9,8.2,8.5,.55,b.SLATE)
    w.chamfer(-1.25,8.8,-.7,10.4,12.3,7.1,.55,b.SLATE)
    w.chamfer(-2.25,21.1,-1.2,8.4,12.3,6.1,.55,b.PLUM)
    w.chamfer(-2.25,33.4,-1.2,8.7,.4,6.3,.6,b.EDGE)
    w.chamfer(-2.7,33.8,-1.9,5.2,3.5,3.5,.45,b.TRIM)
    windows(pair,0,5.2,4.29,11.6,1,7)
    windows(pair,-1.25,9.6,2.89,9.1,3,6)
    windows(pair,-2.25,21.9,1.89,7.1,3,5)
    windows(pair,0,5.2,-4.30,11.6,1,7,side=math.pi)
    windows(pair,-1.25,9.6,-4.30,9.1,3,6,side=math.pi)
    windows(pair,-2.25,21.9,-4.30,7.1,3,5,side=math.pi)
    windows(pair,6.495,5.2,0,6.9,1,4,side=math.pi/2)
    windows(pair,3.98,9.6,-.7,5.9,3,4,side=math.pi/2)
    windows(pair,1.98,21.9,-1.2,5,3,3,side=math.pi/2)
    for y,z,x,ww in [(8.65,3.8,-1,10.5),(20.95,2.8,-2,8.5),(33.2,1.8,-2.25,8.7)]:
        balcony(pair,x,y,z,ww);planters(pair,x-ww/2+.6,y+.3,z-.25,3)
    # A continuous side spine physically carries the standardized LED.
    w.chamfer(-5.0,.6,3.15,3.8,34.1,2.45,.25,b.TRIM)
    w.chamfer(-5,34.7,3.15,4.1,.45,2.65,.25,b.EDGE)
    for y in [4.5,8.6,12.7,16.8,20.9,25,29.1]:w.box(-5,y,4.39,3.8,.07,.08,b.EDGE)
    sign(-5,12.9,4.62)
    b.equipment(w,-1,37.3,-2,1.8,.8,1.5)
    b.vent(w,-2.7,34.4,-.135,3.7,1.5)
    return entrance(pair,1.7,4.32)

def work():
    pair=b.group('linked_project_headquarters');w,g=pair
    w.chamfer(0,0,0,18,.6,11.4,.65,b.TRIM)
    w.chamfer(0,.6,-.35,16.6,4.1,8.8,.55,b.SLATE)
    for x,h,col in [(-4.4,39.6,b.SLATE),(4.4,31.4,b.PLUM)]:
        w.chamfer(x,4.7,-.6,6.2,h,7.2,.48,col)
        w.chamfer(x,4.7+h,-.6,6.55,.45,7.5,.5,b.EDGE)
        rows=9 if x<0 else 7
        windows(pair,x,5.35,3.04,5.05,rows,3)
        windows(pair,x,5.35,-4.24,5.05,rows,3,side=math.pi)
        windows(pair,x+(3.14 if x>0 else -3.14),5.35,-.6,5.9,rows,4,side=math.pi/2 if x>0 else -math.pi/2)
        for yy in range(rows+1):
            y=4.7+yy*4.1;w.box(x,y,3.1,6.2,.16,.28,b.EDGE)
        for dx in [-2.8,2.8]:w.box(x+dx,4.7,3.15,.19,h,.35,b.STEEL)
        b.equipment(w,x,5.15+h,-1.3,2.4,1.35,2.1)
    # Bridges are full enclosed volumes, with windows on both sides.
    for y in [15.7,28.0]:
        w.chamfer(0,y,-.8,4,3.0,4.1,.2,b.TRIM)
        for z,a in [(1.30,0),(-2.90,math.pi)]:windows(pair,0,y+.55,z,3.7,1,3,side=a)
        w.box(0,y-.22,-.8,4.5,.3,4.45,b.EDGE)
        b.light(g,0,y-.08,1.46,4.2,.06,17)
        w.beam((-1.5,y-.15,1.3),(1.5,y+2.9,1.3),.07,b.STEEL)
    # The tall front buttress is part of the left tower, not a free-standing sign.
    w.chamfer(-4.4,6.0,3.2,3.6,36.4,1.15,.2,b.TRIM)
    sign(-4.4,20.8,3.98)
    for xx in [-7.6,7.6]:planters(pair,xx,.6,4.2,1)
    return entrance(pair,2.1,4.12)

def ring(g,center,radius,tube,color,segments=40,axis='y',sides=5):
    cx,cy,cz=center
    def p(t):
        return (cx+radius*math.cos(t),cy,cz+radius*math.sin(t)) if axis=='y' else (cx+radius*math.cos(t),cy+radius*math.sin(t),cz)
    for j in range(segments):g.beam(p(j*math.tau/segments),p((j+1)*math.tau/segments),tube,color,sides)

def luminous_beam(g,a,c,r,tile=17,sides=5):
    tube=b.Geometry();tube.beam(a,c,r,'#ffffff',sides)
    uv=((tile%6*64+32)/512,(tile//6*64+32)/512)
    tube.uv=list(uv)*(len(tube.p)//3);append(g,tube)

def dome(g,x,y,z,r,h):
    n=16;levels=5
    for j in range(levels):
        t0=j/levels*math.pi/2;t1=(j+1)/levels*math.pi/2
        for k in range(n):
            a=k*math.tau/n;c=(k+1)*math.tau/n
            p=lambda t,q:(x+r*math.cos(t)*math.cos(q),y+h*math.sin(t),z+r*math.cos(t)*math.sin(q))
            pts=[p(t0,c),p(t0,a),p(t1,a)]
            if j<levels-1:pts.append(p(t1,c))
            g.face(pts,b.EDGE if k%4==0 else b.SLATE)

def lab():
    pair=b.group('observatory_research_tower');w,g=pair
    w.chamfer(0,0,0,15.4,.6,13,.7,b.TRIM)
    w.chamfer(0,.6,0,13.3,4.1,10.7,.6,b.PLUM)
    w.chamfer(0,4.7,-1.1,9.2,29.0,8.5,1.6,b.SLATE)
    windows(pair,0,5.5,3.2,5.6,7,4)
    windows(pair,0,5.5,-5.4,5.6,7,4,side=math.pi)
    for x,a in [(4.65,math.pi/2),(-4.65,-math.pi/2)]:windows(pair,x,5.5,-1.1,5.1,7,3,side=a)
    for y in [12.7,25,33.6]:
        w.chamfer(0,y,-1.1,11.1,.35,10.4,2.2,b.EDGE)
        ring(w,(0,y+.65,-1.1),5.2,.05,b.STEEL,32)
        b.light(g,0,y+.12,4.13,5.6,.06,17)
    dome(w,0,33.95,-1.1,4.5,4.2)
    ring(w,(0,34,-1.1),4.55,.15,b.STEEL,32)
    for j in range(24):
        a=j*math.tau/24;c=(j+.75)*math.tau/24
        luminous_beam(g,(4.61*math.cos(a),34.08,-1.1+4.61*math.sin(a)),(4.61*math.cos(c),34.08,-1.1+4.61*math.sin(c)),.045,17)
    # Telescope slit, ribs and a roof instrument; entirely opaque geometry.
    w.box(0,37.8,-1.2,1.15,.22,3.0,b.DARK)
    w.beam((0,36.1,-1),(0,40.0,-2.1),.44,b.TRIM,10)
    w.beam((0,39.3,-1.9),(0,40.1,-2.14),.58,b.STEEL,10)
    for x in [-5.1,5.1]:
        w.chamfer(x,4.7,-2,1.45,17.0,2.3,.2,b.TRIM)
        for y in [6,10.1,14.2,18.3]:b.vent(w,x,y,-.78,.85,1.5)
        w.beam((x,5.0,-.5),(x,22.6,-.5),.10,b.STEEL)
    w.chamfer(-3.7,4.7,3.45,3.7,29.7,1.7,.25,b.TRIM)
    sign(-3.7,13.0,4.48)
    b.equipment(w,4.8,4.7,3.4,2.0,1.6,2.3)
    return entrance(pair,1.6,5.40)

def games():
    pair=b.group('amusement_foundation_and_entry');w,g=pair
    w.chamfer(0,0,0,39,.6,21.5,1.2,b.TRIM)
    w.chamfer(-5.2,.6,4.1,9.2,4.2,4.8,.5,b.PLUM)
    windows(pair,-6.7,1.25,6.55,4.2,1,3)
    for xx in [-17,-12,10,16]:b.light(g,xx,.22,10.7,2.3,.07,16)
    entry=entrance(pair,-2.8,6.56)
    # Massive wheel, 31 units across; front/back rims have structural depth.
    pair=b.group('ferris_wheel_structure');w,g=pair
    cx,cy,cz=-3,23.5,-3.0;r=15.5
    for z in [cz-.75,cz+.75]:
        ring(w,(cx,cy,z),r,.16,b.EDGE,48,'z',5)
        for j in range(12):
            t=j*math.tau/12;px=cx+r*math.cos(t);py=cy+r*math.sin(t)
            w.beam((cx,cy,z),(px,py,z),.085,b.STEEL,5)
    for j in range(48):
        a=j*math.tau/48;c=(j+.88)*math.tau/48
        luminous_beam(g,(cx+r*math.cos(a),cy+r*math.sin(a),cz+.94),(cx+r*math.cos(c),cy+r*math.sin(c),cz+.94),.070,16 if j%4<3 else 18)
    w.beam((cx,cy,cz-1.1),(cx,cy,cz+1.2),.75,b.STEEL,12)
    for z in [cz-1.25,cz+1.25]:
        for dx in [-6.8,6.8]:w.beam((cx+dx,.6,z+1.2),(cx,cy,z),.36,b.SLATE,6)
    for j in range(12):
        t=j*math.tau/12;x=cx+r*math.cos(t);y=cy+r*math.sin(t)
        w.beam((x,y,cz-.75),(x,y,cz+.75),.13,b.STEEL,5)
        w.beam((x,y,cz),(x,y-1.15,cz),.065,b.STEEL,5)
        w.chamfer(x,y-3.65,cz,2.6,3.1,2.7,.22,b.PLUM if j%3==0 else b.SLATE)
        for z,a in [(cz+1.38,0),(cz-1.38,math.pi)]:
            tmp=[b.Geometry(),b.Geometry()];b.window(*tmp,0,y-3.12,0,1.95,1.85,4 if j%3 else 11)
            for dst,src in zip(pair,tmp):append(dst,transform(src,t=(x,0,z),angle=a))
        b.light(g,x,y-3.6,cz+1.40,1.9,.08,18)
    # One constant-size vertical LED on the wheel's architectural support tower.
    w.chamfer(1.9,.6,1.6,3.8,33.0,2.8,.3,b.TRIM)
    w.chamfer(1.9,33.6,1.6,4.2,.4,3.0,.3,b.EDGE)
    sign(1.9,12.1,3.24)
    # A continuous twin-rail coaster with rises, bank-free loop and real columns.
    pair=b.group('roller_coaster');w,g=pair
    n=64;points=[]
    for j in range(n):
        t=j*math.tau/n
        points.append((11+5.6*math.cos(t),5.4+3.4*math.sin(2*t)+1.0*math.cos(t),-1+7.1*math.sin(t)))
    for j,p in enumerate(points):
        q=points[(j+1)%n];prev=points[j-1];v=(q[0]-prev[0],q[2]-prev[2]);length=math.hypot(*v);nx,nz=-v[1]/length,v[0]/length
        nxt=points[(j+2)%n];v2=(nxt[0]-p[0],nxt[2]-p[2]);l2=math.hypot(*v2);nx2,nz2=-v2[1]/l2,v2[0]/l2
        for s in [-1,1]:
            start=(p[0]+s*.48*nx,p[1],p[2]+s*.48*nz);end=(q[0]+s*.48*nx2,q[1],q[2]+s*.48*nz2)
            w.beam(start,end,.085,b.STEEL,5)
            if s==1:luminous_beam(g,(start[0],start[1]+.09,start[2]),(end[0],end[1]+.09,end[2]),.04,17,4)
        if j%2==0:w.beam((p[0]-.68*nx,p[1]-.08,p[2]-.68*nz),(p[0]+.68*nx,p[1]-.08,p[2]+.68*nz),.055,b.PLUM,4)
        if j%8==0:
            w.beam((p[0],.6,p[2]),(p[0],p[1]-.12,p[2]),.19,b.SLATE,6)
            w.box(p[0],.6,p[2],.85,.28,.85,b.EDGE)
    # Parked two-car train, deliberately low-poly with visible seats.
    for j in range(2):
        p=points[22+j*2];w.chamfer(p[0],p[1]+.12,p[2],1.35,.62,1.15,.18,b.PLUM)
        w.box(p[0],p[1]+.60,p[2]-.26,1.12,.45,.18,b.TRIM)
        b.light(g,p[0],p[1]+.24,p[2]+.59,1.0,.09,18)
    pair=b.group('pirate_ship');w,g=pair
    # A-frame ride with an actual curved hull, rows of seats and safety bars.
    sx,sz=-12.3,5.8
    for z in [sz-1.5,sz+1.5]:
        for dx in [-3.1,3.1]:w.beam((sx+dx,.6,z),(sx,9.6,z),.21,b.STEEL,6)
    w.beam((sx,9.6,sz-1.65),(sx,9.6,sz+1.65),.25,b.EDGE,6)
    hull=[(sx-4.1,4.8),(sx-3.0,2.1),(sx-1.7,1.65),(sx+1.7,1.65),(sx+3,2.1),(sx+4.1,4.8),(sx+2.6,3.65),(sx-2.6,3.65)]
    # Start on the convex keel so both cap faces have unambiguous normals.
    w.extrude(hull[3:]+hull[:3],sz,2.2,b.PLUM,b.EDGE)
    for dx in [-1.8,1.8]:w.beam((sx,9.6,sz),(sx+dx,3.8,sz),.11,b.STEEL,6)
    for j in range(5):
        x=sx-2.2+j*1.1;w.box(x,3.72,sz,.20,.55,1.75,b.TRIM)
        w.beam((x+.35,4.1,sz-.8),(x+.35,4.1,sz+.8),.04,b.STEEL,5)
    for x in [sx-2.7,sx,sx+2.7]:b.light(g,x,2.7,sz+1.12,.32,.22,16)
    return entry

def atlas(entry):
    data=b.draw_atlas(FONT);base=Image.open(io.BytesIO(data[0])).convert('RGB');emit=Image.open(io.BytesIO(data[1])).convert('RGB')
    db=ImageDraw.Draw(base);de=ImageDraw.Draw(emit)
    db.rectangle((384,0,511,511),fill=(10,20,29));de.rectangle((384,0,511,511),fill=(0,0,0))
    for xx in range(390,508,8):db.line((xx,2,xx,509),fill=(13,25,34))
    font=ImageFont.truetype(str(FONT),88)
    for j,ch in enumerate(entry['led']):
        mask=Image.new('L',(128,112));ImageDraw.Draw(mask).text((64,56),ch,font=font,anchor='mm',fill=255)
        mask=mask.resize((128,70),Image.Resampling.LANCZOS)
        for im,col in [(base,(212,196,165)),(emit,(255,225,178))]:im.paste(col,(384,146+j*112-35,512,146+j*112+35),mask)
    rgb=tuple(int(entry['accent'][i:i+2],16) for i in (1,3,5));x=17%6*64;y=17//6*64
    db.rectangle((x,y,x+63,y+63),fill=tuple(int(v*.48) for v in rgb));de.rectangle((x,y,x+63,y+63),fill=rgb)
    for i,im in enumerate([base,emit]):
        buff=io.BytesIO();im.save(buff,format='PNG',optimize=True);data[i]=buff.getvalue()
    return data

def replace_metadata(raw,entry,person):
    length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary_chunk=raw[20+length:]
    doc['asset'].update(generator='Five Island Landmarks / original procedural Python geometry',copyright='Original geometry and code-drawn textures for YI-CHI KUO.')
    doc['asset']['extras']={'sourceScript':'tools/build-five-landmarks.py','aiTexture':False,'gameAssets':False}
    doc['scenes'][0]['name']=entry['id']+'_landmark';doc['nodes'][-1].update(name=entry['id']+'_landmark',extras={'pivot':'bottom-centre','units':'island-scene-units','originalHeroRootScale':1.22,'entrancePersonPosition':person,'ledScreenDimensions':[2.724,18.752]})
    data=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*(-len(data)%4)
    return struct.pack('<III',0x46546c67,2,20+len(data)+len(binary_chunk))+struct.pack('<II',len(data),0x4e4f534a)+data+binary_chunk

def main():
    OUT.mkdir(parents=True,exist_ok=True);manifest=[]
    for entry in SPECS:
        b.groups={};b.RNG=random.Random(271027+SPECS.index(entry));b.HUMAN_SCALE=True;b.Y_SCALE=1.6
        if entry['id']=='tools':b.groups=copy.deepcopy(TOOL);person=[.84,.832,3.85]
        else:person=globals()[entry['id']]()
        lo,hi=bounds();center=[(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]
        for pair in b.groups.values():
            for g in pair:transform(g,t=tuple(-v for v in center))
        person=[person[i]-center[i] for i in range(3)]
        raw,report=b.encode(atlas(entry));raw=replace_metadata(raw,entry,person)
        report.update(glbBytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),notes='Original bespoke landmark; no Meshy, game assets or AI bitmap textures.',scaleGuide={'units':'island-scene-units','originalHeroRootScale':1.22,'originalHeroHeight':HERO_HEIGHT,'doorOpeningHeight':3.12 if entry['id']=='tools' else 3.2,'typicalFloorPitch':4.016 if entry['id']=='tools' else 4.1,'entrancePersonPosition':person,'importRule':'Uniform scale 1. Re-plan island footprint; never shrink to fit old building slots.'})
        ledlo,ledhi=bounds({'vertical_led':b.groups['vertical_led']})
        report['led']={'frameDimensions':[ledhi[k]-ledlo[k] for k in range(3)],'screenDimensions':[2.724,18.752],'bounds':{'min':ledlo,'max':ledhi}}
        name=entry['id']+'-landmark.glb';(OUT/name).write_bytes(raw)
        (OUT/name).with_suffix('.report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        manifest.append({**entry,'file':name,**report})
        print(entry['id'],len(raw),'bytes',report['triangles'],'triangles', [round(v,2) for v in report['dimensions']])
    (OUT/'manifest.json').write_text(json.dumps({'version':1,'originalHeroHeight':HERO_HEIGHT,'landmarks':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()

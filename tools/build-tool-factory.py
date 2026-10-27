#!/usr/bin/env python3
"""Original Tool Room factory study. Does not modify any island or other model.

Run: python tools/build-tool-factory.py (Python 3 + Pillow).
Reuses the project's original geometry/GLB writer, never game or AI assets.
"""
from pathlib import Path
import importlib.util, json, math, random, struct, hashlib

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('geometry',ROOT/'tools/build-tool-tower.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
b.HUMAN_SCALE=True;b.Y_SCALE=1.6;b.RNG=random.Random(27102731)
OUT=ROOT/'assets/island-city/tool-factory'
SLATE='#50636a';TEAL='#3b565b';DARK='#26343d';METAL='#859293';EDGE='#697b80';ORANGE='#bd8352';CONCRETE='#8a9189'

def transformed(dst,src,t=(0,0,0),angle=0):
    start=len(dst.p)//3;c,s=math.cos(angle),math.sin(angle)
    for arr,ispos in [(src.p,True),(src.n,False)]:
        target=dst.p if ispos else dst.n
        for i in range(0,len(arr),3):
            x,y,z=arr[i:i+3];target.extend((x*c+z*s+(t[0] if ispos else 0),y+(t[1] if ispos else 0),z*c-x*s+(t[2] if ispos else 0)))
    dst.uv.extend(src.uv);dst.c.extend(src.c);dst.i.extend(start+i for i in src.i)

def window(pair,x,y,z,w,h,tile=4,angle=0):
    a,c=b.Geometry(),b.Geometry();b.window(a,c,0,0,0,w,h,tile)
    for dst,src in zip(pair,[a,c]):transformed(dst,src,(x,y,z),angle)

def rail(g,a,c,height=1.1):
    # Person-scale guardrail; railings are never resized with the building.
    g.beam((a[0],a[1]+height,a[2]),(c[0],c[1]+height,c[2]),.055,METAL)
    g.beam((a[0],a[1]+height*.50,a[2]),(c[0],c[1]+height*.50,c[2]),.035,EDGE)
    n=max(1,math.ceil(math.dist(a,c)/1.6))
    for i in range(n+1):
        p=tuple(a[k]+(c[k]-a[k])*i/n for k in range(3));g.beam(p,(p[0],p[1]+height,p[2]),.045,METAL)

def pipe(g,points,r=.16,color=METAL):
    for a,c in zip(points,points[1:]):g.beam(a,c,r,color,8)

def ring(g,x,y,z,r,tube=.06,n=20,color=EDGE):
    for i in range(n):
        a=i*math.tau/n;c=(i+1)*math.tau/n
        g.beam((x+r*math.cos(a),y,z+r*math.sin(a)),(x+r*math.cos(c),y,z+r*math.sin(c)),tube,color,4)

def horizontal_light(g,x,y,z,w,d,tile=16):
    uv=b.uv_tile(tile)
    g.face([(x-w/2,y,z+d/2),(x+w/2,y,z+d/2),(x+w/2,y,z-d/2),(x-w/2,y,z-d/2)],'#ffffff',uv)

def build():
    b.groups={}
    w,g=b.group('factory_foundation')
    # A thin building apron only: no island terrain, water, bridge or lighthouse.
    w.chamfer(0,0,0,37,.30,25,.8,DARK)
    w.chamfer(0,.30,0,36.4,.12,24.4,.5,CONCRETE)
    for x in [-15,-9,-3,3,9,15]:w.box(x,.425,10.6,.025,.012,3.4,DARK)
    for x in [-3.6,2.6,8.8]:
        w.box(x,.435,11.0,4.9,.012,.10,ORANGE)
        for dx in [-2.45,2.45]:w.box(x+dx,.435,10,.09,.012,2.1,ORANGE)
    # Tactile walkway from the original avatar-sized door.
    for i in range(7):w.box(-11.4,.435,9+i*.43,2.7,.012,.20,'#bcc0aa')

    pair=b.group('sawtooth_production_hall');w,g=pair
    # Main hall shell with real openings; no solid box behind loading bays.
    w.box(-6.9,.42,-.7,.35,9.8,18.6,TEAL)
    w.box(11.9,.42,-.7,.35,9.8,18.6,TEAL)
    w.box(2.5,.42,-9.85,19.1,9.8,.35,TEAL)
    w.box(2.5,.43,-1,18.7,.06,17.6,'#4b5356')
    w.box(2.5,7.1,8.5,19.1,3.12,.48,TEAL)
    for x in [-7,-.6,5.6,12]:
        w.box(x,.42,8.5,.36,9.8,.65,EDGE)
        w.chamfer(x,.42,8.7,.62,.62,.9,.08,DARK)
    # Sloped steel teeth and upright clerestory glazing, four real roof sections.
    for j in range(4):
        z=8.75-j*4.65;back=z-4.65
        roof=[(-7.15,10.22,back),(12.2,10.22,back),(12.2,12.8,z),(-7.15,12.8,z)]
        w.face(list(reversed(roof)),SLATE)
        w.face([(x,y-.18,zz) for x,y,zz in roof],DARK)
        for x,sign in [(-7.15,-1),(12.2,1)]:
            pts=[(x,10.12,back),(x,10.12,z),(x,12.8,z)]
            w.face(pts if sign<0 else list(reversed(pts)),TEAL)
        w.box(2.5,12.8,z,19.7,.16,.30,EDGE)
        for k in range(8):
            x=-5.8+k*2.35
            window(pair,x,10.43,z+.05,2.10,2.03,4 if (k+j)%3 else 19)
        # Roof seams slope with roof, keeping the sawtooth silhouette visible.
        for x in [-6.8,-3.65,-.5,2.65,5.8,8.95,11.8]:
            w.beam((x,10.29,back+.08),(x,12.88,z-.08),.045,EDGE,4)
    # Surface ribs on both long sides and rear; finish every camera angle.
    for x in [-7.12,12.12]:
        for z in [-9,-7,-5,-3,-1,1,3,5,7]:w.box(x,.7,z,.08,6.0,.10,EDGE)
        for z in [-7.4,-3.4,.6,4.6]:window(pair,x,7.8,z,3.1,1.5,4 if z in [-3.4,4.6] else 1,math.pi/2 if x>0 else -math.pi/2)
    for x in [-5,-1,3,7,11]:
        window(pair,x,7.65,-10.05,2.8,1.7,1 if x%3 else 5,math.pi)
        w.box(x,.6,-10.1,.10,6.7,.10,EDGE)
    # Triangular exterior steel bracing; restrained amber paint.
    for x in [-6.6,11.5]:
        w.beam((x,.8,8.9),(x+(.85 if x<0 else -.85),6.8,8.9),.12,ORANGE,4)

    pair=b.group('loading_bays_and_workshop');w,g=pair
    for x,opened in [(-3.6,False),(2.6,True),(8.8,False)]:
        for dx in [-2.65,2.65]:w.box(x+dx,.42,8.72,.16,6.65,.28,DARK)
        w.box(x,6.96,8.7,5.6,.20,.35,DARK)
        # Central shutter is rolled up; a conveyor and robot live behind it.
        if not opened:
            w.box(x,.42,8.60,5.1,6.5,.12,'#56676e')
            for j in range(14):w.box(x,.59+j*.44,8.69,5.1,.045,.06,METAL)
            window(pair,x,3.0,8.75,3.7,.82,19)
        else:
            w.box(x,6.22,8.61,5.1,.72,.20,EDGE)
            for j in range(3):w.box(x,6.25+j*.22,8.77,5.08,.04,.06,METAL)
        w.chamfer(x,7.15,9.25,5.75,.18,2.0,.12,DARK)
        b.light(g,x,7.10,10.28,4.8,.085,16)
        for dx in [-2.55,2.55]:
            w.beam((x+dx,.42,9.2),(x+dx,1.6,9.2),.11,ORANGE,8)
            w.beam((x+dx,.83,9.2),(x+dx,1.1,9.2),.115,DARK,8)
    # Visible fabrication bay, tool cabinets and conveyor.
    w.box(2.6,.42,5.0,3.4,.25,4.3,DARK)
    for z in [3.5,6.5]:
        for x in [1.4,3.8]:w.box(x,.67,z,.16,.85,.16,METAL)
    w.box(2.6,1.4,5,3.4,.22,4.2,EDGE)
    for j in range(12):w.beam((1.05,1.65,3.15+j*.34),(4.15,1.65,3.15+j*.34),.09,METAL,6)
    w.chamfer(2.6,1.77,5,1.5,.7,1.4,.15,TEAL)
    w.chamfer(-.8,.42,4,1.4,.7,1.4,.12,DARK)
    w.beam((-.8,1.12,4),(-.8,2.4,4),.34,ORANGE,10)
    w.beam((-.8,2.4,4),(.2,3.4,4),.23,ORANGE,8)
    w.beam((.2,3.4,4),(1.3,2.8,4.5),.16,ORANGE,8)
    for p in [(-.8,2.4,4),(.2,3.4,4),(1.3,2.8,4.5)]:w.beam((p[0],p[1],p[2]-.28),(p[0],p[1],p[2]+.28),.28,DARK,10)
    for x in [5,7,9]:
        w.box(x,.42,-6,1.5,2.6,.85,EDGE)
        for y in [.9,1.6,2.3]:w.box(x,y,-5.55,1.2,.05,.07,DARK)
    # Overhead crane rails visible through the open central bay.
    for x in [-5.8,10.8]:w.box(x,7.8,-.7,.35,.35,17.5,ORANGE)
    w.box(2.5,7.9,3.2,16.9,.65,.60,ORANGE)
    w.box(2.5,7.85,3.2,1.35,.75,1.2,DARK)
    w.beam((2.5,7.85,3.2),(2.5,4.7,3.2),.035,METAL,6)

    pair=b.group('factory_control_tower');w,g=pair
    w.chamfer(-11.6,.42,-.4,8.3,21.0,13.4,.38,TEAL)
    w.chamfer(-11.6,21.42,-.8,8.0,6.7,11.5,.55,SLATE)
    w.chamfer(-11.9,28.12,-1.4,6.9,.35,9.8,.4,EDGE)
    w.chamfer(-12.4,28.47,-1.9,5.6,1.65,7.8,.30,DARK)
    # The entrance is 3.4 units tall against an unchanged 2.715-unit avatar.
    window(pair,-11.5,.42,6.35,2.5,3.4,19)
    for dx in [-.15,.15]:w.box(-11.5+dx,1.5,6.50,.055,.85,.08,METAL)
    w.chamfer(-11.5,4.02,7.2,4.8,.27,3.0,.18,EDGE)
    b.light(g,-11.5,4.00,8.74,3.95,.08,16)
    # Stacked bands / recessed control room, distinct from a residential tower.
    for y in [5.6,10.8,16.0,21.25]:
        w.box(-11.6,y,6.40,8.1,.22,.50,EDGE)
        for x in [-15.85,-7.35]:w.box(x,y,-.4,.25,.22,13.2,EDGE)
    for y in [6.2,11.4,16.6]:
        window(pair,-8.7,y,6.43,1.45,2.4,4 if y!=11.4 else 1)
        for z in [-5,-1,3]:window(pair,-15.81,y,z,2.6,2.4,5 if z==-1 else 1,-math.pi/2)
        for x in [-14,-11.2,-8.4]:window(pair,x,y,-7.16,2.0,2.4,4 if x==-11.2 else 1,math.pi)
    for x in [-14.0,-11.6,-9.2]:
        window(pair,x,24.1,5.0,1.85,2.5,5)
        window(pair,x,24.1,-6.63,1.85,2.5,19,math.pi)
    # Control rooms and utility cladding on the side above the production hall.
    for y in [14.0,18.2]:
        for z in [-4.6,-1.3,2.0]:window(pair,-7.40,y,z,2.3,2.1,5 if z==-1.3 else 1,math.pi/2)
    for z in [-4.1,-1.1,1.9]:window(pair,-7.55,24.1,z,2.1,2.5,4,math.pi/2)
    for y in [13.4,17.6,21.1]:w.box(-7.35,y,-1.2,.24,.17,11.5,EDGE)
    for z in [3.65,4.4]:
        pipe(w,[(-7.18,13.0,z),(-7.18,22.3,z),(-7.8,23.0,z),(-7.8,27.4,z)],.14,METAL)
        for y in [14.5,18,21.5]:w.beam((-7.18,y,z),(-7.18,y+.16,z),.20,DARK,8)
    # Brackets tie the sign to the setback instead of leaving its top floating.
    for y in [23.0,25.8]:
        for x in [-13.1,-11.1]:w.beam((x,y,4.8),(x,y,6.8),.10,EDGE,6)
    # Outer skeleton and protective pylons, with stepped cap.
    for x in [-15.65,-7.55]:
        w.box(x,.42,6.0,.42,23.0,1.1,DARK)
        w.beam((x,23.42,6.0),(x+(.4 if x< -10 else -.4),27.6,4.8),.20,EDGE,4)
    for x in [-15.0,-8.2]:
        w.beam((x,1.0,-7.30),(x,26,-7.30),.15,METAL,8)
        for y in [3,8,13,18,23]:w.beam((x,y,-7.30),(x,y+.18,-7.30),.21,DARK,8)
    b.vent(w,-11.6,28.75,2.10,3.7,.95)
    # Service stair on the outer side, at full human scale.
    for j in range(18):w.box(-17.0,.42+j*.25,-6+j*.50,1.65,.25,.52,EDGE)
    rail(w,(-17.83,.67,-6),(-17.83,4.92,2.5))
    w.box(-16.7,4.92,3.65,2.4,.24,2.5,EDGE)
    rail(w,(-17.9,5.16,2.4),(-17.9,5.16,4.9))

    # Exact screen size from the five landmark study, integrated into the wall.
    w,g=b.group('vertical_led')
    x=-12.1;bottom=7.50;sw=2.724;sh=18.752;z=6.94
    w.chamfer(x,bottom-.25,z-.12,sw+.50,sh+.50,.48,.16,DARK)
    g.face([(x-sw/2,bottom,z+.14),(x+sw/2,bottom,z+.14),(x+sw/2,bottom+sh,z+.14),(x-sw/2,bottom+sh,z+.14)],'#ffffff',[(385/512,510/512),(510/512,510/512),(510/512,2/512),(385/512,2/512)])
    for dx in [-sw/2-.08,sw/2+.08]:b.light(g,x+dx,bottom-.06,z+.16,.06,sh+.12,17)
    for y in [bottom-.10,bottom+sh+.04]:b.light(g,x,y,z+.16,sw+.24,.06,17)

    pair=b.group('service_silos_and_pipes');w,g=pair
    # Two faceted accumulator tanks with collars and pipe bends.
    for z,height in [(-5.8,13.0),(1.0,10.0)]:
        x=15.0
        w.chamfer(x,.42,z,4.2,.45,4.2,.35,DARK)
        w.beam((x,.87,z),(x,height,z),1.72,METAL,16)
        for y in [1.0,3.3,7.3,height-.2]:ring(w,x,y,z,1.76,.09,16,DARK)
        w.beam((x,height,z),(x,height+.32,z),1.81,EDGE,16)
        w.beam((x,height+.32,z),(x,height+.9,z),.48,DARK,12)
        pipe(w,[(x,height+.8,z),(x-1,height+1.3,z),(11.9,height+1.3,z),(11.9,8,z)],.16,ORANGE)
        for xx in [x-.42,x+.42]:w.beam((xx,1,z+1.8),(xx,height+.8,z+1.8),.045,DARK,6)
        for j in range(int(height/.5)):w.beam((x-.42,1+j*.5,z+1.8),(x+.42,1+j*.5,z+1.8),.045,EDGE,6)
    # Elevated pipe rack on the rear service edge.
    for x in [-6,2,10]:
        w.box(x,.42,-11,.20,6.9,.20,EDGE)
        w.box(x,7.22,-10.5,.25,.20,2.8,EDGE)
    for z,r,col in [(-11.1,.22,ORANGE),(-10.3,.16,METAL)]:
        pipe(w,[(-8,7.6,z),(12,7.6,z),(14,5.6,z),(14,1.2,z)],r,col)
        for x in [-5,0,5,10]:w.beam((x,7.6,z),(x+.16,7.6,z),r+.08,DARK,8)
    # Slim stack and a framed observation platform, not a second billboard.
    x,z=-9.5,-4.0
    w.beam((x,28.47,z),(x,33,z),.52,SLATE,12)
    for y in [29,31.5,32.8]:w.beam((x,y,z),(x,y+.13,z),.63,EDGE,12)
    w.box(-12.8,28.47,-1.2,2.5,.7,3.2,SLATE)
    for zz in [-2.3,-1.2,-.1]:w.box(-12.8,29.17,zz,2.5,.15,.20,EDGE)

    pair=b.group('roof_ventilation');w,g=pair
    # Fans remain separate export nodes, with explicitly preserved pivots.
    for idx,(x,z) in enumerate([(4.2,-4.9),(8.5,-4.9)]):
        y=10.9
        w.beam((x,y-.5,z),(x,y+.65,z),1.1,DARK,12)
        ring(w,x,y+.73,z,1.14,.10,24,EDGE)
        fan,unused=b.group('fan_'+str(idx))
        fan.beam((x,y+.55,z),(x,y+.78,z),.22,METAL,10)
        for k in range(5):
            blade=b.Geometry();blade.extrude([(.12,0),(.90,.05),(1.0,.13),(.20,.12)],0,.34,METAL)
            transformed(fan,blade,(x,y+.66,z),k*math.tau/5)
    # Low service equipment has repeated ribs and real clearance off the ground.
    w,g=pair
    w.chamfer(14.6,.42,7.5,4.4,3.25,3.7,.25,SLATE)
    b.vent(w,14.6,.85,9.40,3.6,2.2)
    b.light(g,14.6,3.30,9.46,2.8,.07,16)
    # A small beacon is intentionally smooth; no flashing/strobe sequence.
    w,g=b.group('status_beacon');w.beam((-9.5,33,-4),(-9.5,33.35,-4),.11,DARK,8)
    b.light(g,-9.5,33.26,-3.86,.18,.16,18)

def main():
    build();raw,report=b.encode(b.draw_atlas(Path('C:/Windows/Fonts/msjh.ttc')))
    length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);tail=raw[20+length:]
    doc['asset'].update(generator='Tool Room Factory / original procedural Python',copyright='Original geometry and code-drawn textures for YI-CHI KUO.')
    doc['asset']['extras']={'sourceScript':'tools/build-tool-factory.py','aiTexture':False,'gameAssets':False}
    doc['scenes'][0]['name']='tool_factory';doc['nodes'][-1].update(name='tool_factory',extras={'pivot':'bottom-centre','units':'island-scene-units','originalHeroRootScale':1.22,'previewOnly':True})
    doc['materials'][0]['pbrMetallicRoughness'].update(metallicFactor=.28,roughnessFactor=.86)
    for i,(x,z) in enumerate([(4.2,-4.9),(8.5,-4.9)]):
        n=next(n for n in doc['nodes'] if n['name']=='fan_'+str(i));n['extras']={'rotationPivot':[x,11.61,z]}
    encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*(-len(encoded)%4)
    raw=struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail
    report.update(glbBytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),notes='Standalone factory architecture study. All original procedural geometry and drawn textures. No island changes.',scaleGuide={'units':'island-scene-units','originalHeroRootScale':1.22,'originalHeroHeight':2.7151781028557695,'doorOpeningHeight':3.4,'loadingDoorHeight':6.5,'entrancePersonPosition':[-11.5,.42,7.3]},led={'screenDimensions':[2.724,18.752]},originalLayoutChanged=False)
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'tool-factory-original.glb').write_bytes(raw)
    (OUT/'tool-factory-original.report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
    (OUT/'ATTRIBUTION.txt').write_text('Tool Room Factory — 2026-10-27\nOriginal procedural architecture by code for YI-CHI KUO.\nGeometry: tools/build-tool-factory.py. Shared geometry writer: tools/build-tool-tower.py.\nAll texture pixels are drawn by code; no game models, game textures, AI bitmap textures or downloaded mesh assets.\nThe system font is used to rasterize 工具房; no font file is distributed.\nStandalone architecture preview only. Original five islands, lighthouse and site files are unchanged.\n',encoding='utf8')
    print(json.dumps({'bytes':len(raw),'triangles':report['triangles'],'dimensions':report['dimensions'],'parts':len(report['parts'])}))

if __name__=='__main__':main()

#!/usr/bin/env python3
"""Original elevated fabrication plant: structural steel, gear drive and catwalks.

Reference images inform architecture only. No imported image/model assets.
Writes a separate study; preserves the tank study and all original island files.
Run with Python 3 and Pillow. Shared original GLB writer remains unmodified.
"""
from pathlib import Path
import importlib.util, math, random, io, json, struct, hashlib
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('heavy_helpers',ROOT/'tools/build-heavy-factory.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
f=h.f;b=h.b
OUT=ROOT/'assets/island-city/gear-factory'
R=random.Random(27102793)
INK='#26383f';FRAME='#41545a';EDGE='#899694';WALL='#c7c5b7';PALE='#ded9c9';BLUE='#437b8f';DARKBLUE='#355c6b';BRASS='#c39459';RUST='#8b5e49';PAVING='#77817c'
GEARS=[{'name':'drive_gear_24','pivot':[-1.4,5.7,6.2],'teeth':24,'pitchRadius':2.9,'speed':.18,'phase':0},
       {'name':'drive_gear_18','pivot':[3.675,5.7,6.2],'teeth':18,'pitchRadius':2.175,'speed':-.24,'phase':math.pi/18}]

def girder(g,a,c,w=.36,depth=.50,col=FRAME):
    """An I-section for horizontal X beams or vertical columns, not a solid tube."""
    if abs(a[0]-c[0])<1e-6 and abs(a[2]-c[2])<1e-6:
        x,y,z=a;hh=c[1]-y
        g.box(x,y,z,w*.24,hh,depth,col)
        for zz in [-depth/2,depth/2]:g.box(x,y,z+zz,w,hh,.075,col)
    elif abs(a[1]-c[1])<1e-6 and abs(a[2]-c[2])<1e-6:
        x=(a[0]+c[0])/2;y=a[1];z=a[2];ww=c[0]-a[0]
        g.box(x,y-depth/2,z,ww,depth,.075,col)
        for yy in [-depth/2,depth/2]:g.box(x,y+yy-.04,z,ww,.08,w,col)
    else:g.beam(a,c,w*.5,col,4)

def front_panel(g,x,y,z,w,hh,col=WALL):
    g.box(x,y,z,w,hh,.18,col)
    # Separate panel edges, fasteners and restrained water streaks are geometry.
    for xx in [x-w/2+.10,x+w/2-.10]:
        for yy in [y+.13,y+hh-.13]:g.box(xx,yy,z+.103,.047,.047,.035,EDGE)
    if R.random()<.48:
        xx=x+R.uniform(-w*.35,w*.35)
        g.box(xx,y+hh*.25,z+.094,.022,hh*.68,.008,'#989e95')

def ring_xy(g,x,y,z,r0,r1,d,col=BRASS,segments=48):
    for i in range(segments):
        a=i*math.tau/segments;c=(i+1)*math.tau/segments
        p=lambda r,t,zz:(x+r*math.cos(t),y+r*math.sin(t),zz)
        ai,ao,bi,bo=p(r0,a,z+d/2),p(r1,a,z+d/2),p(r0,c,z+d/2),p(r1,c,z+d/2)
        g.face([ai,ao,bo,bi],col)
        g.face([(xx,yy,z-d/2) for xx,yy,zz in [bi,bo,ao,ai]],col)
        g.face([p(r1,a,z-d/2),p(r1,c,z-d/2),bo,ao],col)
        g.face([p(r0,c,z-d/2),p(r0,a,z-d/2),ai,bi],col)

def gear(g,meta):
    x,y,z=meta['pivot'];N=meta['teeth'];rp=meta['pitchRadius'];phase=meta['phase']
    module=2*rp/N;root=rp-1.25*module;tip=rp+.88*module;inside=rp*.67;depth=.38
    # Six vertices per tooth, trapezoid approximation with root clearance.
    contour=[]
    for i in range(N):
        for angle,radius in [(-.5,root),(-.31,root),(-.16,tip),(.16,tip),(.31,root),(.5,root)]:
            # Last root of each tooth is first root of next; don't duplicate it.
            if angle==.5:continue
            a=(i+angle)*math.tau/N+phase;contour.append((a,radius))
    for i,(a,r) in enumerate(contour):
        c,rr=contour[(i+1)%len(contour)];p=lambda radius,angle,zz:(x+radius*math.cos(angle),y+radius*math.sin(angle),zz)
        front=[p(inside,a,z+depth/2),p(r,a,z+depth/2),p(rr,c,z+depth/2),p(inside,c,z+depth/2)]
        g.face(front,BRASS);g.face([(xx,yy,z-depth/2) for xx,yy,zz in reversed(front)],FRAME)
        g.face([p(r,a,z-depth/2),p(rr,c,z-depth/2),p(rr,c,z+depth/2),p(r,a,z+depth/2)],'#d1b27e')
        g.face([p(inside,c,z-depth/2),p(inside,a,z-depth/2),p(inside,a,z+depth/2),p(inside,c,z+depth/2)],RUST)
    ring_xy(g,x,y,z+.23,rp*.56,rp*.62,.09,EDGE,40)
    for i in range(6):
        a=i*math.tau/6+phase;ca,sa=math.cos(a),math.sin(a)
        # Tapered spokes make actual open holes; no transparent texture.
        pts=[(.36,-.17),(inside+.05,-.23),(inside+.05,.23),(.36,.17)]
        g.extrude([(x+u*ca-v*sa,y+u*sa+v*ca) for u,v in pts],z,.28,BRASS,RUST)
        qx=x+rp*.53*ca;qy=y+rp*.53*sa
        g.beam((qx,qy,z+.15),(qx,qy,z+.26),.07,INK,6)
    g.beam((x,y,z-.30),(x,y,z+.35),.43,FRAME,16)
    g.beam((x,y,z+.36),(x,y,z+.51),.26,EDGE,12)

def build():
    b.groups={}
    w,g=b.group('building_apron')
    w.chamfer(0,0,0,42,.30,30,.75,INK);w.chamfer(0,.30,0,41.5,.12,29.5,.55,PAVING)
    # Expansion joints and a quiet working yard, not a new island footprint.
    for x in [-18,-12,-6,0,6,12,18]:w.box(x,.423,10,.023,.009,8.5,FRAME)
    for z in [-12,-6,0,6,12]:w.box(0,.424,z,40.5,.009,.025,FRAME)
    for x in [5.2,11.4,17.6]:
        for xx in [x-2.6,x+2.6]:w.box(xx,.44,11.3,.08,.014,4.4,PALE)
        w.box(x,.44,13.5,5.25,.014,.08,PALE)
    for i in range(7):w.box(-14,.44,7.8+i*.72,3.15,.014,.29,'#e4d5a7')
    for x in [-18.5,18.5]:
        w.box(x,.42,-1,1.0,.22,24,EDGE)
        for z in range(-12,12,3):w.box(x,.65,z,1,.015,.055,FRAME)

    w,g=b.group('exposed_structural_frame')
    cols=[-5.7,1.0,7.7,14.4]
    for x in cols:
        for z in [-9.9,5.6]:
            w.chamfer(x,.42,z,1.12,.55,1.12,.09,EDGE)
            girder(w,(x,.97,z),(x,11.1,z),.42,.52)
            for dx in [-.38,.38]:
                for dz in [-.38,.38]:w.beam((x+dx,.97,z+dz),(x+dx,1.07,z+dz),.055,INK,6)
    for z in [-9.9,5.6]:
        for yy in [4.8,10.8]:girder(w,(-5.95,yy,z),(14.65,yy,z),.40,.58)
    # Clear central machine bay; cross-bracing in the end bays and along sides.
    for z in [-9.9,5.6]:
        for x0,x1 in [(-5.7,1),(7.7,14.4)]:
            if z>0 and x0<0:continue
            for a,c in [((x0,1,z),(x1,10.45,z)),((x1,1,z),(x0,10.45,z))]:w.beam(a,c,.105,EDGE,4)
    for x in [-5.7,14.4]:
        for z0,z1 in [(-9.9,-2.15),(-2.15,5.6)]:
            for a,c in [((x,1,z0),(x,10.45,z1)),((x,1,z1),(x,10.45,z0))]:w.beam(a,c,.11,FRAME,4)
            w.beam((x,.97,z0),(x,10.8,z0),.17,FRAME,4)
        for y in [4.8,10.8]:w.beam((x,y,-10.1),(x,y,5.8),.24,FRAME,4)
    # Deep transfer beams make the upper hall visibly supported.
    for x in [-5.5,1,7.7,14.3]:w.box(x,10.65,-2.15,.50,.95,16.0,FRAME)
    w.box(4.35,11.05,-2.15,21.2,.50,16.2,EDGE)
    for x in [-3.5,3.2,10.0]:b.light(g,x,10.64,5.85,4.3,.11,16)

    pair=b.group('elevated_panelled_production_hall');w,g=pair
    # Light upper volume with blue bands; no text or copied brand graphics.
    w.box(4.35,11.55,-2.15,20.6,15.0,15.7,'#9caaa5')
    for z in [5.80,-10.10]:
        local=b.Geometry()
        for row in range(3):
            for col in range(8):
                xx=-4.65+col*2.57;yy=11.7+row*2.83
                front_panel(local,xx,yy,0,2.54,2.80,[WALL,PALE,'#bfbfb1'][((col//3)+row)%3])
        f.transformed(w,local,(0 if z>0 else 8.7,0,z),0 if z>0 else math.pi)
        # Exterior blue metal fascia and thin overhanging coping.
        w.box(4.35,24.7,z,20.95,1.68,.34,BLUE)
        w.box(4.35,26.43,z,21.25,.20,.50,EDGE)
        w.box(4.35,20.15,z,20.9,.20,.32,DARKBLUE)
        for j in range(10):
            xx=-4.9+j*2.05;angle=0 if z>0 else math.pi
            f.window(pair,xx,20.52,z+(.20 if z>0 else -.20),1.87,3.82,19 if j%4 else (5 if z>0 else 1),angle)
            f.window(pair,xx,25.25,z+(.20 if z>0 else -.20),1.3,.48,19,angle)
        # Lower service windows are sparse, sized for the original avatar.
        for xx in [-3.8,2.1,8.0,12.0]:f.window(pair,xx,12.9,z+(.22 if z>0 else -.22),1.0,2.0,1,0 if z>0 else math.pi)
    # Side cladding uses the same bays and dark clerestory band.
    for x,angle in [(-6.0,-math.pi/2),(14.7,math.pi/2)]:
        for j in range(6):
            zz=-8.8+j*2.55
            local=b.Geometry()
            for row in range(3):front_panel(local,0,11.7+row*2.83,0,2.52,2.80,WALL if j%2 else PALE)
            f.transformed(w,local,(x,0,zz),angle)
            f.window(pair,x,20.52,zz,2.32,3.82,19 if j%3 else 4,angle)
            f.window(pair,x,25.25,zz,1.35,.48,19,angle)
        w.box(x,24.7,-2.15,.34,1.68,16.1,BLUE)
        w.box(x,26.43,-2.15,.50,.20,16.35,EDGE)
    w.box(4.35,26.55,-2.15,21.2,.22,16.4,'#8f9a95')

    pair=b.group('service_core_and_pedestrian_entry');w,g=pair
    w.chamfer(-14,.42,-3.8,6.4,26.2,12.3,.12,FRAME)
    # Facade plates on the narrow utility spine, right beside the glazing.
    for y in [.7,4.4,8.1,11.8,15.5,19.2,22.9]:
        w.box(-14,y,2.41,6.22,3.4,.16,DARKBLUE if y>8 else BLUE)
        f.window(pair,-17.24,y+.4,-4.0,4.2,2.1,4 if y in [4.4,15.5] else 19,-math.pi/2)
        w.box(-14,y,-9.98,6.1,.085,.12,EDGE)
        f.window(pair,-14,y+.45,-10.06,3.6,1.7,1 if y<12 else 19,math.pi)
    w.box(-14,26.62,-3.8,6.9,.22,12.8,EDGE)
    # Entrance is a real alcove framed around a 3.4-unit door.
    f.window(pair,-14,.42,2.62,2.2,3.4,19)
    for xx in [-14.12,-13.88]:w.box(xx,1.65,2.77,.06,.85,.08,EDGE)
    w.box(-14,4.05,3.05,5.4,.23,2.05,FRAME)
    b.light(g,-14,4.03,4.12,4.4,.10,16)
    for xx in [-16.4,-11.6]:w.beam((xx,.42,3.92),(xx,4.05,3.92),.065,EDGE,6)
    # Stair tower is exposed at the back, scale kept human-readable.
    for flight in range(3):
        y0=.42+flight*3.7;x=-9.5;z=-9.5 if flight%2==0 else -4.95;direction=1 if flight%2==0 else -1
        for j in range(14):w.box(x,y0+j*.26,z+direction*j*.35,1.65,.26,.37,FRAME)
        f.rail(w,(x-.88,y0+.26,z),(x-.88,y0+3.64,z+direction*4.55),1.0)
        w.box(-9.5,y0+3.64,z+direction*5.25,2.3,.20,1.4,EDGE)

    w,g=b.group('vertical_led');x=-14;y=6.7;z=2.68;sw=2.724;sh=18.752
    w.chamfer(x,y-.25,z-.10,sw+.48,sh+.5,.4,.10,INK)
    g.face([(x-sw/2,y,z+.13),(x+sw/2,y,z+.13),(x+sw/2,y+sh,z+.13),(x-sw/2,y+sh,z+.13)],'#ffffff',[(385/512,510/512),(510/512,510/512),(510/512,2/512),(385/512,2/512)])
    for xx in [x-sw/2-.07,x+sw/2+.07]:b.light(g,xx,y-.06,z+.15,.05,sh+.12,17)

    w,g=b.group('skywalks_and_maintenance_decks')
    # Cross-site elevated access bridge, projecting in front of the hall.
    w.box(-1.1,10.18,7.25,31.7,.28,2.4,FRAME)
    girder(w,(-16.95,9.9,8.49),(14.75,9.9,8.49),.20,.60)
    girder(w,(-16.95,9.9,6.01),(14.75,9.9,6.01),.20,.60)
    for z in [6.02,8.49]:
        for j in range(14):
            xx=-16.9+j*2.25;w.beam((xx,9.6,z),(xx+2.25,10.18,z),.045,EDGE,4)
        f.rail(w,(-16.9,10.46,z),(14.7,10.46,z),1.12)
    for x in [-9,14.7]:
        girder(w,(x,.42,8.0),(x,10.18,8.0),.30,.40)
        w.beam((x,7.8,8),(x-1.4,10.14,8),.10,FRAME,4)
    # Short back bridge makes the two building masses physically connected.
    w.box(-8.35,14.8,-6.5,5.4,.28,2.7,FRAME)
    for z in [-5.14,-7.86]:f.rail(w,(-11.05,15.08,z),(-5.65,15.08,z),1.08)
    for xx in [-9.5,-7]:w.beam((xx,12.7,-6.5),(xx,14.8,-5.35),.10,FRAME,4)
    for xx in [-14,-5,5,13]:b.light(g,xx,9.73,8.58,2.0,.08,16)

    pair=b.group('gear_transmission_bay');w,g=pair
    w.chamfer(1.3,.42,4.0,12.5,1.25,6.1,.14,'#92978b')
    w.box(1.2,1.67,3.7,12.2,.18,5.45,INK)
    # Mechanical housing behind the wheels; face left open for maintenance.
    w.chamfer(1.5,2.0,4.80,10.9,7.55,1.45,.22,DARKBLUE)
    for x in [-3.9,6.9]:w.box(x,1.8,5.58,.35,7.6,.25,FRAME)
    for gg in GEARS:
        x,y,z=gg['pivot']
        w.beam((x,y,4.9),(x,y,6.1),.27,EDGE,16)
        w.chamfer(x,y-.63,5.63,1.25,1.25,.72,.12,FRAME)
        for xx in [-.44,.44]:
            for yy in [-.44,.44]:w.beam((x+xx,y+yy,6.0),(x+xx,y+yy,6.12),.075,EDGE,6)
        gear(b.group(gg['name'])[0],gg)
    # Ribbed motor, reduction case and conduit connect the display to production.
    w.beam((8.2,3.1,1.3),(8.2,3.1,5.8),.95,BLUE,16)
    for zz in [1.4+i*.27 for i in range(16)]:w.beam((8.2,3.1,zz),(8.2,3.1,zz+.07),1.03,FRAME,16)
    w.chamfer(8.2,1.72,3.5,2.6,.38,5.0,.08,FRAME)
    h.tube(w,h.curve([(8.2,4,2),(8.2,8.8,2),(3,8.8,2),(3,11.3,2)],.5),.17,BRASS,8)
    # Short foreground guardrails leave a frontal view of the drive pair.
    for x in [-5.6,9.6]:f.rail(w,(x,.42,7.2),(x,.42,3.0),1.3)
    w.box(1.3,1.81,7.14,12.0,.08,.14,BRASS)
    for x in [-4,7]:
        w.box(x,.42,7.5,.14,1.6,.14,BRASS);w.box(x,1.6,7.5,.23,.10,.23,INK)
    b.light(g,1.5,9.18,5.85,8.6,.11,16)

    pair=b.group('fabrication_workshop_and_conveyor');w,g=pair
    # Low rear production shed, naturally tucked beneath the process hall.
    w.box(4.0,.42,-6.8,18.8,7.1,5.6,FRAME)
    for x in [-3,2.2,7.4,12.6]:
        f.window(pair,x,4.8,-3.95,4.4,1.8,4 if x in [-3,7.4] else 19)
        w.box(x,.6,-3.9,4.75,3.7,.10,BLUE)
        for y in [1.0+i*.35 for i in range(10)]:w.box(x,y,-3.83,4.7,.035,.045,EDGE)
    # A visible belt projects through the east loading side.
    for x in [10,12,14,16,18]:
        w.box(x,.42,-.4,.16,1.68,2.2,FRAME)
        for z in [-1.5,.7]:w.box(x,.42,z,.35,.20,.38,EDGE)
    w.box(14,2.08,-.4,10.2,.18,2.1,INK)
    for x in [9.1+i*.39 for i in range(26)]:w.beam((x,2.20,-1.4),(x,2.20,.6),.10,EDGE,8)
    for z in [-1.56,.76]:w.box(14,2.1,z,10.7,.28,.16,BRASS)
    for x in [11.2,14.4,17.4]:
        w.chamfer(x,2.30,-.4,1.9,1.2,1.5,.12,'#8e9d8e')
        w.box(x,3.51,-.4,.10,.035,1.5,BRASS)
    # Loading canopy cantilevers out from the structural frame.
    w.box(16.9,7.8,-1,5.4,.23,6.6,BLUE)
    for zz in [-3.5,1.5]:w.beam((14.4,5.8,zz),(19.5,7.75,zz),.10,FRAME,4)
    for x in [16.9,19.5]:b.light(g,x,7.65,2.38,1.7,.10,16)

    pair=b.group('rooftop_plant_and_pipe_racks');w,g=pair
    # Human-sized maintenance decks with overhead pipe supports.
    for z in [-8.4,3.8]:f.rail(w,(-5.4,26.77,z),(14.2,26.77,z),1.08)
    for x in [-5.4,14.2]:f.rail(w,(x,26.77,-8.4),(x,26.77,3.8),1.08)
    for x in [-3.5,2.0,7.5,13.0]:
        for z in [-7.6,1.5]:
            w.beam((x,26.8,z),(x,30.15,z),.12,FRAME,4)
        girder(w,(x-.1,30.1,-7.6),(x+.1,30.1,-7.6),.25,.40)
        w.beam((x,30.1,-7.6),(x,30.1,1.5),.16,FRAME,4)
        w.beam((x,27.2,-7.6),(x,30.1,1.5),.075,EDGE,4)
    for j,z in enumerate([-5.9,-4.1,-2.3]):
        path=[(-6.9,17.2,z),(-6.9,29.0,z),(13.0,29.0,z),(13.0,27.0,z)]
        h.tube(w,h.curve(path,.85),.31 if j!=1 else .42,[EDGE,BRASS,BLUE][j],12)
        for x in [-3.5,2,7.5]:h.collar(w,(x,29.0,z),(1,0,0),.31 if j!=1 else .42,FRAME)
    for x in [-1.5,7.3]:
        w.chamfer(x,26.77,1.4,4.6,1.35,3.4,.15,FRAME)
        for j in range(8):w.box(x,27.0+j*.12,3.13,4.1,.05,.12,EDGE)
        for xx in [x-1.2,x+1.2]:
            w.beam((xx,28.12,1.3),(xx,28.4,1.3),.79,INK,20)
            f.ring(w,xx,28.43,1.3,.79,.045,24,EDGE)
            for k in range(6):
                a=k*math.tau/6;w.beam((xx,28.44,1.3),(xx+.69*math.cos(a),28.44,1.3+.69*math.sin(a)),.055,EDGE,4)
    # Side downpipe with regular brackets and authored warm accent fittings.
    for z in [-7.5,1.0]:
        h.tube(w,h.curve([(15.2,27,z),(15.2,25,z),(16.7,25,z),(16.7,1.4,z),(18.7,1.4,z)],.80),.22,EDGE,10)
        for y in [4,10,16,22]:w.box(15.7,y,z,1.85,.12,.16,FRAME)

    w,g=b.group('yard_details')
    # Electrical cabinets, pallet stacks and work lights finish the street view.
    for x in [-8.7,-6.9]:
        w.chamfer(x,.42,11.4,1.4,2.4,.75,.08,DARKBLUE)
        w.box(x,2.05,11.81,.50,.22,.035,INK);b.light(g,x,2.14,11.86,.25,.05,17)
        for j in range(5):w.box(x,.75+j*.15,11.81,1.05,.035,.04,EDGE)
    for x,z in [(11,11.0),(15.5,10.9)]:
        for y in [.42,.72,1.02]:
            for j in range(5):w.box(x-.85+j*.43,y,z,.32,.10,2.0,'#9c896b')
            for zz in [z-.75,z+.75]:w.box(x,y+.10,zz,2.15,.12,.18,'#7c6a52')
    for x in [-19.3,19.3]:
        w.beam((x,.42,9.5),(x,8.5,9.5),.09,FRAME,8)
        w.beam((x,8.5,9.5),(x-1.0,8.5,9.5),.065,FRAME,8)
        w.box(x-1,8.42,9.5,.85,.12,.40,INK)
        b.light(g,x-1,8.45,9.72,.72,.08,16)
    # Corner bollards keep foreground legible rather than a full perimeter fence.
    for x in [-17.7,-10.2,17.8]:
        w.beam((x,.42,5.3),(x,1.75,5.3),.12,BRASS,8)
        w.beam((x,1.15,5.3),(x,1.43,5.3),.125,INK,8)

def main():
    build();atlas=b.draw_atlas(Path('C:/Windows/Fonts/msjh.ttc'))
    # Subtle shared hand-coded paint texture, no third-party image pixels.
    rng=random.Random(271027);im=Image.new('RGB',(512,512),(227,227,227));d=ImageDraw.Draw(im)
    for j in range(4000):
        x,y=rng.randrange(512),rng.randrange(512);v=rng.randrange(204,241);d.point((x,y),fill=(v,v,v))
    for j in range(110):
        x,y=rng.randrange(512),rng.randrange(512);v=rng.randrange(167,205)
        d.line((x,y,x+rng.randrange(2,7),y+rng.randrange(3,20)),fill=(v,v,v),width=1)
    out=io.BytesIO();im.save(out,format='PNG',optimize=True);atlas[2]=out.getvalue()
    raw,report=b.encode(atlas);length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);data=raw[28+length:]
    doc['asset'].update(generator='Tool Room fabrication plant / original procedural geometry and texture pixels',copyright='Original code-authored architecture for YI-CHI KUO.')
    doc['asset']['extras']={'sourceScript':'tools/build-gear-factory.py','aiTexture':False,'gameAssets':False,'referenceUsage':'Architectural cues only: elevated plant, steel bracing, walkways, pale cladding and blue bands.'}
    doc['scenes'][0]['name']='gear_factory';doc['nodes'][-1].update(name='gear_factory',extras={'pivot':'bottom-centre','units':'island-scene-units','originalHeroRootScale':1.22,'previewOnly':True})
    doc['materials'][0]['pbrMetallicRoughness'].update(metallicFactor=.24,roughnessFactor=.82)
    for meta in GEARS:
        next(n for n in doc['nodes'] if n['name']==meta['name'])['extras']={'rotationPivot':meta['pivot'],'rotationAxis':'z','radiansPerSecond':meta['speed'],'teeth':meta['teeth'],'pitchRadius':meta['pitchRadius'],'phase':meta['phase']}
    encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();encoded+=b' '*(-len(encoded)%4)
    raw=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(data))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(data),0x004e4942)+data
    report.update(glbBytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),notes='Independent elevated fabrication plant with visible steel structure, walkways and a paired mechanical drive. Tank study preserved; no island changes.',scaleGuide={'units':'island-scene-units','originalHeroRootScale':1.22,'originalHeroHeight':2.7151781028557695,'doorOpeningHeight':3.4,'entrancePersonPosition':[-14,.42,5.45]},led={'screenDimensions':[2.724,18.752]},gears=GEARS,originalLayoutChanged=False,variant='elevated-gear-factory-v1')
    OUT.mkdir(parents=True,exist_ok=True);(OUT/'gear-factory-original.glb').write_bytes(raw)
    (OUT/'gear-factory-original.report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (OUT/'ATTRIBUTION.txt').write_text('Tool Room Gear Factory — original architecture study, 2026-10-27\nAll geometry and all texture pixels created by original Python code.\nBuild: tools/build-gear-factory.py (Python 3 + Pillow), with the existing original geometry helpers.\nReferences influence structural layout and colour only. No game models, game textures, sampled image pixels, logos, Meshy model or AI bitmap textures.\nThe Windows system font is used to rasterize the Tool Room LED; the font file is not distributed.\nIndependent building preview only. The five islands, central lighthouse and previous tank building remain unchanged.\n',encoding='utf8')
    print(json.dumps({'bytes':len(raw),'triangles':report['triangles'],'dimensions':report['dimensions'],'sha256':report['sha256']}))

if __name__=='__main__':main()

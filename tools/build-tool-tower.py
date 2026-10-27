#!/usr/bin/env python3
"""Tool Room Tower 01: original authored geometry, Pillow-drawn atlas, glTF 2.

The approved concept is a visual design reference only, never sampled as a
texture. No Meshy, game assets, external meshes, baked AI images or normal maps.
Run with Python 3 + Pillow. Font defaults to Windows Microsoft JhengHei.
"""
from pathlib import Path
from collections import defaultdict
import argparse, hashlib, io, json, math, random, struct
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RNG = random.Random(271027)
HUMAN_SCALE = False
Y_SCALE = 1.0
SLATE = '#414c59'
EDGE = '#65707b'
DARK = '#19222c'
TRIM = '#2d3541'
PLUM = '#453748'
STEEL = '#6e7b83'
BEIGE = '#8c8b83'

def linear(c):
    return [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in [int(c[i:i+2],16)/255 for i in (1,3,5)]]

class Geometry:
    def __init__(self): self.p=[];self.n=[];self.uv=[];self.c=[];self.i=[]
    def face(self, pts, color=SLATE, uv=None):
        a,b,c=pts[:3];u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
        n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
        norm=math.sqrt(sum(x*x for x in n));assert norm>1e-9
        n=[x/norm for x in n];start=len(self.p)//3
        for j,p in enumerate(pts):
            axis=max(range(3),key=lambda k:abs(n[k]));axes=[k for k in range(3) if k!=axis]
            planar=(p[axes[0]]*.23,p[axes[1]]*.23)
            self.p.extend(p);self.n.extend(n);self.uv.extend(uv[j] if uv else planar);self.c.extend(linear(color))
        # Ear clipping preserves the cut-outs of angled facade frames.
        axis=max(range(3),key=lambda k:abs(n[k]));axes=[k for k in range(3) if k!=axis]
        poly=[(p[axes[0]],p[axes[1]]) for p in pts]
        area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]));sign=1 if area>0 else -1
        cross=lambda a,b,c:(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        remaining=list(range(len(pts)));triangles=[]
        while len(remaining)>3:
            for j,b in enumerate(remaining):
                a=remaining[j-1];c=remaining[(j+1)%len(remaining)]
                if cross(poly[a],poly[b],poly[c])*sign<=1e-10:continue
                if any(all(cross(poly[p],poly[q],poly[k])*sign>=-1e-10 for p,q in [(a,b),(b,c),(c,a)]) for k in remaining if k not in [a,b,c]):continue
                triangles.append((a,b,c));remaining.pop(j);break
            else:raise ValueError('Non-simple polygon: '+str(pts))
        triangles.append(tuple(remaining))
        for tri in triangles:self.i.extend(start+j for j in tri)
    def box(self,x,y,z,w,h,d,color=SLATE):
        a,b=x-w/2,x+w/2;c,e=y,y+h;f,g=z-d/2,z+d/2
        for p in [((a,c,g),(b,c,g),(b,e,g),(a,e,g)),((b,c,f),(a,c,f),(a,e,f),(b,e,f)),((b,c,g),(b,c,f),(b,e,f),(b,e,g)),((a,c,f),(a,c,g),(a,e,g),(a,e,f)),((a,e,g),(b,e,g),(b,e,f),(a,e,f)),((a,c,f),(b,c,f),(b,c,g),(a,c,g))]:self.face(p,color)
    def extrude(self,outline,z,d,color=SLATE,bevel=EDGE):
        # Outline is counterclockwise in X,Y. Front is +Z.
        self.face([(x,y,z+d/2) for x,y in outline],color)
        self.face([(x,y,z-d/2) for x,y in reversed(outline)],color)
        for a,b in zip(outline,outline[1:]+outline[:1]):
            self.face([(a[0],a[1],z-d/2),(b[0],b[1],z-d/2),(b[0],b[1],z+d/2),(a[0],a[1],z+d/2)],bevel)
    def chamfer(self,x,y,z,w,h,d,cut=.15,color=SLATE):
        a,b=w/2,d/2;r=[(-a+cut,-b),(a-cut,-b),(a,-b+cut),(a,b-cut),(a-cut,b),(-a+cut,b),(-a,b-cut),(-a,-b+cut)]
        for j,(p,q) in enumerate(zip(r,r[1:]+r[:1])):
            self.face([(x+q[0],y,z+q[1]),(x+p[0],y,z+p[1]),(x+p[0],y+h,z+p[1]),(x+q[0],y+h,z+q[1])],color if j%2==0 else EDGE)
        self.face([(x+a,y,z+b) for a,b in r],color);self.face([(x+a,y+h,z+b) for a,b in reversed(r)],color)
    def beam(self,a,b,r,color=STEEL,sides=6):
        v=[b[i]-a[i] for i in range(3)];l=math.sqrt(sum(x*x for x in v));v=[x/l for x in v]
        ref=[0,1,0] if abs(v[1])<.9 else [1,0,0]
        u=[v[1]*ref[2]-v[2]*ref[1],v[2]*ref[0]-v[0]*ref[2],v[0]*ref[1]-v[1]*ref[0]];q=math.sqrt(sum(x*x for x in u));u=[x/q for x in u]
        t=[v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0]]
        rings=[[[p[k]+r*(u[k]*math.cos(j*math.tau/sides)+t[k]*math.sin(j*math.tau/sides)) for k in range(3)] for j in range(sides)] for p in [a,b]]
        for j in range(sides):self.face([rings[0][j],rings[0][(j+1)%sides],rings[1][(j+1)%sides],rings[1][j]],color)
        self.face(list(reversed(rings[0])),color);self.face(rings[1],color)

groups={}
def group(name):
    groups[name]=[Geometry(),Geometry()];return groups[name]

def uv_tile(tile):
    x=(tile%6)*64;y=(tile//6)*64
    return [((x+2)/512,(y+62)/512),((x+62)/512,(y+62)/512),((x+62)/512,(y+2)/512),((x+2)/512,(y+2)/512)]

def pane(g,x,y,z,w,h,tile):
    g.face([(x-w/2,y,z),(x+w/2,y,z),(x+w/2,y+h,z),(x-w/2,y+h,z)],'#ffffff',uv_tile(tile))

def light(g,x,y,z,w,h,tile=16):
    # A constant tile-centre UV avoids atlas bleed on extremely long thin lamps.
    uv=((tile%6*64+32)/512,(tile//6*64+32)/512)
    g.face([(x-w/2,y,z),(x+w/2,y,z),(x+w/2,y+h,z),(x-w/2,y+h,z)],'#ffffff',[uv]*4)

def window(wall,glass,x,y,z,w=.95,h=.72,tile=4):
    # Opaque glass is recessed 0.09 behind its framing, 0.035 ahead of core wall.
    wall.box(x,y-.05,z-.045,w+.17,h+.11,.07,DARK)
    pane(glass,x,y,z,w,h,tile)
    wall.box(x,y-.045,z+.07,w+.17,.065,.18,EDGE)
    wall.box(x,y+h-.015,z+.045,w+.17,.045,.13,TRIM)
    for dx in [-w/2-.038,w/2+.038]:wall.box(x+dx,y,z+.05,.055,h,.14,EDGE)
    wall.box(x,y,z+.055,.028,h,.12,DARK)

def railing(g,x,y,z,w,d=0):
    g.beam((x-w/2,y+.38,z),(x+w/2,y+.38,z),.025)
    g.beam((x-w/2,y+.18,z),(x+w/2,y+.18,z),.012)
    for j in range(max(2,round(w/.38))+1):
        xx=x-w/2+j*w/max(2,round(w/.38));g.beam((xx,y,z),(xx,y+.38,z),.018,TRIM)
    if d:
        for xx in [x-w/2,x+w/2]:
            g.beam((xx,y+.38,z),(xx,y+.38,z-d),.025)
            g.beam((xx,y,z-d),(xx,y+.38,z-d),.02)

def vent(g,x,y,z,w,h):
    g.box(x,y,z,w,h,.06,DARK)
    count=max(3,round(h/.10))
    for j in range(count):g.box(x,y+.035+j*(h-.07)/count,z+.065,w-.07,.025,.075,EDGE)

def equipment(g,x,y,z,w=.8,h=.65,d=.6):
    g.chamfer(x,y,z,w,h,d,.07,SLATE)
    vent(g,x,y+.10,z+d/2+.01,w*.76,h*.63)
    for dx in [-w*.30,w*.30]:g.box(x+dx,y+h,z,.055,.04,d*.86,STEEL)

def build():
    wall,gl=group('foundation_and_entry')
    wall.chamfer(0,0,0,10.8,.42,7.5,.40,TRIM)
    wall.chamfer(0,.42,0,10.45,.24,7.2,.33,SLATE)
    for j in range(10):wall.box(-4.9+j*1.08,.03,3.75,.015,.37,.012,DARK)
    wall.chamfer(.35,.66,-.35,8.6,2.6,5.65,.20,SLATE)
    # Three entrance steps, inset double doors and beveled canopy.
    for j in range(3):wall.box(.7,.07+j*.15,3.28-j*.18,3.05,.15,.86,BEIGE)
    for j in [-1,1]:window(wall,gl,.7+j*.45,.66,2.82,.83,1.95,19)
    for x in [.60,.80]:wall.box(x,1.22,2.94,.025,.63,.04,STEEL)
    wall.extrude([(-1.02,.64),(-.64,.64),(-.64,2.94),(-1.16,3.40),(-1.42,3.40),(-1.02,2.80)],2.7,.52,EDGE)
    wall.extrude([(2.04,.64),(2.40,.64),(2.40,2.80),(2.02,3.40),(1.75,3.40),(2.04,2.94)],2.7,.52,EDGE)
    wall.extrude([(-1.16,2.87),(2.42,2.87),(2.02,3.43),(-1.48,3.43)],2.88,.82,SLATE)
    light(gl,.50,3.12,3.304,2.84,.045,16)
    light(gl,.70,2.57,2.98,1.79,.04,16)
    for x in [-1.05,2.45]:light(gl,x,.75,2.99,.045,1.70,16)
    for x in [-3.8,3.6]:
        wall.box(x,.66,2.72,1.52,1.88,.75,SLATE);vent(wall,x,.85,3.115,.72,1.38)
        light(gl,x-.58,.90,3.17,.035,1.36,16)
        wall.box(x,.63,3.29,1.30,.44,.64,TRIM)
        wall.box(x,1.07,3.29,1.36,.08,.70,EDGE)
        for k in range(6):wall.chamfer(x-.48+k*.19,1.15,3.29,.14,RNG.uniform(.08,.21),.26,.03,'#4e5946')
    for x in [-4.8,4.8]:light(gl,x,.20,3.70,.48,.04,16)

    wall,gl=group('main_tower')
    # Main tower set behind a deeply articulated forward facade.
    wall.chamfer(-1.25,3.02,-.26,5.40,20.62,4.30,.28,SLATE)
    wall.chamfer(-1.25,23.64,-.30,5.58,.32,4.52,.30,EDGE)
    wall.chamfer(-1.37,23.96,-.40,4.92,1.23,3.80,.24,TRIM)
    wall.chamfer(-1.64,25.19,-.75,3.75,1.22,3.03,.18,SLATE)
    wall.extrude([(-3.25,26.20),(-.07,26.20),(-.07,27.55),(-.72,28.02),(-2.98,28.02),(-3.25,27.64)],-.92,2.12,SLATE)
    vent(wall,-1.50,26.65,.16,1.20,.93)
    for x in [-2.92,-.34]:wall.box(x,26.43,.16,.10,1.29,.16,EDGE)
    for j in range(0,16,2 if HUMAN_SCALE else 1):
        y=3.30+j*1.255
        # Front right column of inhabited rooms, same width but varied occupancy.
        t=[4,1,5,10,0,6,11,1,4,7,2,10,5,11,4,1][j]
        wh=1.60 if HUMAN_SCALE else .88
        window(wall,gl,.78,y,1.925,1.05,wh,t)
        wall.box(.78,y+wh+.06,1.97,1.32,.24,.18,SLATE if j%3 else PLUM)
        # Far left thin window strip visible past the LED and armor.
        window(wall,gl,-3.59,y,1.93,.43,wh,[4,0,1,6,11,2,5,0][j%8])
        # Cladding seams, edge beads and rear facade. Four sides stay finished.
        wall.box(-1.25,y-.10,-2.423,4.65,.022,.014,DARK)
        for k in range(4):
            x=-2.98+k*1.12
            # Back windows, winding reversed to face -Z.
            tile=(j*3+k*7)%12
            bh=1.45 if HUMAN_SCALE else .72
            z=-2.43;pts=[(x+.40,y,z),(x-.40,y,z),(x-.40,y+bh,z),(x+.40,y+bh,z)]
            gl.face(pts,'#ffffff',uv_tile(tile));wall.box(x,y-.04,z-.055,.92,.05,.14,EDGE)
        # Left side (X negative), independent real pane and mullion depth.
        for k in range(3):
            z=-1.57+k*1.12;xx=-3.965
            sh=1.50 if HUMAN_SCALE else .75
            gl.face([(xx,y,z-.4),(xx,y,z+.4),(xx,y+sh,z+.4),(xx,y+sh,z-.4)],'#ffffff',uv_tile((j*5+k*3)%12))
            wall.box(xx-.045,y-.04,z,.15,.06,.94,EDGE)
            wall.box(xx-.04,y,z,.11,sh,.028,DARK)
    # Structural vertical frame: angled shoulder and segmented cladding.
    wall.extrude([(-.04,3.05),(.28,3.05),(.28,22.92),(-.34,23.62),(-.70,23.62),(-.04,22.82)],2.02,.40,EDGE)
    light(gl,.094,3.72,2.224,.065,18.67,16)
    wall.box(-3.92,3.08,1.73,.16,20.42,.38,PLUM)
    wall.box(-.30,3.08,1.86,.08,20.20,.16,DARK)
    for j in range(13):
        y=3.5+j*1.52
        wall.box(-.02,y,2.24,.33,.014,.012,DARK)
        wall.box(-3.92,y,1.94,.17,.016,.012,DARK)
    # Sign-bearing front wall has a broad angular crown and lower plate.
    wall.extrude([(-3.42,21.8),(-2.94,21.8),(-2.94,23.12),(-.58,22.45),(-.58,22.82),(-3.42,23.66)],2.01,.37,SLATE)
    wall.extrude([(-3.42,3.1),(-.53,3.1),(-.53,8.72),(-2.95,10.22),(-3.42,9.83)],2.03,.36,PLUM)
    for j in range(5):wall.box(-2.01,3.3+j*1.36,2.215,2.27,.018,.014,DARK)

    wall,gl=group('vertical_led')
    # An inset, clipped vertical LED slab; no floating billboard or roof placard.
    outline=[(-3.28,10.16),(-2.75,9.75),(-.66,9.75),(-.66,22.13),(-3.28,22.64)]
    wall.extrude(outline,2.21,.22,EDGE)
    inner=[(-3.14,10.24),(-2.71,9.90),(-.79,9.90),(-.79,21.99),(-3.14,22.44)]
    wall.extrude(inner,2.345,.075,DARK)
    # LED image is hand-drawn text and lines, not a crop of concept artwork.
    gl.face([(-3.10,10.20,2.395),(-.83,10.20,2.395),(-.83,21.92,2.395),(-3.10,21.92,2.395)],'#ffffff',[(385/512,510/512),(510/512,510/512),(510/512,2/512),(385/512,2/512)])
    light(gl,-3.12,10.29,2.414,.065,11.80,17)
    light(gl,-.81,10.20,2.414,.065,11.73,17)
    light(gl,-1.96,10.19,2.414,2.31,.06,17)
    light(gl,-1.96,21.92,2.414,2.31,.06,17)

    wall,gl=group('service_spine_and_courtyard')
    # Narrow, taller service tower, a real vertical recess and attached walkway.
    wall.chamfer(3.32,3.02,-.48,1.56,22.25,3.84,.16,TRIM)
    wall.chamfer(3.32,25.27,-.48,1.70,.28,3.96,.16,EDGE)
    wall.chamfer(3.23,25.55,-.64,1.36,.56,2.93,.12,SLATE)
    wall.chamfer(1.95,3.02,-1.28,1.42,19.70,2.28,.10,SLATE)
    wall.chamfer(2.11,22.72,-1.38,1.36,.38,2.22,.10,EDGE)
    for j in range(0,15,2 if HUMAN_SCALE else 1):
        y=3.35+j*1.28
        window(wall,gl,1.91,y,-.105,1.05,1.42 if HUMAN_SCALE else .89,[4,11,5,0,1,6,2,0,4,5,1,10,4,6,0][j])
    for level in [8.50,16.30,22.25]:
        wall.box(1.99,level,.56,1.53,.26,1.68,EDGE)
        wall.box(1.99,level-.21,1.21,1.57,.20,.18,DARK)
        for k in range(3):
            xa=1.31+k*.43
            wall.beam((xa,level-.21,1.32),(xa+.40,level+.01,1.32),.025,STEEL)
        railing(wall,1.98,level+.26,1.37,1.50,1.23)
        light(gl,1.98,level+.10,1.413,1.32,.035,16)
    for j in range(12):
        y=3.17+j*1.82
        wall.box(3.32,y,1.473,1.46,1.79,.09,SLATE if j%3 else PLUM)
        wall.box(3.32,y,1.53,1.38,.018,.014,DARK)
        # Side panels with nested inset, cut seam and fasteners.
        wall.box(4.111,y,-.22,.045,1.76,2.76,SLATE if j%2 else TRIM)
        for z in [-1.28,.83]:wall.box(4.145,y+.16,z,.016,.025,.055,STEEL)
        # The side is finished with thin raised armor seams, not an empty box.
        wall.box(4.15,y+.03,-.15,.07,1.68,.045,EDGE)
        wall.box(4.151,y+1.66,-.75,.065,.035,1.10,EDGE)
        if j%3==1:
            wall.box(4.16,y+.28,-.73,.07,.72,.74,DARK)
            for k in range(6):wall.box(4.21,y+.30+k*.12,-.73,.07,.025,.64,STEEL)
    wall.box(2.61,3.20,1.52,.15,22.08,.18,EDGE)
    light(gl,2.635,3.49,1.619,.065,21.27,16)
    # Exposed industrial ducts, thick couplers and offset feed lines.
    for x,z,r,top in [(3.53,1.84,.17,23.55),(3.94,1.76,.095,19.98)]:
        wall.beam((x,3.25,z),(x,top,z),r,STEEL,10)
        for y in [4.10,6.5,9.10,12.2,15.7,19.0,22.4]:
            if y<top:wall.beam((x,y,z),(x,y+.10,z),r+.042,TRIM,10)
        wall.beam((x,top,z),(x-.26,top+.28,z-.03),r,STEEL,10)
        wall.beam((x-.26,top+.28,z-.03),(x-.26,top+.48,z-.32),r,STEEL,10)
    wall.beam((3.63,23.84,.40),(3.63,27.07,.40),.34,STEEL,12)
    for y in [24,24.12,26.60,26.86,27.03]:wall.beam((3.63,y,.40),(3.63,y+.06,.40),.38,TRIM,12)
    vent(wall,3.06,23.55,1.56,.55,1.03)
    wall.beam((2.78,26.09,-.58),(2.78,29.13,-.58),.035,STEEL,8)
    wall.beam((2.79,26.18,-.68),(2.79,28.22,-.68),.08,TRIM,6)
    for y in [26.60,27.22,27.84]:wall.beam((2.64,y,-.63),(2.92,y,-.63),.028,EDGE)
    light(gl,2.78,29.10,-.54,.055,.065,18)
    # Rear spine vents; camera may orbit the entire model.
    for y in [5,11,17,23]:
        wall.box(3.32,y,-2.415,1.10,.80,.065,DARK)
        for k in range(7):wall.box(3.32,y+k*.11,-2.46,1.04,.025,.065,EDGE)

    wall,gl=group('annex_and_roof_equipment')
    wall.chamfer(-4.18,.66,-.15,1.76,6.89,5.40,.18,SLATE)
    wall.extrude([(-5.10,7.28),(-3.25,7.28),(-3.25,8.73),(-3.77,9.32),(-5.10,9.32)],-.22,4.72,SLATE)
    for j in range(0,6,2 if HUMAN_SCALE else 1):
        y=.90+j*1.12
        window(wall,gl,-4.23,y,2.57,.72,1.5 if HUMAN_SCALE else .83,[6,4,0,5,1,6][j])
        wall.box(-4.89,y,2.32,.20,2.18 if HUMAN_SCALE else 1.09,.42,PLUM)
    wall.extrude([(-3.83,.70),(-3.54,.70),(-3.54,7.84),(-4.10,9.26),(-4.38,9.26),(-3.83,7.70)],2.34,.36,EDGE)
    light(gl,-4.94,1.12,2.56,.032,7.44,16)
    railing(wall,-4.21,9.32,2.10,1.60,3.94)
    equipment(wall,-4.20,9.32,-.28,1.11,.85,1.15)
    wall.beam((-4.16,9.40,.43),(-4.16,10.12,.43),.13,STEEL,8)
    wall.beam((-4.16,10.12,.43),(-3.78,10.12,.43),.13,STEEL,8)
    # Upper terrace rails and layered rooftop machines.
    railing(wall,-1.32,23.96,1.76,5.05,3.97)
    for x in [-2.70,-1.45,-.20]:equipment(wall,x,25.19,.50,1.00,.60,.84)
    for x in [-2.60,-.70]:
        wall.beam((x,25.15,.53),(x,25.84,.53),.27,TRIM,12)
        wall.beam((x,25.82,.53),(x,25.88,.53),.30,STEEL,12)
    for x in [-2.93,-2.66]:wall.beam((x,28.02,-1.22),(x,28.67+(x+2.93)*.4,-1.22),.025,STEEL,6)
    light(gl,-2.93,28.64,-1.18,.045,.06,16)
    light(gl,-1.50,26.46,.17,2.12,.034,16)
    # Visible grilles and ribbed shoulders at the top of the main LED.
    vent(wall,-1.91,24.21,1.53,2.47,.49)
    for x in [-3.20,-.15]:wall.box(x,24.08,1.61,.16,.82,.22,EDGE)
    light(gl,-1.22,25.05,1.52,1.50,.035,16)

def draw_atlas(font_path):
    base=Image.new('RGB',(512,512),(12,21,29));emit=Image.new('RGB',(512,512),(0,0,0))
    db=ImageDraw.Draw(base);de=ImageDraw.Draw(emit)
    colors=['#23323e','#273744','#29323d','#2a3741','#ffd5a0','#ffbb71','#ffe0b6','#f5c487','#f4dec1','#f0c77f','#29e7ff','#ff488b']
    for t,c in enumerate(colors):
        x=t%6*64;y=t//6*64;col=tuple(int(c[i:i+2],16) for i in (1,3,5));lit=t>=4
        for yy in range(5,59):
            shade=.72+.18*yy/64
            db.line((x+4,y+yy,x+59,y+yy),fill=tuple(int(v*(.40 if lit else 1)*shade) for v in col))
            if lit:de.line((x+4,y+yy,x+59,y+yy),fill=tuple(int(v*shade) for v in col))
        # Architectural interior details: ceiling, distant table, blinds, shelves.
        for drawer in [db,de]:
            drawer.rectangle((x+4,y+4,x+59,y+9),fill=(8,14,20))
            drawer.rectangle((x+4,y+52,x+59,y+59),fill=(5,10,14))
            drawer.rectangle((x+5,y+35,x+25,y+37),fill=(13,17,20))
            drawer.rectangle((x+8,y+37,x+10,y+53),fill=(10,15,18))
            drawer.rectangle((x+24,y+31,x+33,y+52),fill=(15,20,24))
            drawer.rectangle((x+40,y+16,x+43,y+53),fill=(12,18,23))
            for yy in [24,33,43]:drawer.rectangle((x+43,y+yy,x+58,y+yy+2),fill=(15,21,24))
            if t%3==1:
                for yy in range(10,30,4):drawer.line((x+4,y+yy,x+59,y+yy),fill=(25,28,29),width=1)
        db.rectangle((x+31,y+5,x+32,y+58),fill=(9,14,20));de.rectangle((x+31,y+5,x+32,y+58),fill=(0,0,0))
    for t,c in [(16,(255,201,132)),(17,(41,231,255)),(18,(255,72,139)),(19,(38,49,57))]:
        x=t%6*64;y=t//6*64
        db.rectangle((x,y,x+63,y+63),fill=tuple(int(v*.48) for v in c))
        de.rectangle((x,y,x+63,y+63),fill=c if t!=19 else (0,0,0))
    # Procedurally typeset LED; font file itself is not embedded/distributed.
    db.rectangle((384,0,511,511),fill=(10,20,29));de.rectangle((384,0,511,511),fill=(0,0,0))
    for xx in range(390,508,8):db.line((xx,2,xx,509),fill=(13,25,34))
    font=ImageFont.truetype(str(font_path),88)
    for j,ch in enumerate('工具房'):
        if not HUMAN_SCALE:
            for drawer,color in [(db,(212,196,165)),(de,(255,225,178))]:drawer.text((448,146+j*112),ch,font=font,anchor='mm',fill=color,stroke_width=0)
        else:
            # Keep glyph proportions after the taller building's geometry change.
            mask=Image.new('L',(128,112));ImageDraw.Draw(mask).text((64,56),ch,font=font,anchor='mm',fill=255)
            mask=mask.resize((128,round(112/Y_SCALE)),Image.Resampling.LANCZOS)
            for im,color in [(base,(212,196,165)),(emit,(255,225,178))]:im.paste(color,(384,146+j*112-mask.height//2,512,146+j*112-mask.height//2+mask.height),mask)
    # Original fine-scale alloy variation. This is code-drawn, not an image
    # generator output, and contains no normal/bump map or third-party pixels.
    noise=random.Random(8844)
    alloy=Image.new('RGB',(512,512));alloy.putdata([(v,v,v) for v in [noise.choice([202,210,218,226,234]) for _ in range(512*512)]])
    da=ImageDraw.Draw(alloy)
    for _ in range(200):
        x=noise.randrange(512);y=noise.randrange(512);v=noise.choice([196,210,240]);da.line((x,y,x+noise.randrange(2,14),y),fill=(v,v,v),width=1)
    rough=Image.new('RGB',(128,128));rough.putdata([(128,v,255) for v in [noise.choice([160,176,192,208]) for _ in range(128*128)]])
    out=[]
    for im in [base,emit,alloy,rough]:
        b=io.BytesIO();im.save(b,format='PNG',optimize=True);out.append(b.getvalue())
    return out

def encode(atlas):
    data=bytearray();views=[];accessors=[];meshes=[];nodes=[];report=[]
    def buf(raw,target=None):
        data.extend(b'\0'*(-len(data)%4));v={'buffer':0,'byteOffset':len(data),'byteLength':len(raw)}
        if target:v['target']=target
        views.append(v);data.extend(raw);return len(views)-1
    def acc(vals,n,kind='f',bounds=False):
        a={'bufferView':buf(struct.pack('<'+kind*len(vals),*vals),34963 if kind in ['H','I'] else 34962),'componentType':{'f':5126,'H':5123,'I':5125,'B':5121}[kind],'count':len(vals)//n,'type':{1:'SCALAR',2:'VEC2',3:'VEC3'}[n]}
        if kind=='B':a['normalized']=True
        if bounds:a.update(min=[min(vals[k::n]) for k in range(n)],max=[max(vals[k::n]) for k in range(n)])
        accessors.append(a);return len(accessors)-1
    for name,geometries in groups.items():
        primitives=[]
        for material,g in enumerate(geometries):
            if not g.i:continue
            at={'POSITION':acc(g.p,3,bounds=True),'NORMAL':acc(g.n,3)}
            at['TEXCOORD_0']=acc(g.uv,2)
            if not material:at['COLOR_0']=acc([round(v*255) for v in g.c],3,'B')
            primitives.append({'attributes':at,'indices':acc(g.i,1,'I' if max(g.i)>65535 else 'H'),'material':material})
        nodes.append({'name':name,'mesh':len(meshes)});meshes.append({'name':name,'primitives':primitives})
        report.append({'name':name,'triangles':sum(len(g.i)//3 for g in geometries)})
    images=[{'name':name,'mimeType':'image/png','bufferView':buf(raw)} for name,raw in zip(['procedural-window-and-led-colour','procedural-window-and-led-emission','procedural-alloy-grain','procedural-alloy-roughness'],atlas)]
    mats=[{'name':'Architectural alloy / original vertex colours','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'baseColorTexture':{'index':2},'metallicRoughnessTexture':{'index':3},'metallicFactor':.40,'roughnessFactor':.78},'alphaMode':'OPAQUE'}, {'name':'Windows and LED / original drawn atlas','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.20,'roughnessFactor':.48},'emissiveTexture':{'index':1},'emissiveFactor':[1,1,1],'alphaMode':'OPAQUE'}]
    doc={'asset':{'version':'2.0','generator':'Tool Room Tower 01 / authored Python geometry','copyright':'Original procedural geometry and drawn textures for YI-CHI KUO. Concept image used only as visual reference.','extras':{'sourceScript':'tools/build-tool-tower.py','aiTexture':False,'gameAssets':False}},'scene':0,'scenes':[{'name':'Tool Room Tower 01','nodes':[len(nodes)]}],'nodes':nodes+[{'name':'tool_room_tower','children':list(range(len(nodes))),'extras':{'pivot':'bottom-centre','units':'metres','conceptVersion':'approved-20261027'}}],'meshes':meshes,'materials':mats,'images':images,'textures':[{'sampler':0 if i<2 else 1,'source':i} for i in range(4)],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071},{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'bufferViews':views,'accessors':accessors,'buffers':[{'byteLength':len(data)}]}
    if HUMAN_SCALE:doc['nodes'][-1]['extras']['units']='island-scene-units'
    raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*(-len(raw)%4);data+=b'\0'*(-len(data)%4)
    result=struct.pack('<III',0x46546c67,2,28+len(raw)+len(data))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(data),0x004e4942)+data
    coords=[v for gs in groups.values() for g in gs for v in g.p]
    lo=[min(coords[k::3]) for k in range(3)];hi=[max(coords[k::3]) for k in range(3)]
    meta={'glbBytes':len(result),'sha256':hashlib.sha256(result).hexdigest(),'triangles':sum(r['triangles'] for r in report),'bounds':{'min':lo,'max':hi},'dimensions':[hi[i]-lo[i] for i in range(3)],'materials':2,'textures':[[512,512],[512,512],[512,512],[128,128]],'parts':report,'notes':'Single bespoke concept tower, not the prior 600-triangle-per-floor modular kit. No Meshy or AI bitmap textures.'}
    if HUMAN_SCALE:
        meta['scaleGuide']={'units':'island-scene-units','originalHeroRootScale':1.22,'doorOpeningHeight':1.95*Y_SCALE,'typicalFloorPitch':2*1.255*Y_SCALE,'mainWindowRows':8,'footprintUnchanged':True,'importRule':'Keep uniform world scale 1; do not normalize into the old 5-unit width slot.'}
    return result,meta

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--output',type=Path);ap.add_argument('--variant',choices=['v1','human'],default='human');ap.add_argument('--font',type=Path,default=Path('C:/Windows/Fonts/msjh.ttc'));args=ap.parse_args()
    HUMAN_SCALE=args.variant=='human';Y_SCALE=1.60 if HUMAN_SCALE else 1.0
    if args.output is None:args.output=ROOT/'assets/island-city'/('tool-room-tower-v2.glb' if HUMAN_SCALE else 'tool-room-tower-v1.glb')
    build()
    # The design study needs a broader podium and machinery volume than the
    # old modular kit. Bake this proportion change into vertices, not a node.
    for geometries in groups.values():
        for g in geometries:
            for i in range(0,len(g.p),3):g.p[i]*=1.20;g.p[i+1]*=Y_SCALE;g.p[i+2]*=1.20
            for i in range(0,len(g.n),3):
                n=[g.n[i]/1.20,g.n[i+1]/Y_SCALE,g.n[i+2]/1.20];l=math.sqrt(sum(v*v for v in n));g.n[i:i+3]=[v/l for v in n]
    zs=[v for gs in groups.values() for g in gs for v in g.p[2::3]];zcenter=(min(zs)+max(zs))/2
    for gs in groups.values():
        for g in gs:
            for i in range(2,len(g.p),3):g.p[i]-=zcenter
    atlas=draw_atlas(args.font);glb,report=encode(atlas)
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_bytes(glb)
    args.output.with_suffix('.report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(report,indent=2,ensure_ascii=False))

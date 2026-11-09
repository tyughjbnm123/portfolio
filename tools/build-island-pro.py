#!/usr/bin/env python3
"""Build island-pro.html from island.html.

island-pro.html is the same island — same content, clicks, walkers, rides, driving and building/people scale —
with the PRO look (assets/island-city/pro-look.js) laid over it. It is generated, never edited by hand:
after changing island.html, run  python3 tools/build-island-pro.py  to bring the PRO page up to date.
"""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'island.html').read_text(encoding='utf-8')
VER = '20261109-3'

def patch(s, old, new, count=1):
    n = s.count(old)
    if n != count:
        sys.exit(f'build-island-pro: expected {count}× but found {n}× of:\n  {old[:120]}')
    return s.replace(old, new)

s = src
s = patch(s, '<title>YI-CHI 作品島</title>', '<title>YI-CHI 作品島 PRO</title>')
s = patch(s, "import {createArcadePark} from", f"import {{createProLook}} from './assets/island-city/pro-look.js?v={VER}';\nimport {{createArcadePark}} from")
# a slower change of light, so the sunset in between can be seen
s = patch(s, "state.nightT+= ((state.night?1:0)-state.nightT)*Math.min(1,dt*2.5);",
             "state.nightT+= ((state.night?1:0)-state.nightT)*Math.min(1,dt*.9);")
# the PRO look owns the frame: light, sea, sky, air and lens
s = patch(s, "function tick(){",
             "const PRO=createProLook({renderer,scene,camera,controls,sun,hemi,skyDome,water,lampMat,islands,state,mobile,reduced,canvas,hub,beacon,beam,softClouds});\n"
             "if(/[?&]debug\\b/.test(location.search)) window.__pro=PRO;\n"
             "function tick(){")
s = patch(s, "if(bloom && state.nightT>.015 && reader.hidden){ bloom.pass.strength=.4*state.nightT; bloom.composer.render(); } else renderer.render(scene,camera);",
             "PRO.render(!reader.hidden);")
s = patch(s, "if(state.nightT>.015){ if(!bloom) loadBloom(); }", "")
if 'function stepDownPR(){' in s:
    s = patch(s, "function stepDownPR(){ if(PR<=1.5) return; PR=1.5; renderer.setPixelRatio(PR); renderer.setSize(innerWidth,innerHeight,false);",
                 "function stepDownPR(){ if(PR<=1.5) return; PR=1.5; renderer.setPixelRatio(PR); renderer.setSize(innerWidth,innerHeight,false); PRO.resize();")
# a quiet badge so it is clear which version this is
s = patch(s, "</body>", '<a class="pro-badge" href="island.html" title="回到原本的小島">PRO 試做版 · 回原版</a>\n'
             '<style>.pro-badge{position:fixed;right:14px;bottom:14px;z-index:60;font:600 11px/1 system-ui,sans-serif;'
             'letter-spacing:.08em;color:#fff;background:rgba(20,20,30,.45);backdrop-filter:blur(6px);padding:6px 10px;border-radius:999px;text-decoration:none}'
             '@media(max-width:760px){.pro-badge{bottom:auto;top:64px;right:10px}}</style>\n</body>')
(root / 'island-pro.html').write_text(s, encoding='utf-8')
print('island-pro.html written')

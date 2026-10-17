import {DEFAULTS,LIMITS,makeDocument,validateDocument,stylePrompt,noteName} from './model.js';
import {PianoAudio,TAIL,encodeWav} from './audio.js';

const $=id=>document.getElementById(id),STORAGE='yk-melody-v1';
const codes=['KeyZ','KeyS','KeyX','KeyD','KeyC','KeyV','KeyG','KeyB','KeyH','KeyN','KeyJ','KeyM','KeyQ','Digit2','KeyW','Digit3','KeyE','KeyR','Digit5','KeyT','Digit6','KeyY','Digit7','KeyU'];
const black=new Set([1,3,6,8,10]);
let settings={...DEFAULTS},notes=[],duration=0,mode='idle',busy=false,ready=false,recordAt=0,playAt=0,operation=0,lastDraw=0,wavURL=null;
const held=new Map(),keys=new Map();
let metroTimer=null,nextBeat=0,beatNumber=0;
const audio=new PianoAudio(state=>{if(state==='suspended'||state==='interrupted'||state==='closed'){interrupt('音訊已暫停，點「啟用鋼琴」即可繼續。');ready=false;update();}});
const range=()=>Array.from({length:24},(_,i)=>(settings.octave+1)*12+i);
const elapsed=()=>Math.min(LIMITS.duration,Math.max(0,audio.now-recordAt));
const time=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;
function message(text,error=false){$('notice').textContent=text;$('notice').className='notice'+(error?' error':'');$('notice').hidden=!text;}
function save(){try{const pending=new Set([...held.values()].map(v=>v.note)),at=elapsed();const snapshot=notes.map(n=>({...n,duration:mode==='recording'&&pending.has(n)?Math.max(.001,at-n.start):n.duration}));const length=mode==='recording'?Math.max(at,...snapshot.map(n=>n.start+n.duration),0):duration;localStorage.setItem(STORAGE,JSON.stringify(makeDocument(settings,snapshot,Math.min(LIMITS.duration,length))));$('save-status').textContent='已暫存於這個瀏覽器 · 建議另存 JSON 備份';}catch{$('save-status').textContent='此瀏覽器無法暫存，請下載 JSON 備份。';}}
function restore(){try{const raw=localStorage.getItem(STORAGE);if(raw){const d=validateDocument(JSON.parse(raw));({settings,notes,duration}=d);$('save-status').textContent='已恢復上次旋律與設定';}}catch{message('上次的暫存資料無法讀取。你仍可演奏，或匯入先前下載的 JSON。',true);}}
function syncForm(){for(const k of Object.keys(DEFAULTS)){if(k==='metronome')$(k).checked=settings[k];else $(k).value=settings[k];}$('velocity-value').textContent=Math.round(settings.velocity*100)+'%';$('volume-value').textContent=Math.round(settings.volume*100)+'%';prompt();}
function prompt(){$('prompt').value=stylePrompt(settings);$('prompt-bpm').textContent=settings.bpm+' BPM';}
function buildKeys(){keys.clear();$('piano').replaceChildren();let whites=0;for(const [i,midi] of range().entries()){const b=document.createElement('button'),isBlack=black.has(midi%12);b.type='button';b.className='piano-key '+(isBlack?'black':'white');b.dataset.midi=midi;b.setAttribute('aria-label',`${noteName(midi)}，鍵盤 ${codes[i].replace(/Key|Digit/g,'')}`);b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="pitch">${noteName(midi)}</span><span class="keycap">${codes[i].replace(/Key|Digit/g,'')}</span>`;if(isBlack)b.style.left=(whites/14*100-2.15)+'%';else whites++;
 b.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();if(begin('pointer:'+e.pointerId,midi)){b.setPointerCapture(e.pointerId);}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>end('pointer:'+e.pointerId));
 b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();if(!e.repeat)begin('accessible:'+midi,midi);}});b.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();end('accessible:'+midi);}});b.addEventListener('blur',()=>end('accessible:'+midi));
 $('piano').append(b);keys.set(midi,b);}
 update();requestAnimationFrame(syncScroll);}
function update(){const recording=mode==='recording',playing=mode==='playing',has=notes.length>0;
 $('record').disabled=busy||!ready||mode!=='idle';$('stop-record').disabled=!recording;$('play').disabled=busy||!has||mode!=='idle';$('stop-play').disabled=!playing;$('clear').disabled=busy||mode!=='idle'||(!has&&!duration);$('wav').disabled=busy||!has||mode!=='idle';$('json').disabled=busy||!has||mode!=='idle';$('import').disabled=busy||mode!=='idle';$('enable').disabled=busy||mode!=='idle';$('enable').textContent=busy?'準備中…':ready?'鋼琴已啟用':'啟用鋼琴';$('octave').disabled=busy||playing;$('volume').disabled=busy;for(const k of ['bpm','metronome'])$(k).disabled=busy;
 $('state').textContent=recording?'正在錄製':playing?'正在播放':busy?'處理中':'等待演奏';$('state').className='state'+(recording?' recording':playing?' playing':'');$('piano').dataset.ready=ready;for(const b of keys.values())b.disabled=!ready||playing||busy;
 $('note-count').textContent=has?`${notes.length} 個音符 · ${duration.toFixed(1)} 秒`:'尚無音符';if(mode==='idle')$('clock').textContent=time(duration);
}
async function prepare(midis=range()){
 await audio.unlock(settings.volume);await audio.load(midis,(n,total)=>{$('audio-status').textContent=`載入鋼琴取樣 ${n} / ${total}`;});
 $('audio-status').textContent='聲音已啟用 · 可同時彈奏多個音';
}
async function enable(){if(busy||mode!=='idle')return;busy=true;update();const token=++operation;try{await prepare();if(token===operation)ready=true;message('');}catch(e){ready=false;message(e.message||'無法載入音色，請重新啟用鋼琴。',true);}finally{busy=false;update();syncMetro();}}
function paintHeld(){const active=new Set([...held.values()].map(v=>v.midi));for(const [midi,b]of keys){b.classList.toggle('active',active.has(midi));b.setAttribute('aria-pressed',String(active.has(midi)||b.classList.contains('playing')));}}
function begin(token,midi){if(held.has(token)||!ready||busy||mode==='playing')return false;if(held.size>=LIMITS.polyphony){message('同時最多可按下 32 個音。');return false;}if(mode==='recording'&&(notes.length>=LIMITS.notes||elapsed()>=LIMITS.duration-.002)){stopRecord();message('這段旋律已達錄製上限，請先下載保存。');return false;}
 try{const v=audio.noteOn(midi,settings.velocity);let note=null;if(mode==='recording'){note={midi,start:elapsed(),duration:.001,velocity:settings.velocity};notes.push(note);}held.set(token,{midi,voice:v,note});paintHeld();return true;}catch(e){message(e.message,true);return false;}
}
function end(token,at=elapsed(),persist=true){const h=held.get(token);if(!h)return;h.voice.release();if(h.note){h.note.duration=Math.max(.001,at-h.note.start);duration=Math.max(duration,h.note.start+h.note.duration);}held.delete(token);paintHeld();if(h.note&&persist){save();drawTimeline();update();}}
function releaseHeld(at=elapsed()){for(const key of [...held.keys()])end(key,at,false);audio.releaseAll();}
function startRecord(){if(!ready||busy||mode!=='idle')return;if(notes.length&&!confirm('開始新的錄製會取代目前旋律。繼續嗎？'))return;message('');releaseHeld();audio.silence();invalidateWav();notes=[];duration=0;recordAt=audio.now;mode='recording';save();drawTimeline();update();syncMetro(true);}
function stopRecord(){if(mode!=='recording')return;const t=elapsed();releaseHeld(t);duration=Math.min(LIMITS.duration,Math.max(t,...notes.map(n=>n.start+n.duration),0));mode='idle';stopMetro();save();drawTimeline();drawTable();update();}
async function play(){if(mode!=='idle'||busy||!notes.length)return;releaseHeld();stopMetro();busy=true;update();const token=++operation;try{await prepare([...range(),...notes.map(n=>n.midi)]);if(token!==operation)return;ready=true;audio.silence();playAt=audio.now+.08;audio.play(notes,playAt);mode='playing';message('');}catch(e){message(e.message,true);}finally{busy=false;update();}}
function stopPlay(){audio.stopPlayback();if(mode==='playing')mode='idle';for(const b of keys.values()){b.classList.remove('playing');b.setAttribute('aria-pressed','false');}updatePlayhead(0);update();}
function clear(){if(mode!=='idle'||busy)return;if((notes.length||duration)&&!confirm('清除目前的旋律？下載的檔案不受影響。'))return;releaseHeld();audio.silence();notes=[];duration=0;invalidateWav();save();drawTimeline();drawTable();update();message('已清除旋律。');}
function interrupt(text){operation++;if(mode==='recording')stopRecord();releaseHeld();stopPlay();stopMetro();audio.silence();save();if(text)message(text);}
function stopMetro(){clearInterval(metroTimer);metroTimer=null;audio.stopClicks();$('beat').classList.remove('on');}
function syncMetro(reset=false){stopMetro();if(!settings.metronome||!ready||busy||mode==='playing'||document.hidden||audio.context?.state!=='running')return;nextBeat=audio.now+.06;beatNumber=0;const tick=()=>{while(nextBeat<audio.now+.1){audio.click(nextBeat,beatNumber%4===0);nextBeat+=60/settings.bpm;beatNumber++;}};tick();metroTimer=setInterval(tick,25);}
function invalidateWav(){if(wavURL){$('wav-player').pause();$('wav-player').removeAttribute('src');$('wav-player').load();URL.revokeObjectURL(wavURL);wavURL=null;}$('audio-result').hidden=true;}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
async function exportWav(){if(!notes.length||busy||mode!=='idle')return;releaseHeld();stopMetro();busy=true;update();$('render-progress').hidden=false;message('');try{await prepare(notes.map(n=>n.midi));const buffer=await audio.render(notes,duration,settings.volume),blob=encodeWav(buffer);invalidateWav();wavURL=URL.createObjectURL(blob);$('wav-player').src=wavURL;$('audio-result').hidden=false;download(blob,'旋律-'+stamp()+'.wav');message('WAV 已產生，可在下方試聽。節拍器不包含在音檔中。');}catch(e){message(e.message||'音檔渲染失敗，請先下載 JSON 保存旋律。',true);}finally{busy=false;$('render-progress').hidden=true;$('wav').textContent='↓ 下載 WAV 音檔';update();}}
async function importJSON(file){if(!file||busy||mode!=='idle')return;busy=true;update();try{if(file.size>1024*1024)throw Error('JSON 檔案需小於 1 MB。');const d=validateDocument(JSON.parse(await file.text()));if(notes.length&&!confirm('匯入會取代目前旋律與設定。繼續嗎？'))return;interrupt();invalidateWav();({settings,notes,duration}=d);ready=false;audio.setVolume(settings.volume);syncForm();buildKeys();save();drawTimeline();drawTable();update();$('audio-status').textContent='旋律已匯入，點「啟用鋼琴」繼續演奏';message(`已匯入 ${notes.length} 個音符，含原本的音長、停頓與力度。`);}catch(e){message(e instanceof SyntaxError?'JSON 格式不正確，原有旋律已保留。':e.message,true);}finally{$('json-file').value='';busy=false;update();}}
async function copyPrompt(){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText($('prompt').value);}else{$('prompt').focus();$('prompt').select();if(!document.execCommand('copy'))throw Error();}$('copy').textContent='已複製 ✓';message('已複製風格指令。文字描述風格；實際旋律請另下載 WAV。');setTimeout(()=>$('copy').textContent='複製風格指令',2000);}catch{$('prompt').focus();$('prompt').select();message('瀏覽器未允許複製。文字已選取，請長按複製或按 Ctrl / ⌘ + C。',true);}}
const svgNode=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;};
let chart={width:800,seconds:8};
function drawTimeline(){const recording=mode==='recording',len=recording?Math.max(elapsed(),duration):duration;const visible=notes.length>0||recording;$('empty').hidden=visible;$('timeline-scroll').hidden=!visible;$('note-details').hidden=!notes.length;const svg=$('timeline');svg.replaceChildren();if(!visible)return;
 const seconds=Math.max(8,len+.2),width=Math.max(800,seconds*65),h=210,left=40,right=14,low=Math.min(60,...notes.map(n=>n.midi))-1,high=Math.max(72,...notes.map(n=>n.midi))+1,rows=high-low+1,dy=170/rows;
 chart={width,seconds};svg.setAttribute('width',width);svg.setAttribute('viewBox',`0 0 ${width} ${h}`);const sx=t=>left+t/seconds*(width-left-right);
 for(let p=low;p<=high;p++){const y=28+(high-p)*dy;svg.append(svgNode('line',{x1:left,x2:width,y1:y,y2:y,stroke:'var(--yk-line)','stroke-opacity':p%12===0?.65:.2}));if(p%12===0)svg.append(svgNode('text',{x:4,y:y+8,fill:'var(--yk-muted)','font-size':10},noteName(p)));}
 const step=seconds>30?5:1;for(let t=0;t<=seconds;t+=step){svg.append(svgNode('line',{x1:sx(t),x2:sx(t),y1:24,y2:200,stroke:'var(--yk-line)','stroke-dasharray':'2 5'}));svg.append(svgNode('text',{x:sx(t)+3,y:15,fill:'var(--yk-muted)','font-size':10},t+'秒'));}
 const pending=new Set([...held.values()].map(v=>v.note));for(const n of notes){const length=recording&&pending.has(n)?Math.max(.03,elapsed()-n.start):n.duration;const r=svgNode('rect',{x:sx(n.start),y:28+(high-n.midi)*dy+1,width:Math.max(2,sx(n.start+length)-sx(n.start)),height:Math.max(2,dy-2),rx:2,fill:'var(--yk-accent)',opacity:.4+n.velocity*.6});r.append(svgNode('title',{},`${noteName(n.midi)}，${n.start.toFixed(2)} 秒開始，持續 ${length.toFixed(2)} 秒`));svg.append(r);}
 svg.append(svgNode('line',{id:'playhead',x1:40,x2:40,y1:24,y2:200,stroke:'#cc8879','stroke-width':2}));updatePlayhead(recording?elapsed():0);
}
function updatePlayhead(t){const head=$('playhead');if(!head)return;const x=40+Math.min(t,chart.seconds)/chart.seconds*(chart.width-54);head.setAttribute('x1',x);head.setAttribute('x2',x);}
function drawTable(){const fragment=document.createDocumentFragment();for(const n of notes){const tr=document.createElement('tr');for(const val of [noteName(n.midi),n.start.toFixed(3),n.duration.toFixed(3),Math.round(n.velocity*100)+'%']){const td=document.createElement('td');td.textContent=val;tr.append(td);}fragment.append(tr);}$('note-table').replaceChildren(fragment);}
function frame(now){if(mode==='recording'){const t=elapsed();$('clock').textContent=time(t);if(now-lastDraw>120){drawTimeline();$('note-count').textContent=`${notes.length} 個音符 · ${t.toFixed(1)} 秒`;lastDraw=now;}if(t>=LIMITS.duration){stopRecord();message('已達 2 分鐘錄製上限，旋律已暫存。');}}
 if(mode==='playing'){const t=Math.max(0,audio.now-playAt);$('clock').textContent=time(Math.min(t,duration));$('state').textContent=t>duration?'播放餘音':'正在播放';updatePlayhead(t);const sounding=new Set(notes.filter(n=>t>=n.start&&t<n.start+n.duration).map(n=>n.midi));for(const [m,b]of keys){b.classList.toggle('playing',sounding.has(m));b.setAttribute('aria-pressed',String(sounding.has(m)));}if(t>=duration+TAIL)stopPlay();}
 if(metroTimer)$('beat').classList.toggle('on',nextBeat-audio.now>60/settings.bpm-.12);requestAnimationFrame(frame);}

$('enable').addEventListener('click',enable);$('record').addEventListener('click',startRecord);$('stop-record').addEventListener('click',stopRecord);$('play').addEventListener('click',play);$('stop-play').addEventListener('click',stopPlay);$('clear').addEventListener('click',clear);$('wav').addEventListener('click',exportWav);$('json').addEventListener('click',()=>download(new Blob([JSON.stringify(makeDocument(settings,notes,duration),null,2)],{type:'application/json'}),'旋律-'+stamp()+'.json'));$('import').addEventListener('click',()=>$('json-file').click());$('json-file').addEventListener('change',e=>importJSON(e.target.files[0]));$('copy').addEventListener('click',copyPrompt);
for(const k of Object.keys(DEFAULTS))$(k).addEventListener(k==='volume'||k==='velocity'||k==='extra'?'input':'change',()=>{
 if(k==='bpm'){const v=Number($('bpm').value);if(!Number.isInteger(v)||v<40||v>240){$('bpm').value=settings.bpm;message('BPM 請填入 40 到 240 之間的整數。',true);return;}}
 if(k==='octave'){releaseHeld();if(mode==='recording'){duration=elapsed();save();}ready=false;}
 settings[k]=k==='metronome'?$(k).checked:typeof DEFAULTS[k]==='number'?Number($(k).value):$(k).value;
 if(k==='volume'){audio.setVolume(settings.volume);invalidateWav();}if(k==='bpm'||k==='metronome')syncMetro(true);syncForm();save();
 if(k==='octave'){buildKeys();if(mode==='recording'){// End the take before loading another range, retaining held-note durations.
 stopRecord();message('八度已切換；本次錄製已保存。載入音色後可開始新的一段。');}enable();}
});
window.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable=true]'))return;const i=codes.indexOf(e.code);if(i<0)return;e.preventDefault();if(!ready){message('請先點「啟用鋼琴」，讓瀏覽器開啟聲音。');return;}begin('keyboard:'+e.code,range()[i]);});
window.addEventListener('keyup',e=>{if(codes.includes(e.code))end('keyboard:'+e.code);});
window.addEventListener('blur',()=>interrupt());document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});window.addEventListener('pagehide',()=>interrupt());
restore();syncForm();buildKeys();drawTimeline();drawTable();update();requestAnimationFrame(frame);
setInterval(()=>{if(mode==='recording')save();},2000);
function syncScroll(){const el=$('piano-scroll'),max=el.scrollWidth-el.clientWidth;$('keyboard-position').hidden=max<2;$('key-position').value=max?el.scrollLeft/max*100:0;}
$('piano-scroll').addEventListener('scroll',syncScroll,{passive:true});window.addEventListener('resize',syncScroll);
$('key-position').addEventListener('input',()=>{const el=$('piano-scroll');el.scrollLeft=Number($('key-position').value)/100*(el.scrollWidth-el.clientWidth);});
$('keys-left').addEventListener('click',()=>{$('piano-scroll').scrollBy({left:-280,behavior:'auto'});});$('keys-right').addEventListener('click',()=>{$('piano-scroll').scrollBy({left:280,behavior:'auto'});});

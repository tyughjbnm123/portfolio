export const LIMITS=Object.freeze({duration:120,notes:2000,polyphony:32,minMidi:21,maxMidi:108});
export const DEFAULTS=Object.freeze({bpm:90,octave:4,velocity:0.75,volume:0.7,metronome:false,genre:'piano',mood:'warm',vocal:'instrumental',arrangement:'solo',extra:''});
export const OPTIONS={genre:{piano:'Piano ballad',folk:'Acoustic folk',pop:'Melodic pop',rock:'Melodic rock',lofi:'Lo-fi'},mood:{warm:'warm and intimate',sad:'melancholic and reflective',healing:'soothing and comforting',energetic:'energetic and uplifting',mysterious:'mysterious and atmospheric'},vocal:{male:'Male lead vocals',female:'Female lead vocals',duet:'Male and female vocal duet',instrumental:'Instrumental only, no vocals'},arrangement:{solo:'Minimal solo piano arrangement',strings:'Piano with expressive string accompaniment',drums:'Piano with a supportive drum arrangement',build:'A gradual arrangement build from a quiet opening to a fuller climax'}};
export function stylePrompt(s){return `${OPTIONS.genre[s.genre]}; ${s.bpm} BPM; ${OPTIONS.mood[s.mood]}. ${OPTIONS.vocal[s.vocal]}. ${OPTIONS.arrangement[s.arrangement]}. Preserve space for a clear melodic lead.${s.extra.trim()?' '+s.extra.trim():''}`;}
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function validateDocument(d){
 if(!d||d.format!=='yk-melody'||d.version!==1||d.timeUnit!=='seconds')throw Error('不是支援的旋律 JSON（需要 yk-melody 第 1 版）。');
 if(!Array.isArray(d.notes)||d.notes.length>LIMITS.notes||!num(d.duration,0,LIMITS.duration))throw Error('旋律長度或音符數超過限制。');
 const s={...DEFAULTS,...d.settings};
 if(!num(s.bpm,40,240)||!Number.isInteger(s.bpm)||!num(s.octave,1,6)||!Number.isInteger(s.octave)||!num(s.velocity,.1,1)||!num(s.volume,0,1)||typeof s.metronome!=='boolean')throw Error('BPM、八度或力度設定不正確。');
 for(const k of Object.keys(OPTIONS))if(!Object.hasOwn(OPTIONS[k],s[k]))throw Error('風格選項不正確。');
 if(typeof s.extra!=='string'||s.extra.length>800)throw Error('補充描述最多 800 字。');
 const notes=d.notes.map(n=>{if(!n||!Number.isInteger(n.midi)||!num(n.midi,LIMITS.minMidi,LIMITS.maxMidi)||!num(n.start,0,LIMITS.duration)||!num(n.duration,.001,LIMITS.duration)||!num(n.velocity,.01,1)||n.start+n.duration>d.duration+.005)throw Error('音符資料不正確：請確認音高、時間、長度與力度。');return {midi:n.midi,start:n.start,duration:n.duration,velocity:n.velocity};}).sort((a,b)=>a.start-b.start||a.midi-b.midi);
 const edges=notes.flatMap(n=>[[n.start,1],[n.start+n.duration,-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let active=0;for(const e of edges){active+=e[1];if(active>LIMITS.polyphony)throw Error('同時發聲最多支援 32 個音符。');}
 return {format:'yk-melody',version:1,timeUnit:'seconds',duration:d.duration,settings:Object.fromEntries(Object.keys(DEFAULTS).map(k=>[k,s[k]])),notes};
}
export function makeDocument(settings,notes,duration){return {format:'yk-melody',version:1,timeUnit:'seconds',duration,settings:{...settings},notes:notes.map(n=>({...n})),sound:{name:'Salamander Grand Piano',author:'Alexander Holm',license:'CC BY 3.0',source:'https://github.com/Tonejs/audio/tree/master/salamander',processing:'Single sample layer, nearest-note transposition, amplitude velocity, release envelope and light algorithmic reverb.'}};}
export const noteName=midi=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);

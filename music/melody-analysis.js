// Descriptive heuristics over recorded note events, not music recognition or an AI service.
const pitchName=midi=>['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi%12]+(Math.floor(midi/12)-1);
const median=values=>{const a=[...values].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const rounded=value=>Number(value.toFixed(2));

export function analyzeMelody(input) {
 const notes=input.filter(n=>Number.isInteger(n.midi)&&n.midi>=21&&n.midi<=108&&Number.isFinite(n.start)&&n.start>=0&&Number.isFinite(n.duration)&&n.duration>0&&Number.isFinite(n.velocity)).map(n=>({...n})).sort((a,b)=>a.start-b.start||a.midi-b.midi);
 if(!notes.length)return null;
 // Group near-simultaneous attacks only when all notes actually overlap.
 const groups=[];
 for(const n of notes){const last=groups.at(-1);if(last&&n.start-last.start<=.03&&n.start<last.end-.001){last.notes.push(n);last.end=Math.min(last.end,n.start+n.duration);}else groups.push({start:n.start,end:n.start+n.duration,notes:[n]});}
 const pitches=groups.map(g=>median([...new Set(g.notes.map(n=>n.midi))]));
 const deltas=pitches.slice(1).map((p,i)=>p-pitches[i]).filter(d=>d!==0),signs=deltas.map(Math.sign);
 const runs=signs.filter((s,i)=>i===0||s!==signs[i-1]);
 let contour='insufficient';
 if(groups.length>=3){
  if(!signs.length)contour='level';
  else if(runs.length===1)contour=runs[0]>0?'rising':'falling';
  else if(runs.length===2)contour=runs[0]>0?'arch':'valley';
  else {const up=signs.filter(s=>s>0).length/signs.length;contour=up>=.75?'mostly-rising':up<=.25?'mostly-falling':'mixed';}
 }
 // Union the intervals so a sustained note underneath another note is not called a rest.
 const intervals=[];
 for(const n of notes){const end=n.start+n.duration,last=intervals.at(-1);if(last&&n.start<=last[1])last[1]=Math.max(last[1],end);else intervals.push([n.start,end]);}
 const gaps=intervals.slice(1).map((part,i)=>part[0]-intervals[i][1]).filter(gap=>gap>=.12);
 const edges=notes.flatMap(n=>[{at:n.start,midi:n.midi,delta:1},{at:n.start+n.duration,midi:n.midi,delta:-1}]).sort((a,b)=>a.at-b.at||a.delta-b.delta);
 const active=new Map();let maxPolyphony=0,overlapSeconds=0,lastAt=edges[0].at;
 for(const e of edges){if(active.size>1)overlapSeconds+=e.at-lastAt;const count=(active.get(e.midi)||0)+e.delta;if(count)active.set(e.midi,count);else active.delete(e.midi);maxPolyphony=Math.max(maxPolyphony,active.size);lastAt=e.at;}
 const lengths=notes.map(n=>n.duration),low=Math.min(...notes.map(n=>n.midi)),high=Math.max(...notes.map(n=>n.midi));
 const chordGroups=groups.filter(g=>new Set(g.notes.map(n=>n.midi)).size>1).length;
 return {count:notes.length,low,high,span:rounded(Math.max(...notes.map(n=>n.start+n.duration))-notes[0].start),contour,groupCount:groups.length,chordGroups,
  hasOverlap:overlapSeconds>=.03,maxPolyphony,minLength:rounded(Math.min(...lengths)),maxLength:rounded(Math.max(...lengths)),
  shortNotes:lengths.filter(d=>d<.25).length,longNotes:lengths.filter(d=>d>=1).length,rests:gaps.length,longestRest:rounded(Math.max(0,...gaps))};
}

const contours={
 zh:{insufficient:'起音數較少，暫不判斷整段走向。',level:'以重複相同音高為主。',rising:'整體逐步往高音移動。',falling:'整體逐步往低音移動。',arch:'先往高音移動，再往低音回落。',valley:'先往低音移動，再往高音回升。','mostly-rising':'高低交錯，以上行為主。','mostly-falling':'高低交錯，以下行為主。',mixed:'音高多次上行與下行，呈交錯走向。'},
 en:{insufficient:'Too few attacks to infer a phrase contour.',level:'Repeated pitches with a level contour.',rising:'A rising pitch contour.',falling:'A falling pitch contour.',arch:'A rising contour followed by a descent.',valley:'A descending contour followed by a rise.','mostly-rising':'An undulating contour with mostly upward movement.','mostly-falling':'An undulating contour with mostly downward movement.',mixed:'An undulating contour with several rises and falls.'}
};

export function describeMelody(a,language='zh') {
 if(!a)return null;
 const en=language==='en',poly=a.chordGroups>0,contour=contours[en?'en':'zh'][a.contour];
 const rhythm=en
  ?`Held-note lengths: ${a.minLength.toFixed(2)}–${a.maxLength.toFixed(2)} s. ${a.longNotes?'Includes sustained notes of at least 1 s. ':''}${a.rests?`${a.rests} internal rest(s) of at least 0.12 s; longest ${a.longestRest.toFixed(2)} s.`:'No internal rests of at least 0.12 s.'}`
  :`按住音符 ${a.minLength.toFixed(2)}–${a.maxLength.toFixed(2)} 秒。${a.longNotes?'包含至少 1 秒的長音。':''}${a.rests?`音符間有 ${a.rests} 處停頓，最長 ${a.longestRest.toFixed(2)} 秒。`:'音符間沒有超過 0.12 秒的停頓。'}`;
 const texture=en
  ?poly?`${a.chordGroups} near-simultaneous note group(s); up to ${a.maxPolyphony} different pitches overlap. Contour uses each group's middle pitch, not a detected lead melody.`:a.hasOverlap?'Some notes overlap, without near-simultaneous chord attacks.':'Single-note texture; no substantial note overlap.'
  :poly?`${a.chordGroups} 組同時起音，最多 ${a.maxPolyphony} 個不同音高重疊。走向取每組中間音高，不代表已辨識主旋律。`:a.hasOverlap?'有音符重疊，未偵測到同時起音的和弦音群。':'以單音演奏為主，沒有明顯重疊。';
 return {stats:en?`${a.count} notes · ${pitchName(a.low)}–${pitchName(a.high)} · Phrase span ${a.span.toFixed(2)} s`:`${a.count} 個音符 · ${pitchName(a.low)}–${pitchName(a.high)} · 首音至尾音 ${a.span.toFixed(2)} 秒`,
  items:[{label:en?(poly?'Pitch-center contour':'Contour'):(poly?'音群中心走向':'旋律走向'),text:contour},{label:en?'Note lengths & rests':'音長與停頓',text:rhythm},{label:en?'Texture':'重疊與和弦',text:texture}]};
}

export function melodyPrompt(a) {
 if(!a)return '';
 const poly=a.chordGroups>0;
 const parts=[`Recorded phrase reference: ${pitchName(a.low)} to ${pitchName(a.high)}.`,poly?'Pitch-center movement of simultaneous note groups:':'',a.contour==='insufficient'?'':contours.en[a.contour]];
 if(a.shortNotes&&a.longNotes)parts.push('A mix of brief attacks and sustained notes.');
 else if(a.longNotes)parts.push('Includes sustained notes.');
 else if(a.shortNotes/a.count>=.6)parts.push('Mostly brief note attacks.');
 if(a.rests)parts.push('Leave gaps between some notes.');
 if(poly)parts.push('Includes simultaneous notes; the lead melody has not been isolated.');
 else if(a.hasOverlap)parts.push('Some notes overlap.');
 else parts.push('A single-note line.');
 parts.push('Use the accompanying audio as the melody reference; this text is only a broad guide.');
 return parts.filter(Boolean).join(' ');
}

// 輸出 C：錄下自己的聲音。可以邊聽剛剛彈的旋律邊錄，再下載錄音，或和鋼琴合成一個 WAV。
// 只在按下「開始錄音」時才向瀏覽器要麥克風；錄音只存在這個分頁的記憶體裡，不會上傳。
import {encodeWav,SAMPLE_RATE} from './audio.js?v=88-keys';
import {write} from './i18n.js?v=voice-1';

const MAX_SECONDS=180;
const $=id=>document.getElementById(id);
const fmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(1).padStart(4,'0')}`;
const pickType=()=>{if(!window.MediaRecorder)return null;for(const type of ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'])if(MediaRecorder.isTypeSupported?.(type))return type;return '';};

export function initVoice({audio,getNotes,getDuration,getVolume,prepare,canStart,onBusy}){
 const recordBtn=$('voice-record'),stopBtn=$('voice-stop'),deleteBtn=$('voice-delete'),withMelody=$('voice-with-melody');
 const player=$('voice-player'),result=$('voice-result'),clock=$('voice-clock'),level=$('voice-level'),mixBtn=$('voice-mix'),downloadBtn=$('voice-download'),mixPlayer=$('voice-mix-player');
 let recorder=null,stream=null,chunks=[],blob=null,blobURL=null,mixURL=null,startPerf=0,offset=0,timer=0,meter=null,state='idle';
 const supported=!!(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder);

 function status(key,values,error=false){write('voice-state',key,values);$('voice-state').className='state'+(state==='recording'?' recording':'')+(error?' error':'');}
 function sync(){
  const hasNotes=getNotes().length>0;
  recordBtn.disabled=!supported||state!=='idle'||!canStart();
  stopBtn.disabled=state!=='recording';
  deleteBtn.disabled=state!=='idle'||!blob;
  withMelody.disabled=state!=='idle'||!hasNotes;
  mixBtn.disabled=state!=='idle'||!blob||!hasNotes;
  downloadBtn.disabled=state!=='idle'||!blob;
  result.hidden=!blob;
 }
 function stopMeter(){if(meter){cancelAnimationFrame(meter.raf);meter.source.disconnect();meter.context.close().catch(()=>{});meter=null;}level.style.transform='scaleX(0)';}
 function startMeter(){
  try{const C=window.AudioContext||window.webkitAudioContext,context=new C(),source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();analyser.fftSize=1024;source.connect(analyser);const data=new Float32Array(analyser.fftSize);
   const loop=()=>{analyser.getFloatTimeDomainData(data);let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));level.style.transform=`scaleX(${Math.min(1,peak*1.4).toFixed(3)})`;meter.raf=requestAnimationFrame(loop);};
   meter={context,source,raf:0};loop();}catch{}
 }
 function releaseMic(){stream?.getTracks().forEach(track=>track.stop());stream=null;stopMeter();}
 function clearResult(){if(blobURL)URL.revokeObjectURL(blobURL);if(mixURL)URL.revokeObjectURL(mixURL);blob=blobURL=mixURL=null;player.removeAttribute('src');player.load();mixPlayer.removeAttribute('src');mixPlayer.load();$('voice-mix-result').hidden=true;}

 async function start(){
  if(state!=='idle'||!canStart())return;
  if(!supported){status('這個瀏覽器不支援錄音，請改用新版 Chrome、Edge 或 Safari。',{},true);return;}
  state='starting';onBusy(true);sync();status('正在開啟麥克風…');
  const playMelody=withMelody.checked&&getNotes().length>0;
  try{
   if(playMelody)await prepare();
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  }catch(e){releaseMic();state='idle';onBusy(false);sync();
   status(e?.name==='NotAllowedError'||e?.name==='SecurityError'?'沒有麥克風權限。請在瀏覽器網址列旁允許使用麥克風，再試一次。':e?.name==='NotFoundError'?'找不到麥克風，請確認裝置已連接。':(e?.message||'無法開啟麥克風。'),{},true);return;}
  clearResult();chunks=[];offset=0;
  const type=pickType();recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);
  recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};
  recorder.onstop=finish;
  recorder.onstart=()=>{
   startPerf=performance.now();state='recording';sync();status('錄音中');startMeter();
   if(playMelody){const lead=.12;audio.silence();audio.play(getNotes(),audio.now+lead);offset=lead+(audio.context?.outputLatency||audio.context?.baseLatency||0);}
   const tick=()=>{const s=(performance.now()-startPerf)/1000;clock.value=fmt(s);clock.textContent=fmt(s);if(s>=MAX_SECONDS){stop();return;}timer=requestAnimationFrame(tick);};tick();
  };
  recorder.start(250);
 }
 function stop(){if(state!=='recording')return;state='stopping';cancelAnimationFrame(timer);audio.stopPlayback();try{recorder.stop();}catch{finish();}sync();}
 function finish(){
  releaseMic();
  blob=chunks.length?new Blob(chunks,{type:recorder?.mimeType||chunks[0].type||'audio/webm'}):null;chunks=[];recorder=null;
  if(blob){blobURL=URL.createObjectURL(blob);player.src=blobURL;status('錄好了，可以試聽或下載');}else status('沒有錄到聲音，請再試一次。',{},true);
  state='idle';onBusy(false);sync();
 }
 function remove(){if(state!=='idle')return;clearResult();clock.value=clock.textContent='00:00.0';status('尚未錄音');sync();}
 const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
 function save(href,name){const a=document.createElement('a');a.href=href;a.download=name;document.body.append(a);a.click();a.remove();}
 function download(){if(!blob)return;const ext=/mp4/.test(blob.type)?'m4a':/ogg/.test(blob.type)?'ogg':'webm';save(blobURL,`my-voice-${stamp()}.${ext}`);}

 async function mix(){
  const notes=getNotes();if(!blob||!notes.length||state!=='idle')return;
  state='mixing';onBusy(true);sync();status('正在合成旋律與人聲…');
  try{
   await prepare(notes.map(n=>n.midi));
   const piano=await audio.render(notes,getDuration(),getVolume());
   const O=window.OfflineAudioContext||window.webkitOfflineAudioContext,decoder=new O(1,1,SAMPLE_RATE);
   const voice=await decoder.decodeAudioData(await blob.arrayBuffer());
   // the voice started `offset` seconds before the first piano note it heard: shift the piano by that much
   const shift=Math.round(offset*SAMPLE_RATE),length=Math.max(piano.length+shift,voice.length);
   const out=new O(2,1,SAMPLE_RATE).createBuffer(2,length,SAMPLE_RATE);
   let peak=0;
   for(let c=0;c<2;c++){const o=out.getChannelData(c),p=piano.getChannelData(Math.min(c,piano.numberOfChannels-1)),v=voice.getChannelData(Math.min(c,voice.numberOfChannels-1));
    for(let i=0;i<p.length;i++)o[i+shift]+=p[i];
    for(let i=0;i<v.length;i++)o[i]+=v[i];
    for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(o[i]));}
   if(peak>.98)for(let c=0;c<2;c++){const o=out.getChannelData(c),k=.98/peak;for(let i=0;i<length;i++)o[i]*=k;}
   if(mixURL)URL.revokeObjectURL(mixURL);mixURL=URL.createObjectURL(encodeWav(out));
   mixPlayer.src=mixURL;$('voice-mix-result').hidden=false;save(mixURL,`melody-and-voice-${stamp()}.wav`);status('已下載旋律＋人聲 WAV');
  }catch(e){if(e?.message)status('合成失敗：{reason}',{reason:e.message},true);else status('合成失敗，請再試一次。',{},true);}
  finally{state='idle';onBusy(false);sync();}
 }

 recordBtn.addEventListener('click',start);stopBtn.addEventListener('click',stop);deleteBtn.addEventListener('click',remove);
 downloadBtn.addEventListener('click',download);mixBtn.addEventListener('click',mix);
 window.addEventListener('pagehide',()=>{if(state==='recording')stop();});
 if(!supported)status('這個瀏覽器不支援錄音，請改用新版 Chrome、Edge 或 Safari。',{},true);else status('尚未錄音');
 sync();
 return {sync,get busy(){return state!=='idle';}};
}

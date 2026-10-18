import {t,write} from './i18n.js?v=guide-1';

export function initPerformance({release,enable,isReady,onLayout}) {
 const body=document.body, instrument=document.querySelector('.instrument');
 const trigger=document.getElementById('performance-enter'),exit=document.getElementById('performance-exit');
 const settings=document.getElementById('performance-settings'),drawer=document.getElementById('performance-settings-body');
 const landscape=matchMedia('(orientation: landscape) and (max-height: 560px) and (max-width: 1200px)');
 const full=document.getElementById('performance-fullscreen');
 let active=false,dismissed=false,oldScroll=0,restoreFocus=null;
 const moved=[];
 function repaint(){
  body.classList.toggle('performing',active);trigger.setAttribute('aria-expanded',String(active));
  full.hidden=!document.fullscreenEnabled;
  write('performance-fullscreen',document.fullscreenElement?'退出全螢幕':'全螢幕');
  onLayout();
 }
 function closeSettings(){if(settings.open)settings.close();}
 function enter(fromGesture=false){
  if(active)return;active=true;oldScroll=window.scrollY;restoreFocus=document.activeElement;
  release();repaint();exit.focus({preventScroll:true});
  if(fromGesture&&!isReady())void enable();
 }
 function leave(){
  if(!active)return;closeSettings();release();active=false;dismissed=landscape.matches;
  if(document.fullscreenElement===instrument)document.exitFullscreen().catch(()=>{});
  repaint();window.scrollTo({top:oldScroll,behavior:'instant'});restoreFocus?.focus?.({preventScroll:true});
 }
 function orientation(){
  // A layout change ends live notes, never discards the recording.
  release();
  if(landscape.matches){if(!dismissed)enter(false);}else{dismissed=false;if(active)leave();}
  repaint();
 }
 trigger.addEventListener('click',()=>enter(true));exit.addEventListener('click',leave);
 landscape.addEventListener('change',orientation);
 const rotate=()=>{release();requestAnimationFrame(onLayout);};
 screen.orientation?.addEventListener('change',rotate);
 window.addEventListener('orientationchange',rotate);
 window.addEventListener('resize',()=>requestAnimationFrame(onLayout));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!settings.open){event.preventDefault();leave();}});
 function openSettings(){
  if(settings.open)return;release();
  for(const selector of ['.piano-settings','.tempo-bar','.output-grid']){
   const element=document.querySelector(selector),anchor=document.createComment('performance settings position');
   element.before(anchor);moved.push({element,anchor});drawer.append(element);
  }
  settings.showModal();
 }
 document.querySelectorAll('[data-performance-settings]').forEach(b=>b.addEventListener('click',openSettings));
 document.getElementById('performance-settings-close').addEventListener('click',closeSettings);
 settings.addEventListener('close',()=>{for(const {element,anchor}of moved){anchor.replaceWith(element);}moved.length=0;onLayout();});
 full.addEventListener('click',async()=>{
  release();try{if(document.fullscreenElement===instrument)await document.exitFullscreen();else await instrument.requestFullscreen();}
  catch{window.dispatchEvent(new CustomEvent('music:notice',{detail:'全螢幕無法啟用，仍可正常演奏。'}));}
  repaint();
 });
 document.addEventListener('fullscreenchange',repaint);
 window.addEventListener('yk:language',repaint);
 repaint();if(landscape.matches)enter(false);
 return {get active(){return active;}};
}

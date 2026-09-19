/* Shared, bounded image loading for the action gallery and exported storyboards. */
(function(root){
  'use strict';
  function browserLoad(src){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      const timer=setTimeout(()=>finish(false),12000);
      let settled=false;
      function finish(ok){if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;ok?resolve(image):reject(Error('圖片載入失敗'));}
      image.onload=()=>finish(image.naturalWidth>0);image.onerror=()=>finish(false);image.src=src;
    });
  }
  function createLoader({load=browserLoad,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
    const cache=new Map();
    function get(src){
      if(cache.has(src))return cache.get(src);
      const promise=(async()=>{
        const sources=src.endsWith('.png')?[src.replace(/\.png$/,'.webp'),src]:[src];
        for(let round=0;round<2;round++){
          if(round)await delay(600);
          for(const source of sources){
            try{return await load(source+(round?(source.includes('?')?'&':'?')+'retry=1':''));}catch{}
          }
        }
        throw Error('動作圖片暫時無法載入，請點「重試圖片」。');
      })();
      cache.set(src,promise);
      promise.catch(()=>{if(cache.get(src)===promise)cache.delete(src);});
      return promise;
    }
    return {get};
  }
  const api={createLoader};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ActionMedia=api;
})(typeof window==='undefined'?{}:window);

/* Shared, bounded image loading for the action gallery and exported storyboards. */
(function(root){
  'use strict';
  function browserLoad(src,{timeout=6000}={}){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.decoding='async';
      const timer=setTimeout(()=>finish(false),timeout);
      let settled=false;
      function finish(ok){if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;if(ok)resolve(image);else{image.src='';reject(Error('圖片載入失敗'));}}
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
    function getPreview(src){
      const key='preview:'+src;
      if(cache.has(key))return cache.get(key);
      const webp=src.replace(/\.png$/,'.webp'),thumbnail=webp.replace(/\.webp$/,'.preview.webp');
      const promise=(async()=>{
        // Two short attempts, never the multi-megabyte PNG used for export fallback.
        for(const [index,source] of [thumbnail,webp].entries()){
          if(index)await delay(250);
          try{return await load(source,{timeout:4000});}catch{}
        }
        throw Error('圖片載入較久，請點圖重試。');
      })();
      cache.set(key,promise);
      promise.catch(()=>{if(cache.get(key)===promise)cache.delete(key);});
      return promise;
    }
    return {get,getPreview};
  }
  const api={createLoader};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ActionMedia=api;
})(typeof window==='undefined'?{}:window);

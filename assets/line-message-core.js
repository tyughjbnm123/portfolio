/* Flex Message composer. Local data only; this module never sends messages. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LineComposer=api;
})(globalThis,function(){
  'use strict';
  const LIMITS={cards:12,altText:1500,label:40,uri:1000,image:2000,bubble:30000,carousel:50000};
  const IMAGE_SIZES={'20:13':[1000,650],'1:1':[1000,1000],'16:9':[1024,576],'4:3':[1000,750],'4:5':[800,1000],'9:16':[576,1024]};
  const clean=v=>String(v??'').trim();
  const size=v=>new TextEncoder().encode(JSON.stringify(v)).length;
  const asset='https://tyughjbnm123.github.io/portfolio/assets/';
  const target='https://tyughjbnm123.github.io/portfolio/';
  function card(kind='product'){
    const common={eyebrow:'本週精選',title:'好友相聚，零食上桌',description:'用一張卡片介紹聚會零食，把商品資訊與活動連結一起分享。',detail:'',image:asset+'lora-zhenzhen-sample.jpg',ratio:'1:1',fit:'contain',button1Label:'查看示範作品',button1Url:target+'creative.html',button2Label:'',button2Url:''};
    if(kind==='event')return {...common,eyebrow:'活動邀請',title:'一起探索影像創作',description:'介紹活動主題、適合參加的對象與報名方式。把重要資訊，放進一則訊息。',detail:'日期・地點請在此填寫',image:asset+'panasonic-thumb.jpg',button1Label:'查看活動案例',button1Url:target+'projects.html'};
    if(kind==='notice')return {...common,eyebrow:'品牌公告',title:'有件新鮮事，想告訴你',description:'在這裡寫下你的品牌消息。\n\n可加入服務異動、會員通知，或一段想分享給顧客的內容。',image:'',button1Label:'了解更多',button1Url:target};
    if(kind==='blank')return {...common,eyebrow:'',title:'新卡片',description:'',image:'',button1Label:'',button1Url:''};
    return common;
  }
  function initial(){return {altText:'本週精選｜查看品牌推薦與最新消息',accent:'#536F35',tracking:{enabled:false,source:'line',medium:'social',campaign:'',content:''},cards:[card()]};}
  function webUrl(raw,httpsOnly=false){
    const value=clean(raw);if(!value)return '';
    try{const url=new URL(value);if(!(httpsOnly?['https:']:['https:','http:']).includes(url.protocol)||!url.hostname||url.username||url.password)return '';return url.href;}catch{return '';}
  }
  function link(raw,tracking={},index=0,button=0){
    const valid=webUrl(raw);if(!valid)return '';
    const url=new URL(valid);
    if(tracking.enabled){
      for(const key of ['source','medium','campaign']){const value=clean(tracking[key]);if(value)url.searchParams.set('utm_'+key,value);}
      const base=clean(tracking.content)||'card';url.searchParams.set('utm_content',`${base}_${index+1}_button_${button+1}`);
    }
    return url.href;
  }
  function contrastWhite(hex){
    if(!/^#[0-9a-f]{6}$/i.test(hex))return 0;
    const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return 1.05/(.2126*c[0]+.7152*c[1]+.0722*c[2]+.05);
  }
  function bubble(c,accent,tracking,index){
    const contents=[];
    if(clean(c.eyebrow))contents.push({type:'text',text:clean(c.eyebrow),size:'xs',weight:'bold',color:accent,wrap:true});
    contents.push({type:'text',text:clean(c.title),size:'xl',weight:'bold',color:'#30382F',wrap:true});
    if(clean(c.description))contents.push({type:'text',text:clean(c.description),size:'sm',color:'#646F5D',wrap:true});
    if(clean(c.detail))contents.push({type:'text',text:clean(c.detail),size:'lg',weight:'bold',color:accent,wrap:true});
    const b={type:'bubble',size:'mega',body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'20px',contents}};
    if(clean(c.image))b.hero={type:'image',url:webUrl(c.image,true),size:'full',aspectRatio:c.ratio,aspectMode:c.fit==='contain'?'fit':'cover',backgroundColor:'#FFFFFF'};
    const buttons=[];
    for(let i=1;i<=2;i++)if(clean(c['button'+i+'Label'])||clean(c['button'+i+'Url']))buttons.push({type:'button',style:i===1?'primary':'link',height:'sm',color:accent,action:{type:'uri',label:clean(c['button'+i+'Label']),uri:link(c['button'+i+'Url'],tracking,index,i-1)}});
    if(buttons.length)b.footer={type:'box',layout:'vertical',spacing:'sm',paddingAll:'20px',paddingTop:'0px',contents:buttons};
    b.styles={body:{backgroundColor:'#FFFFFF'},footer:{backgroundColor:'#FFFFFF'}};
    return b;
  }
  function compile(state){
    const errors=[];const add=(field,message,cardIndex=null)=>errors.push({field,message,cardIndex});
    if(!clean(state.altText))add('altText','請填寫通知摘要。');
    if(clean(state.altText).length>LIMITS.altText)add('altText',`通知摘要最多 ${LIMITS.altText} 字。`);
    const accent=/^#[0-9a-f]{6}$/i.test(state.accent)?state.accent.toUpperCase():'#536F35';
    if(!/^#[0-9a-f]{6}$/i.test(state.accent))add('accent','請使用完整的六碼色碼，例如 #536F35。');
    else if(contrastWhite(accent)<4.5)add('accent','這個顏色太淺，請選較深的主色，讓白色按鈕文字清楚可讀。');
    if(!Array.isArray(state.cards)||state.cards.length<1||state.cards.length>LIMITS.cards)add('cards',`請保留 1–${LIMITS.cards} 張卡片。`);
    const tracking=state.tracking||{};
    if(tracking.enabled)for(const k of ['source','medium','campaign'])if(!clean(tracking[k]))add('utm-'+k,`請填寫 UTM ${ {source:'來源',medium:'媒介',campaign:'活動名稱'}[k]}。`);
    const bubbles=(state.cards||[]).map((c,index)=>{
      const at=(field,message)=>add(field,`第 ${index+1} 張：${message}`,index);
      if(!clean(c.title))at('title','請填寫卡片標題。');
      for(const field of ['eyebrow','title','description','detail'])if(clean(c[field]).length>2000)at(field,'單一文字區塊請控制在 2,000 字內。');
      if(clean(c.image)&&(!webUrl(c.image,true)||webUrl(c.image,true).length>LIMITS.image))at('image','請使用 2,000 字內的 HTTPS 圖片網址。');
      if(!Object.hasOwn(IMAGE_SIZES,c.ratio))at('ratio','圖片比例設定不正確。');
      if(!['cover','contain'].includes(c.fit))at('fit','圖片裁切設定不正確。');
      for(let i=1;i<=2;i++){
        const label=clean(c['button'+i+'Label']),raw=clean(c['button'+i+'Url']);
        if(!label&&!raw)continue;
        if(!label||label.length>LIMITS.label)at('button'+i+'Label',`按鈕 ${i} 需填寫 1–${LIMITS.label} 字的文字。`);
        const uri=link(raw,tracking,index,i-1);
        if(!uri)at('button'+i+'Url',`按鈕 ${i} 需填寫完整的 http:// 或 https:// 網址。`);
        else if(uri.length>LIMITS.uri)at('button'+i+'Url',`按鈕 ${i} 加上 UTM 後超過 ${LIMITS.uri} 字，請縮短網址或活動名稱。`);
      }
      const b=bubble(c,accent,tracking,index);
      if(size(b)>LIMITS.bubble)at('title','卡片內容超過 30 KB，請縮短文字。');
      return b;
    });
    const contents=bubbles.length===1?bubbles[0]:{type:'carousel',contents:bubbles};
    if(bubbles.length>1&&size(contents)>LIMITS.carousel)add('cards','輪播總內容超過 50 KB，請減少卡片或文字。');
    const message={type:'flex',altText:clean(state.altText),contents};
    return {message,contents,errors,bytes:size(contents),valid:errors.length===0};
  }
  // Reordering uses stable array positions; moving past an edge keeps the original order.
  function move(cards,index,delta){const next=index+delta;if(index<0||index>=cards.length||next<0||next>=cards.length)return index;[cards[index],cards[next]]=[cards[next],cards[index]];return next;}
  return {LIMITS,IMAGE_SIZES,card,initial,webUrl,link,contrastWhite,compile,move};
});

import * as THREE from 'three';

// All five district identities use exactly the same physical display and type layout.
// Sized to the district landmarks' own LED panels at human scale (3.15 × 20.6 × 0.45), so all five match the buildings.
export const DISTRICT_LED=Object.freeze({width:1.45,height:9.2,depth:.16});
export const DISTRICT_TITLES=Object.freeze({
  about:['我是誰','WHO AM I'],work:['作品集','WORKS'],tools:['工具房','TOOL ROOM'],lab:['實驗室','LAB'],games:['遊戲室','ARCADE']
});
export function createDistrictLED({title,subtitle,color='#75e7ef',pick=()=>{}}){
  const {width:w,height:h,depth:d}=DISTRICT_LED;
  const group=new THREE.Group();group.name='直式主入口 LED / '+title;
  group.userData.displaySize={width:w,height:h};
  const CW=384,CH=Math.round(CW*h/w);
  const canvas=document.createElement('canvas');canvas.width=CW;canvas.height=CH;
  const c=canvas.getContext('2d');c.fillStyle='#060d17';c.fillRect(0,0,CW,CH);
  c.strokeStyle=color;c.lineWidth=6;c.strokeRect(16,16,CW-32,CH-32);
  c.fillStyle=color;c.fillRect(28,36,118,6);c.fillRect(CW-146,CH-42,118,6);
  // One column of characters, sized so every title fills the same column whatever its length.
  const chars=[...title],top=110,bottom=CH-190,step=Math.min(300,(bottom-top)/chars.length),size=Math.min(236,step*.86);
  c.textAlign='center';c.textBaseline='middle';c.font=`900 ${size}px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif`;
  chars.forEach((char,i)=>{const y=top+step*(i+.5)+(bottom-top-step*chars.length)/2;c.shadowColor=color;c.shadowBlur=24;c.fillStyle='#f6f9ff';c.fillText(char,CW/2,y,300);});
  c.shadowBlur=0;c.font='700 30px monospace';c.fillStyle=color;c.fillText(subtitle,CW/2,CH-120,320);
  c.fillStyle='rgba(0,0,0,.16)';for(let y=25;y<CH-16;y+=5)c.fillRect(24,y,CW-48,1);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const metal=new THREE.MeshStandardMaterial({color:0x253443,roughness:.52,metalness:.7});
  const face=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);group.add(m);pick(m);return m;};
  add(new THREE.BoxGeometry(w+.22,h+.22,d),metal);
  add(new THREE.PlaneGeometry(w,h),face,0,0,d/2+.015);
  const trim=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.7,roughness:.45});
  for(const x of [-w/2-.07,w/2+.07])add(new THREE.BoxGeometry(.07,h-.1,.07),trim,x,0,d/2+.04);
  for(const y of [-h/2+.4,h/2-.4])add(new THREE.BoxGeometry(w-.1,.14,.5),metal,0,y,-.28);
  // Daylight keeps the panel legible; at night it is a lit screen (just under the bloom threshold, so text stays crisp).
  group.userData.update=n=>{const k=.72+n*.2;face.color.setRGB(k,k,k);trim.emissiveIntensity=.2+n*.8;};
  group.userData.update(0);
  return group;
}

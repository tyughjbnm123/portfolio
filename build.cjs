const fs=require('node:fs'),path=require('node:path');
const root=__dirname,dist=path.join(root,'dist');
fs.mkdirSync(dist,{recursive:true});
for(const file of fs.readdirSync(root).filter(n=>n.endsWith('.html')))fs.copyFileSync(path.join(root,file),path.join(dist,file));
fs.cpSync(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
console.log('Built static site: dist/');

// Local-only preview; only serves this kit, never the rest of the workspace.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||59219);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.glb':'model/gltf-binary','.png':'image/png','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  if(pathname.startsWith('/portfolio/'))pathname=pathname.slice('/portfolio'.length);
  if(pathname==='/'){res.writeHead(302,{Location:'/tools/preview-cyber-city.html'});return res.end();}
  const file=path.resolve(root,'.'+pathname),relative=path.relative(root,file);
  const allowed=pathname.startsWith('/assets/island-city/')||['/tools/preview-cyber-city.html','/tools/preview-cyber-city.js','/tools/cyber-city-parts.js'].includes(pathname);
  if(!allowed||relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Original kit preview: http://127.0.0.1:${port}/tools/preview-cyber-city.html`));

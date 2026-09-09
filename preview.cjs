const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
http.createServer((req,res)=>{
 let filename;try{filename=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+(filename==='/'?'/index.html':filename));
 if(!file.startsWith(root+path.sep)||(!types[path.extname(file)])){res.writeHead(404);res.end('Not found');return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(data);});
}).listen(4186,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4186/ad-storyboard.html'));

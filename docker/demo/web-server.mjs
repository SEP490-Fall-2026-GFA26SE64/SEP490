import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'frontend/dist'),port=Number(process.env.PORT??8099);
const api=new URL(process.env.API_TARGET??'http://127.0.0.1:18099');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer((req,res)=>{
 if(req.url.startsWith('/api/')||req.url.startsWith('/actuator/')){
  const proxy=http.request({hostname:api.hostname,port:api.port,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-host':req.headers.host,'x-forwarded-proto':'http'}},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res);});
  proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'content-type':'application/json'});res.end('{"code":"DEMO_API_UNAVAILABLE"}');});req.pipe(proxy);return;
 }
 let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+decoded);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 if(!fs.existsSync(target)){res.writeHead(503);res.end('Build the demo frontend first.');return;}
 res.writeHead(200,{'content-type':mime[path.extname(target)]??'application/octet-stream','cache-control':'no-store'});fs.createReadStream(target).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log(`Brightpath demo http://localhost:${port} -> ${api.origin}`));

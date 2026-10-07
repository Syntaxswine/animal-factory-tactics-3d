// Read-only preview; retained for review with a real 24-hour shutdown timer.
import {createServer} from 'node:http';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),record=fileURLToPath(new URL('../artifacts/grenade-throw/',import.meta.url));
fs.mkdirSync(record,{recursive:true});
const port=Number(process.argv[2]||4476),startedAt=new Date().toISOString(),expiresAt=new Date(Date.now()+86400000).toISOString();
const server=createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(relative==='/'?'/tactics/grenade-throw-study.html':relative));
 if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return;}
 const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ogg':'audio/ogg'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404).end('Not found');}});
let stopping=false;const stop=reason=>{if(stopping)return;stopping=true;clearInterval(poll);clearTimeout(expiry);server.closeAllConnections();server.close(()=>{fs.writeFileSync(path.join(record,'stopped.json'),JSON.stringify({pid:process.pid,startedAt,stoppedAt:new Date().toISOString(),reason},null,2));process.exit(0);});};
const poll=setInterval(()=>{if(fs.existsSync(path.join(record,'STOP')))stop('review finished');},500),expiry=setTimeout(()=>stop('24 hour preview expiry'),86400000);
process.on('SIGTERM',()=>stop('signal'));process.on('SIGINT',()=>stop('signal'));
server.listen(port,'127.0.0.1',()=>fs.writeFileSync(path.join(record,'ready.json'),JSON.stringify({pid:process.pid,startedAt,expiresAt,port,root},null,2)));

// Read-only art preview; stops on its private STOP marker or the fixed deadline.
import {createServer} from 'node:http';
import fs from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const project=path.resolve(import.meta.dirname,'..');
const record=path.resolve(process.env.PREVIEW_RECORD||path.join(project,'artifacts/natural-rock-arches/server'));
const port=Number(process.argv[2]||4476);
const expiresAt=process.env.PREVIEW_EXPIRES||new Date(Date.now()+86400000).toISOString(),remaining=Date.parse(expiresAt)-Date.now();
if(!Number.isFinite(remaining)||remaining<=0||remaining>86400000)throw Error('Preview requires a future deadline within 24 hours.');
fs.mkdirSync(record,{recursive:true});
if(fs.existsSync(path.join(record,'STOP')))throw Error('Use a fresh helper record for a new process lifetime.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.ogg':'audio/ogg'};
const startedAt=new Date().toISOString();
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const packaged=relative.startsWith('/packaged/'),root=path.join(project,packaged?'.pages-output':'dist');
  if(packaged)relative=relative.slice(9);
  const file=path.resolve(root,'.'+(relative==='/'?'/tactics/natural-arches-study.html':relative));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404).end('Not found');}
});
let stopping=false;
function stop(reason){
 if(stopping)return;stopping=true;clearInterval(poll);clearTimeout(expiry);
 server.closeAllConnections();
 server.close(()=>{fs.writeFileSync(path.join(record,'stopped.json'),JSON.stringify({pid:process.pid,startedAt,stoppedAt:new Date().toISOString(),reason},null,2));process.exit(0);});
}
const poll=setInterval(()=>{if(fs.existsSync(path.join(record,'STOP')))stop('review finished');},500);
const expiry=setTimeout(()=>stop('preview deadline'),remaining);
process.on('SIGTERM',()=>stop('signal'));process.on('SIGINT',()=>stop('signal'));
server.on('error',e=>{clearInterval(poll);clearTimeout(expiry);console.error(e);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>fs.writeFileSync(path.join(record,'ready.json'),JSON.stringify({pid:process.pid,startedAt,expiresAt,port,root:project},null,2)));

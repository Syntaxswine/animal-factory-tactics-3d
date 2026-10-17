import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {instrument,instrumentQueries} from './instrument.mjs';
const root=path.resolve(import.meta.dirname,'../..'),source=import.meta.dirname,out=path.join(root,'artifacts/texture-combat-2026-10-16'),port=4371;
const expiry=new Date(process.argv[2]);if(!Number.isFinite(+expiry)||+expiry<=Date.now()||+expiry-Date.now()>86400000)throw Error('Supply expiry within 24 hours');
fs.mkdirSync(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port),parts=url.pathname.split('/').filter(Boolean),headers={'Cache-Control':'no-store','Document-Policy':'js-profiling','Content-Type':'application/json'};
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403).end();return;}
  if(req.method==='POST'&&parts[0]==='results'){
   if(req.headers.origin!=='http://127.0.0.1:'+port||!/^[a-z0-9-]{1,100}$/.test(parts[1]||'')){res.writeHead(403).end();return;}
   let data='',size=0;for await(const part of req){size+=part.length;if(size>100e6)throw Error('Result too large');data+=part;}
   fs.writeFileSync(path.join(out,parts[1]+'.json'),JSON.stringify(JSON.parse(data)));res.writeHead(200,headers).end('{"saved":true}');return;
  }
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  const builds=path.join(out,'builds');
  if(parts[0]==='manifest'){const labels=fs.readdirSync(builds).filter(p=>fs.existsSync(path.join(builds,p,'manifest.json'))),records=Object.fromEntries(labels.map(p=>[p,JSON.parse(fs.readFileSync(path.join(builds,p,'manifest.json')))]));res.writeHead(200,headers).end(JSON.stringify({builds:records,port,expiresAt:expiry.toISOString()}));return;}
  const mode=parts.shift(),diagnostic=mode?.startsWith('diagnose-'),profile=mode?.startsWith('profile-'),play=mode?.startsWith('play-'),label=mode?.replace(/^(diagnose|profile|play)-/,'');
  if(!/^[a-z0-9-]+$/.test(label||'')||!fs.existsSync(path.join(builds,label,'manifest.json'))){res.writeHead(404).end('Build not found');return;}
  const build=path.join(builds,label,'package'),relative=parts.join('/'),target=path.resolve(build,relative);if(!target.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  let data;const name=relative.startsWith('tactics/')?relative.slice(8):'';
  if(['performance-lab.js','performance-fixture.js','gfx-diagnostics.js','graphics-audit.js','graphics-audit.html','cpu-diagnostics.js','play-audit.js'].includes(name))data=fs.readFileSync(path.join(source,{'performance-lab.js':'browser.js','performance-fixture.js':'fixture.js'}[name]||name));
  else{
   data=await fs.promises.readFile(target);
   if(['battle-map.js','battle-3d.js','hybrid-renderer.js','save-store.js'].includes(name))data=instrument(name,data.toString(),profile,play);
   if(profile&&name.endsWith('.js'))data=instrumentQueries(name,data.toString());
   if(diagnostic&&name==='battle-3d.html')data=data.toString().replace('<head>','<head><script src="./gfx-diagnostics.js"></script>');
   if(diagnostic&&name==='vendor/three.module.js')data=data.toString()
    .replace('this.renderBufferDirect = function ( camera, scene, geometry, material, object, group ) {','this.renderBufferDirect = function ( camera, scene, geometry, material, object, group ) { globalThis.gfxDiagnostic?.draw(object,material,scene);')
    .replace('function uploadTexture( textureProperties, texture, slot ) {','function uploadTexture( textureProperties, texture, slot ) { globalThis.gfxDiagnostic?.upload(texture,slot);');
  }
  headers['Content-Type']=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wasm':'application/wasm'})[path.extname(target)]||'application/octet-stream';
  res.writeHead(200,headers).end(data);
 }catch(e){res.writeHead(500,{'Content-Type':'text/plain'}).end(e.stack);}
});
let stopping=false;function stop(){if(stopping)return;stopping=true;clearInterval(check);clearTimeout(timeout);server.close(()=>fs.writeFileSync(path.join(out,'stopped.json'),JSON.stringify({pid:process.pid,stoppedAt:new Date().toISOString()})));server.closeIdleConnections();}
const check=setInterval(()=>{if(fs.existsSync(path.join(out,'STOP')))stop();},1000),timeout=setTimeout(stop,+expiry-Date.now());
server.on('error',e=>{clearInterval(check);clearTimeout(timeout);console.error(e);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>fs.writeFileSync(path.join(out,'ready.json'),JSON.stringify({pid:process.pid,start:new Date().toISOString(),expiresAt:expiry.toISOString(),port},null,2)));

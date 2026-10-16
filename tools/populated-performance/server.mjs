import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),source=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'artifacts/populated-performance-2026-10-16'),port=4371;
fs.mkdirSync(out,{recursive:true});
const expiry=new Date(process.argv[2]);if(!Number.isFinite(+expiry)||+expiry<=Date.now()||+expiry-Date.now()>86400000)throw Error('Supply expiry within 24 hours');
const build=path.join(root,'.pages-output'),commit=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const originals=new Map(),hashes={};
for(const name of ['battle-3d.js','battle-map.js','hybrid-renderer.js','battle-renderer.js','foliage-obstacles.js','core/visibility.js','light-renderer.js']){
 const data=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'show','034c0b7:dist/tactics/'+name],{cwd:root,encoding:'utf8'});originals.set(name,data);hashes[name]=createHash('sha256').update(data).digest('hex');fs.writeFileSync(path.join(out,'baseline-'+name.replaceAll('/','-')),data);
}
const replace=(text,find,replacement)=>{if(!text.includes(find))throw Error('Instrumentation anchor missing: '+find.slice(0,80));return text.replace(find,replacement);};
function instrument(name,body,detailed,play=false){
 body=body.replaceAll('\r\n','\n');
 if(name==='battle-map.js')return "import {populatedFixture} from './performance-fixture.js';\n"+replace(body,'const token=globalThis.location?','return populatedFixture();\n const token=globalThis.location?');
 if(name==='battle-3d.js'){
  if(play){
   body=replace(body,'function autosave(){','function autosave(){return;');
   const start=body.indexOf("if(new URLSearchParams(location.search).get('study')==='tree-cover'){const {installFoliagePerformanceReview}"),end=body.indexOf('\n',start);
   if(start<0)throw Error('Review installation anchor missing');return body.slice(0,start)+body.slice(end);
  }
  body="import {installInvestigation} from './performance-lab.js';\n"+body;
  body=replace(body,"$('difficulty').value=readSettings().difficulty;","$('difficulty').value='easy';");
  body=replace(body,'function autosave(){','function autosave(){return;');
  body=replace(body,'function frame(now){\n try{','function frame(now){\n if(window.perfLab?.before(now)===false)return;\n try{');
  body=replace(body,'tickEncounterClock(state,elapsed,{paused:paused()||renderer.traversal.busy});','');
  body=replace(body,'if(!paused()&&!renderer.busy&&presentationTime-lastStep>stepDelay){','if(false){');
  body=replace(body,'renderer.foliageSelectedIds=selectedIds;','window.perfLab.step(state,renderer,()=>sync());\n  renderer.foliageSelectedIds=selectedIds;');
  body=replace(body,'  requestAnimationFrame(frame);','  window.perfLab.after(state,renderer);\n  requestAnimationFrame(frame);');
  const start=body.indexOf("if(new URLSearchParams(location.search).get('study')==='tree-cover'){const {installFoliagePerformanceReview}");
  const end=body.indexOf('\n',start);if(start<0)throw Error('Review installation anchor missing');
  body=body.slice(0,start)+'await installInvestigation(window.battle3d);'+body.slice(end);
  if(detailed){body=replace(body,'picks=renderer.draw(ctx,state,view,width,height,level);','window.perfLab.mark("beforeDraw");picks=renderer.draw(ctx,state,view,width,height,level);window.perfLab.mark("afterDraw");');body=replace(body,'if(!paused()&&pickupOrder.pending)','window.perfLab.mark("afterOverlays");if(!paused()&&pickupOrder.pending)');}
 }
 if(detailed&&name==='hybrid-renderer.js'){
  body=replace(body,'  const drawStart=performance.now();','  window.perfLab?.mark("hybridStart");const drawStart=performance.now();');
  body=replace(body,'  const focus=battleFloorPoint','  window.perfLab?.mark("worldReady");const focus=battleFloorPoint');
  body=replace(body,'  const units=editor?','  window.perfLab?.mark("biomesReady");const units=editor?');
  body=replace(body,'  this.wallXray?.update(width','  window.perfLab?.mark("actorsReady");this.wallXray?.update(width');
  body=replace(body,'if(this.lights)this.lights.render','window.perfLab?.mark("lightsReady");if(this.lights)this.lights.render');
  body=replace(body,'ctx.drawImage(this.renderer.domElement','window.perfLab?.mark("webglReady");ctx.drawImage(this.renderer.domElement');
  body=replace(body,'this.drawTimes??=[];','window.perfLab?.mark("copyReady");this.drawTimes??=[];');
 }
 return body;
}
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:'+port),parts=url.pathname.split('/').filter(Boolean),headers={'Cache-Control':'no-store','Document-Policy':'js-profiling','Content-Type':'application/json'};
  if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403).end();return;}
  if(req.method==='POST'&&parts[0]==='results'){
   if(req.headers.origin!=='http://127.0.0.1:'+port||!/^[a-z0-9-]{1,80}$/.test(parts[1]||'')){res.writeHead(403).end();return;}
   let data='',size=0;for await(const part of req){size+=part.length;if(size>25e6)throw Error('Result too large');data+=part;}
   const parsed=JSON.parse(data);fs.writeFileSync(path.join(out,parts[1]+'.json'),JSON.stringify(parsed));res.writeHead(200,headers).end('{"saved":true}');return;
  }
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  if(parts[0]==='manifest'){res.writeHead(200,headers).end(JSON.stringify({commit,hashes,port,expiresAt:expiry.toISOString()}));return;}
  const mode=parts.shift();if(!['baseline','profile','candidate','play'].includes(mode)){res.writeHead(404).end();return;}
  const relative=parts.join('/'),target=path.resolve(build,relative);if(!target.startsWith(build+path.sep)){res.writeHead(403).end();return;}
  const name=relative.startsWith('tactics/')?relative.slice(8):path.basename(target);let data;
  if(relative==='tactics/performance-lab.js')data=fs.readFileSync(path.join(source,'browser.js'));
  else if(relative==='tactics/performance-fixture.js')data=fs.readFileSync(path.join(source,'fixture.js'));
  else if(originals.has(name)&&relative==='tactics/'+name){let body=originals.get(name);if(['candidate','play'].includes(mode))body=fs.readFileSync(path.join(build,'tactics',name),'utf8');data=instrument(name,body,mode==='profile',mode==='play');}
  else data=await fs.promises.readFile(target);
  headers['Content-Type']=({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.wasm':'application/wasm'})[path.extname(target)]||'application/octet-stream';
  res.writeHead(200,headers).end(data);
 }catch(error){res.writeHead(500,{'Content-Type':'text/plain'}).end(error.stack);}
});
let stopping=false;function stop(){if(stopping)return;stopping=true;clearInterval(check);clearTimeout(timeout);server.close(()=>{fs.writeFileSync(path.join(out,'stopped.json'),JSON.stringify({pid:process.pid,stoppedAt:new Date().toISOString()}));});server.closeIdleConnections();}
const check=setInterval(()=>{if(fs.existsSync(path.join(out,'STOP')))stop();},1000),timeout=setTimeout(stop,+expiry-Date.now());
server.on('error',e=>{clearInterval(check);clearTimeout(timeout);console.error(e);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>fs.writeFileSync(path.join(out,'ready.json'),JSON.stringify({pid:process.pid,commit,start:new Date().toISOString(),expiresAt:expiry.toISOString(),port,hashes},null,2)));

import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=new URL('../docs/tactics/hybrid-review/foliage/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),errors=[];
try{
 const p=await browser.newPage({viewport:{width:1400,height:1100}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 await p.goto('http://127.0.0.1:4428/tactics/foliage-study.html');await p.waitForFunction(()=>window.foliageStudy?.ready&&foliageStudy.hybrid.foliageReady);
 for(const scale of ['125','58'])for(const [name,a,e]of [['front',Math.PI/4,Math.PI/6],['rear',Math.PI*1.25,.45],['low',-.5,.20]]){
  await p.locator('#scale').selectOption(scale);await p.evaluate(([a,e])=>foliageStudy.view(a,e),[a,e]);await p.locator('#scene').screenshot({path:fileURLToPath(new URL(`${name}-${scale}.png`,out))});
 }
 const checks=await p.evaluate(async()=>{
  const {buildWorld}=await import('./hybrid-world.js'),{hybrid:h}=foliageStudy;
  const map={terrain:Array.from({length:32},()=>Array(32).fill('ground-grass')),upper:[{'1,1':'ground-grass'}],props:[],edges:{},stairs:[]};for(let y=1;y<32;y+=4)for(let x=1;x<32;x+=4)map.props.push({x,y,kind:(x+y)%8===2?'tree-pine':'tree-broadleaf'});
  const world=buildWorld(map),before=JSON.stringify(world.boxes);h.rebuild(world,null,1,map);h.renderer.render(h.scene,h.camera);const old=[...h.structures.children],memory={...h.renderer.info.memory};h.rebuild(world,null,1,map);const reused=old.every(o=>h.structures.children.includes(o));
  for(let i=0;i<12;i++){map.props[0].rotated=i%2===0;h.rebuild(world,null,1,map);h.renderer.render(h.scene,h.camera);}
  const after={...h.renderer.info.memory},dense=h.stats(),times=[];for(let i=0;i<90;i++){const a=performance.now();foliageStudy.view(i*.018,.5);await new Promise(requestAnimationFrame);times.push(performance.now()-a);}times.sort((a,b)=>a-b);
  const seen=new Set(['0,0']);h.rebuild(world,seen,0,map);const visible=h.structures.children.flatMap(m=>m.userData.boxes),fog=visible.every(b=>b.source.x===0&&b.source.y===0&&(b.source.z||0)===0),grass=visible.filter(b=>b.kind==='grass').length;
  h.rebuild(world,new Set(['1,1,1']),0,map);const upperHidden=h.structures.children.length===0;
  h.rebuild(world,new Set(['1,1,1']),1,map);const upper=h.structures.children.flatMap(m=>m.userData.boxes),upperOnly=upper.length>0&&upper.every(b=>b.source.z===1);
  h.rebuild(foliageStudy.world,null,0,foliageStudy.map);foliageStudy.render();return {reused,memory,after,dense:{calls:dense.calls,triangles:dense.triangles,geometries:dense.geometries,textures:dense.textures},p95:times[Math.floor(times.length*.95)],fog,grass,upperHidden,upperOnly,collisionUnchanged:before===JSON.stringify(world.boxes)};
 });
 assert(checks.reused&&checks.fog&&checks.upperHidden&&checks.upperOnly&&checks.collisionUnchanged);assert(checks.grass>0);assert(checks.after.geometries<=checks.memory.geometries&&checks.after.textures<=checks.memory.textures);
 await p.setViewportSize({width:390,height:844});await p.locator('#scale').selectOption('58');await p.locator('#reset').click();await p.screenshot({path:fileURLToPath(new URL('mobile.png',out))});
 await p.goto('http://127.0.0.1:4428/tactics/environment-gallery.html');await p.waitForFunction(()=>window.environmentWorkshop&&environmentWorkshop.hybrid.foliageReady);
 const catalog=await p.evaluate(()=>{const w=environmentWorkshop;for(const e of w.entries){w.select(e.kind);w.hybrid.renderer.render(w.hybrid.scene,w.hybrid.camera);}return {count:w.entries.length,diagnostics:w.hybrid.diagnostics};});assert.deepEqual(catalog.diagnostics,[]);assert.deepEqual(errors,[]);
 fs.writeFileSync(new URL('browser-checks.json',out),JSON.stringify({browser:browser.version(),checks,catalog,errors},null,2)+'\n');console.log(JSON.stringify({checks,catalog,errors}));
}finally{await browser.close();}

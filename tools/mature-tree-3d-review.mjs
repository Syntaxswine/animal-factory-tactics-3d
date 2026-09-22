import {createRequire} from 'node:module';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),browser=await chromium.launch({channel:'msedge',headless:true});
const out=new URL('../docs/tactics/hybrid-review/mature-tree-integration/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[],report={};
function watch(p){p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});p.on('dialog',d=>d.accept());}
watch(page);const ready=()=>page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading,{},{timeout:120000});
async function cell(x,y){const p=await page.evaluate(async([x,y])=>{const T=await import('./vendor/three.module.js'),c=document.querySelector('#scene'),v=new T.Vector3(x,editor3d.scene.options.level*2.12,y).project(editor3d.scene.camera),b=c.getBoundingClientRect();return {x:b.x+(v.x+1)*b.width/2,y:b.y+(1-v.y)*b.height/2};},[x,y]);await page.mouse.move(p.x,p.y);await page.mouse.click(p.x,p.y);await ready();}
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4430/tactics/editor-3d.html');await ready();await page.click('#new-map');await ready();
 await page.selectOption('#edit-tool','prop');
 for(const [kind,x]of [['tree-broadleaf-large',7],['tree-pine-large',11]]){await page.selectOption('#prop-kind',kind);await cell(x,8);}
 assert.deepEqual(await page.evaluate(()=>editor3d.document.map.props.map(p=>p.kind)),['tree-broadleaf-large','tree-pine-large']);
 await page.selectOption('#edit-tool','inspect');await cell(11,8);await page.click('#rotate-selected');await ready();assert.equal(await page.evaluate(()=>editor3d.document.map.props[1].rotated),true);
 const placed=await page.evaluate(()=>editor3d.export());await page.click('#undo');await ready();assert.equal(await page.evaluate(()=>!!editor3d.document.map.props[1].rotated),false);await page.click('#redo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),placed);
 await page.fill('#design-name','Mature trees integration');await page.click('#save-map');await page.waitForFunction(()=>!editor3d.document.changed);const saved=await page.evaluate(()=>editor3d.export());
 await page.reload();await ready();await page.waitForFunction(()=>document.querySelector('#saved-designs').options.length>0);await page.click('#load-map');await ready();await page.waitForFunction(()=>editor3d.document.map.name==='Mature trees integration');assert.equal(await page.evaluate(()=>editor3d.export()),saved);
 const download=page.waitForEvent('download');await page.click('#export');const file=await download,portable=fs.readFileSync(await file.path(),'utf8');assert.equal(portable,saved);
 await page.click('#new-map');await ready();await page.setInputFiles('#import',{name:'mature-trees.json',mimeType:'application/json',buffer:Buffer.from(portable)});await page.waitForFunction(()=>editor3d.document.map.name==='Mature trees integration');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),saved);
 await page.click('#validate-map');assert.match(await page.locator('#validation').innerText(),/Valid map/);await page.waitForFunction(()=>editor3d.scene.foliageReady);
 report.editor=await page.evaluate(async()=>{
  const T=await import('./vendor/three.module.js'),{environmentVisuals}=await import('./environment-visuals.js'),s=editor3d.scene,expected=environmentVisuals(s.world,editor3d.document.map).filter(b=>b.kind==='prop'),matrix=new T.Matrix4(),q=new T.Quaternion(),yaw=new T.Quaternion(),euler=new T.Euler(),v=new T.Vector3(),scale=new T.Vector3(),actual=[];
  for(const mesh of s.scenery.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);actual.push({matrix:matrix.elements.slice(),geometry:mesh.geometry,material:mesh.material});}
  const matches=expected.map(b=>{q.setFromEuler(euler.set(...b.rotation));q.premultiply(yaw.setFromAxisAngle(new T.Vector3(0,1,0),b.yaw||0));matrix.compose(v.fromArray(b.center),q,scale.fromArray(b.size));return actual.some(a=>a.geometry===s.geometry[b.shape]&&a.material.map===s.foliageTexture&&a.matrix.every((n,i)=>Math.abs(n-matrix.elements[i])<1e-4));});
  return {props:editor3d.document.map.props,parts:expected.length,matched:matches.filter(Boolean).length,diagnostics:s.diagnostics};
 });assert.equal(report.editor.parts,report.editor.matched);assert.deepEqual(report.editor.diagnostics,[]);
 await page.screenshot({path:fileURLToPath(new URL('editor.png',out))});
 const popup=page.waitForEvent('popup');await page.click('#playtest');const fight=await popup;watch(fight);await fight.waitForFunction(()=>window.battle3d?.state&&battle3d.renderer.foliageReady,{},{timeout:120000});
 report.battle=await fight.evaluate(()=>{const s=battle3d.state,r=battle3d.renderer;return {name:s.definition.name,props:s.props,parts:r.structures.children.flatMap(m=>m.userData.boxes||[]).filter(b=>b.kind==='prop').map(b=>({id:b.id,center:b.center,size:b.size,material:b.material})),diagnostics:r.diagnostics};});
 assert.equal(report.battle.name,'Mature trees integration');assert.deepEqual(report.battle.props,report.editor.props);assert.equal(report.battle.parts.length,report.editor.parts);assert.deepEqual(report.battle.diagnostics,[]);
 await fight.screenshot({path:fileURLToPath(new URL('playtest.png',out))});assert.equal(await page.evaluate(()=>editor3d.export()),saved);
 // The real battle renderer must hide unknown trunks, retain only seen trees,
 // and restore the identical mature geometry when the knowledge set is restored.
 report.fog=await fight.evaluate(()=>{const s=battle3d.state,r=battle3d.renderer,world=r.world,old=s.difficulty,count=()=>r.structures.children.flatMap(m=>m.userData.boxes||[]).filter(b=>b.kind==='prop').length;s.difficulty='standard';r.rebuild(world,new Set(),0,s);const hidden=count();r.rebuild(world,new Set(['7,8']),0,s);const one=count();r.rebuild(world,new Set(['7,8','11,8']),0,s);const both=count();s.difficulty=old;r.rebuild(world,s.seen,0,s);return {hidden,one,both};});assert.equal(report.fog.hidden,0);assert(report.fog.one>0&&report.fog.one<report.fog.both);assert.equal(report.fog.both,report.editor.parts);
 await fight.close();
 // Rebuild/floor switching uses the same registered models and dim atlas path.
 report.editorFloors=await page.evaluate(async()=>{const s=editor3d.scene,resources=[];for(let i=0;i<8;i++){s.setOptions({level:i%2});s.draw(editor3d.view,document.querySelector('#scene').clientWidth,document.querySelector('#scene').clientHeight);resources.push({...s.renderer.info.memory});}const dimmed=s.scenery.children.filter(m=>[...s.dimMaterials.values()].includes(m.material)&&m.material.map===s.foliageTexture).length;s.setOptions({level:0});return {resources,dimmed};});assert(report.editorFloors.dimmed>0);assert.deepEqual(report.editorFloors.resources[3],report.editorFloors.resources[7]);
 assert.deepEqual(errors,[]);report.errors=errors;report.browser=browser.version();report.recordedAt=new Date().toISOString();fs.writeFileSync(new URL('browser-checks.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({editor:report.editor,props:report.battle.props,fog:report.fog,errors}));
}finally{await browser.close();}

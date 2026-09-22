import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),out=new URL('../artifacts/foliage-cover/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('dialog',d=>d.accept());
const ready=()=>page.waitForFunction(()=>window.editor3d&&!editor3d.loading);
async function point(x,y){return page.evaluate(async([x,y])=>{const T=await import('./vendor/three.module.js'),c=document.querySelector('#scene'),b=c.getBoundingClientRect(),p=new T.Vector3(x,0,y).project(editor3d.scene.camera);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2};},[x,y]);}
async function stroke(tool,a,b){await page.selectOption('#edit-tool',tool);const p=await point(...a),q=await point(...b);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(q.x,q.y,{steps:8});await page.mouse.up();await ready();}
try{
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4331/tactics/editor-3d.html');await ready();
 await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');const m=blankMap('Foliage cover demonstration');m.starts=[{x:8,y:12},{x:11,y:12},{x:14,y:12},{x:17,y:12}];m.terrain[10][10]='water';m.props=[{x:12,y:15,z:0,kind:'crate-wood'}];await editor3d.open(JSON.stringify(m));Object.assign(editor3d.view,{x:13,y:13,span:20});editor3d.scene.draw(editor3d.view,document.querySelector('#scene').clientWidth,document.querySelector('#scene').clientHeight);});
 const before=await page.evaluate(()=>editor3d.export());await stroke('foliage-cover',[9,9],[18,18]);
 const painted=await page.evaluate(()=>editor3d.export());assert.notEqual(painted,before);assert.equal(await page.evaluate(()=>editor3d.document.map.terrain[10][10]),'water');assert.equal(await page.evaluate(()=>editor3d.document.map.terrain[15][12]),'yard');
 await page.screenshot({path:fileURLToPath(new URL('painted-cover.png',out))});
 await page.click('#undo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),before);await page.click('#redo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),painted);
 await stroke('clear-foliage',[18,18],[9,9]);assert.equal(await page.evaluate(()=>editor3d.document.map.terrain[9][9]),'ground-grass');await page.click('#undo');await ready();assert.equal(await page.evaluate(()=>editor3d.export()),painted);
 // Escape cancels a large rectangle without an edit.
 const a=await point(6,6),b=await point(16,16);await page.selectOption('#edit-tool','foliage-cover');await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.evaluate(()=>editor3d.export()),painted);
 await page.fill('#design-name','Foliage cover demonstration');await page.click('#save-map');await page.waitForFunction(()=>!editor3d.document.changed);await page.click('#validate-map');assert.match(await page.locator('#validation').textContent(),/Valid map/);
 const popup=page.waitForEvent('popup');await page.click('#playtest');const fight=await popup;fight.on('pageerror',e=>errors.push(e.message));await fight.waitForFunction(()=>window.battle3d?.renderer.models.size>=4);await fight.screenshot({path:fileURLToPath(new URL('battle-cover.png',out))});assert.equal(await fight.evaluate(()=>battle3d.state.map[9][9]),'woodland');await fight.close();
 // Repeated repainting keeps GPU resources stable. A 64x64 patch checks broad-area editing.
 const stress=await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');await editor3d.open(JSON.stringify(blankMap('Large foliage test')));const c={tool:'foliage-cover',start:{x:30,y:30,z:0},end:{x:93,y:93,z:0}};const start=performance.now();await editor3d.apply(c);Object.assign(editor3d.view,{x:62,y:62,span:90});const canvas=document.querySelector('#scene');editor3d.scene.draw(editor3d.view,canvas.clientWidth,canvas.clientHeight);const first={...editor3d.scene.renderer.info.memory},times=[];for(let i=0;i<4;i++){await editor3d.apply({...c,tool:'clear-foliage'});await editor3d.apply(c);const t=performance.now();editor3d.scene.draw(editor3d.view,canvas.clientWidth,canvas.clientHeight);times.push(performance.now()-t);}return {milliseconds:performance.now()-start,first,last:{...editor3d.scene.renderer.info.memory},instances:editor3d.scene.scenery.children.reduce((n,m)=>n+m.count,0),triangles:editor3d.scene.renderer.info.render.triangles,calls:editor3d.scene.renderer.info.render.calls,drawMs:times};});
 assert.deepEqual(stress.first,stress.last);assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',out),JSON.stringify({uiStroke:true,undoRedo:true,cancel:true,playtest:true,stress,errors},null,2));console.log(JSON.stringify({stress,errors}));
 // Leave a useful inspection screenshot at the near gameplay scale.
 await page.evaluate(async text=>{await editor3d.open(text);Object.assign(editor3d.view,{x:13,y:13,span:14});editor3d.scene.draw(editor3d.view,document.querySelector('#scene').clientWidth,document.querySelector('#scene').clientHeight);},painted);
 await page.screenshot({path:fileURLToPath(new URL('cover-detail.png',out))});
}finally{await browser.close();}

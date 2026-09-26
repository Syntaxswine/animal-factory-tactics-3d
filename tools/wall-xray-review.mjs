import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:950},deviceScaleFactor:2}),errors=[];
const output=new URL('../artifacts/wall-xray/',import.meta.url);fs.mkdirSync(output,{recursive:true});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const root=process.env.REVIEW_URL||'http://127.0.0.1:4438';
try{
 await page.goto(root+'/tactics/battle-3d.html?study=wall-xray');await page.waitForFunction(()=>window.battle3d?.renderer.models.size===4);await page.click('#pause');
 const box=await page.locator('#battle').boundingBox();
 const cursor=await page.evaluate(()=>{const p=battle3d.project(battle3d.state.units[0]);return {x:p.x,y:p.y-23};});
 await page.screenshot({path:fileURLToPath(new URL('solid.png',output))});
 await page.evaluate(()=>{const c=battle3d.renderer.renderer.domElement;const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d');ctx.drawImage(c,0,0);window.solidImage=ctx.getImageData(0,0,c.width,c.height).data;});
 await page.mouse.move(box.x+cursor.x,box.y+cursor.y);await page.waitForFunction(()=>battle3d.renderer.wallXray.uniforms.xrayActive.value);await page.waitForTimeout(150);
 const pixels=await page.evaluate(()=>{const r=battle3d.renderer,c=r.renderer.domElement,out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d');ctx.drawImage(c,0,0);const after=ctx.getImageData(0,0,c.width,c.height).data,u=r.wallXray.uniforms;let inside=0,outside=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(after[i]===solidImage[i]&&after[i+1]===solidImage[i+1]&&after[i+2]===solidImage[i+2])continue;if(Math.hypot(x-u.xrayCenter.value.x,c.height-y-u.xrayCenter.value.y)<=u.xrayRadius.value+2)inside++;else outside++;}return {inside,outside};});
 assert.ok(pixels.inside>1000);assert.equal(pixels.outside,0);
 await page.screenshot({path:fileURLToPath(new URL('xray.png',output))});
 const radius=await page.evaluate(()=>battle3d.renderer.wallXray.uniforms.xrayRadius.value);await page.mouse.wheel(0,-400);await page.waitForTimeout(120);assert.ok(await page.evaluate(()=>battle3d.renderer.wallXray.uniforms.xrayRadius.value)>radius);
 await page.click('#center');await page.mouse.move(20,25);await page.waitForFunction(()=>!battle3d.renderer.wallXray.uniforms.xrayActive.value);
 // Find exposed door wire/surface space without an actor or loot in front of it.
 const door=await page.evaluate(async()=>{const T=await import('./vendor/three.module.js'),r=battle3d.renderer,c=document.getElementById('battle');for(let y=.1;y<1.6;y+=.1)for(let z=5.55;z<6.46;z+=.05){const p=new T.Vector3(8.58,y,z).project(r.camera),x=(p.x+1)*c.clientWidth/2,sy=(1-p.y)*c.clientHeight/2;if(r.pickDoor(x,sy,c.clientWidth,c.clientHeight,0)==='e:8:6'&&r.pick(x,sy,c.clientWidth,c.clientHeight)===null&&!r.pickLoot(x,sy,c.clientWidth,c.clientHeight))return {x,y:sy};}return null;});assert.ok(door);
 await page.click('#pause');await page.mouse.click(box.x+door.x,box.y+door.y);await page.waitForFunction(()=>battle3d.state.units[0].x===9&&battle3d.state.edges['e:8:6']==='doorway-concrete-open');await page.click('#pause');
 const visibility=await page.evaluate(async()=>{const s=battle3d.state,r=battle3d.renderer;s.units.push({...structuredClone(s.units[0]),id:99,team:'guard',x:7,y:7,hp:100});s.detected.delete(99);s.visible.delete('7,7');const pile={x:7,y:7,z:0,items:[{type:'ammo',kind:'rifle',count:5}]};s.loot.push(pile);window.hiddenPile=pile;return true;});assert.ok(visibility);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>battle3d.renderer.actors.get(99)?.visible||battle3d.renderer.loot.models.has(hiddenPile)||false),false);
 const memory=await page.evaluate(()=>({...battle3d.renderer.renderer.info.memory}));for(let i=0;i<20;i++)await page.mouse.move(box.x+350+i*8,box.y+450);assert.deepEqual(await page.evaluate(()=>({...battle3d.renderer.renderer.info.memory})),memory);
 // Fog masks wall batches before X-ray attaches; unknown walls remain absent.
 await page.evaluate(()=>{const s=battle3d.state;s.difficulty='standard';s.seen=new Set(['8,6']);battle3d.renderer.world=null;});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>[...battle3d.renderer.chunks.values()].flatMap(m=>m.userData.boxes).some(b=>b.source.edge==='s:6:8')),false);
 await page.selectOption('#floor','1');await page.waitForTimeout(100);await page.selectOption('#floor','0');await page.waitForTimeout(100);
 await page.setViewportSize({width:390,height:844});await page.mouse.move(50,250);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:fileURLToPath(new URL('mobile.png',output))});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pixels,doorClick:'passed',hiddenActorsAndLoot:'passed',fogWalls:'passed',zoomAndExit:'passed',highDPI:true,mobile:true,memory,errors}));
}finally{await browser.close();}

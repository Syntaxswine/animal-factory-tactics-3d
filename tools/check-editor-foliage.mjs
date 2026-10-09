import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {blankMap} from '../dist/tactics/core/maps.js';
import {extractBlock} from '../dist/tactics/core/blocks.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {launchBattleReview} from './battle-review-browser.mjs';

const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const origin=process.env.REVIEW_URL||'http://127.0.0.1:4363',out=path.resolve(import.meta.dirname,'../artifacts/editor-foliage');fs.mkdirSync(out,{recursive:true});
const map=blankMap('Foliage · raised terrain review');map.terrain.forEach(row=>row.fill('ground-grass'));
const doc=new EditingDocument().open(JSON.stringify(map));
for(const [height,size]of [[1,17],[2,9]]){const r=doc.apply({tool:'land',start:{x:12,y:12,z:0},options:{landHeight:height,landSize:size,landShape:'square',groundKind:'ground-grass'}});assert.ok(r.ok,r.error);}
const block=extractBlock(doc.map),report={checks:[],errors:[]},review=await launchBattleReview(chromium,'editor-foliage');
try{
 const page=await review.browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(origin+'/tactics/editor-3d.html?editing=1');await page.waitForFunction(()=>window.editor3d&&!editor3d.loading,null,{timeout:60000});
 await page.evaluate(async data=>{await editor3d.open(JSON.stringify(data));Object.assign(editor3d.view,{x:11.5,y:11.5,span:28});await editor3d.changed();},block);
 await page.waitForFunction(()=>editor3d.scene.foliageReady);
 await page.click('[data-group="foliage"]');await page.selectOption('#stroke-mode','rectangle');assert.equal(await page.locator('#foliage-kind').inputValue(),'dense');
 assert.equal(await page.locator('#foliage-options').isVisible(),true);
 const project=async p=>page.evaluate(async p=>{const {Vector3}=await import('./vendor/three.module.js'),r=document.getElementById('scene').getBoundingClientRect(),q=new Vector3(p.x,p.z*2.12,p.y).project(editor3d.scene.camera);return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2};},p);
 for(const [z,a,b,kind,terrain]of [[1,[6,6],[10,7],'dense','woodland-dense'],[2,[10,10],[14,12],'undergrowth','woodland']]){
  await page.click(`[data-level="${z}"]`);await page.selectOption('#foliage-kind',kind);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const start=await project({x:a[0],y:a[1],z}),end=await project({x:b[0],y:b[1],z});
  await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:5});await page.mouse.up();
  await page.waitForFunction(({x,y,z,terrain})=>!editor3d.loading&&editor3d.document.map.upper[z-1][`${x},${y}`]===terrain,{x:b[0],y:b[1],z,terrain});
  const painted=await page.evaluate(()=>editor3d.export());await page.click('#undo');await page.waitForFunction(()=>!editor3d.loading);assert.notEqual(await page.evaluate(()=>editor3d.export()),painted);await page.click('#redo');await page.waitForFunction(()=>!editor3d.loading);assert.equal(await page.evaluate(()=>editor3d.export()),painted);
  report.checks.push(`Level ${z+1}: real rectangle drag paints ${kind}; undo and redo restore it.`);
 }
 await page.mouse.move(1400,180);await page.screenshot({path:path.join(out,'upper-level-foliage.png')});
 const exported=await page.evaluate(()=>editor3d.export());await page.evaluate(async text=>editor3d.open(text),exported);assert.equal(await page.evaluate(()=>editor3d.export()),exported);report.checks.push('Editor block export/import retains both upper-level foliage types.');
 assert.deepEqual(await page.evaluate(()=>editor3d.scene.diagnostics),[]);
 // Review the actual tutorial rim as well as the small UI fixture, without writing it.
 await page.evaluate(async()=>{const r=await fetch('./sector-library/tutorial-step-1/rough-plateau.json');if(!r.ok)throw Error('Tutorial fixture: '+r.status);await editor3d.open(await r.text());const cliffs=editor3d.document.map.props.filter(p=>p.kind==='cliff-ledge'&&p.z===1&&p.x>60&&p.x<140);const p=cliffs[Math.floor(cliffs.length/2)];if(!p)throw Error('Tutorial cliff not found');Object.assign(editor3d.view,{x:p.x,y:p.y,span:25});await editor3d.changed();});
 await page.click('[data-level="2"]');await page.mouse.move(1400,180);await page.waitForFunction(()=>editor3d.scene.foliageReady);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:path.join(out,'tutorial-cliff-grass.png')});
 assert.deepEqual(await page.evaluate(()=>editor3d.scene.diagnostics),[]);report.checks.push('Authored tutorial renders both closed tiers with the shared grass atlas and no missing scene assets.');
 const gameMap=structuredClone(doc.map);gameMap.terrain[3][8]='woodland-dense';gameMap.upper[0]['6,6']='woodland-dense';gameMap.upper[1]['12,12']='woodland';
 const fight=await review.browser.newPage({viewport:{width:1500,height:1000}});fight.on('pageerror',e=>report.errors.push(e.message));fight.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await fight.route('**/default-factory.json',r=>r.fulfill({json:gameMap}));await fight.goto(origin+'/tactics/battle-3d.html');
 await fight.waitForFunction(()=>window.battle3d?.renderer.models.size>=4&&!battle3d.renderer.busy,null,{timeout:60000});await fight.click('#pause');
 const gameplay=await fight.evaluate(async()=>{const {pathTo}=await import('./core/engine.js'),r=battle3d.renderer,s=battle3d.state;return {terrain:s.map[3][8],blocked:pathTo(s,s.units[0],8,3,0)===null,sharedGrass:r.cliffs.parts.every(p=>p.original[1].map===r.material('grass').map),diagnostics:r.diagnostics};});
 assert.equal(gameplay.terrain,'woodland-dense');assert.equal(gameplay.blocked,true);assert.equal(gameplay.sharedGrass,true);assert.deepEqual(gameplay.diagnostics,[]);report.checks.push('Quick Fight loads dense and upper foliage, blocks movement into dense fill, and renders the same grass on cliffs.');
 assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));await review.closeReview();}

import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.REVIEW_URL||'http://127.0.0.1:4425/tactics/editor-3d.html');
 await page.waitForFunction(()=>window.editor3d&&!editor3d.loading);
 await page.evaluate(async()=>{const {blankMap}=await import('./core/maps.js');const m=blankMap('Foliage review');m.props=[{kind:'tree-pine',x:8,y:8},{kind:'tree-broadleaf',x:11,y:8}];await editor3d.open(JSON.stringify(m));editor3d.view.x=9;editor3d.view.y=8;editor3d.view.span=12;});
 await page.waitForFunction(()=>editor3d.scene.foliageReady);
 const result=await page.evaluate(()=>{const s=editor3d.scene; s.draw(editor3d.view,1000,900);const kinds=['pine','bark','leaf-light','grass'];const painted=kinds.every(k=>s.materials.get(k)?.customProgramCacheKey().startsWith('painted-foliage'));s.options.level=1;s.rebuild();s.draw(editor3d.view,1000,900);const dimmed=kinds.every(k=>s.dimMaterials.get(s.materials.get(k))?.customProgramCacheKey().endsWith('-inspection-dim'));s.options.level=0;s.rebuild();s.draw(editor3d.view,1000,900);return {painted,dimmed,diagnostics:s.diagnostics};});
 assert.equal(result.painted,true);assert.equal(result.dimmed,true);assert.deepEqual(result.diagnostics,[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}

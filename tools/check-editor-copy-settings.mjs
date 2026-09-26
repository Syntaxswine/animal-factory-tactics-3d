import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4323/tactics/editor-3d.html?editing=1');
 await page.waitForFunction(()=>window.editor3d?.document&&!editor3d.loading);
 const roofs=['roof-corrugated-sloped','roof-corrugated-flat','roof-flat-parapet','roof-climbable-corrugated-sloped','roof-climbable-corrugated-flat','roof-climbable-flat-parapet'];
 for(const [i,kind] of [...roofs,'table-wood'].entries()){
  const roof=kind.startsWith('roof-'),z=roof?1:0,x=10+i*3;
  assert((await page.evaluate(async({kind,roof,z,x})=>editor3d.apply({tool:roof?'roof-tile':'prop',start:{x,y:10,z},options:{propKind:kind,rotated:true}}),{kind,roof,z,x})).ok);
  // Leave the shared variant dropdown filtered to the opposite category.
  await page.click(`[data-group=${roof?'objects':'roofs'}]`);
  await page.click('[data-group=inspect]');
  await page.evaluate(({x,z})=>editor3d.select(editor3d.inspect(x,10,z,{mode:'prop'})),{x,z});
  await page.click('#use-selected');
  assert.equal(await page.inputValue('#edit-tool'),roof?'roof-tile':'prop');
  assert.equal(await page.inputValue('#prop-kind'),kind,`Copy must preserve ${kind} after switching categories`);
  assert.equal(await page.isChecked('#rotated'),true);
  assert.equal(await page.locator(`[data-group=${roof?'roofs':'objects'}]`).getAttribute('aria-pressed'),'true');
 }
 assert.deepEqual(errors,[]);console.log('Copy preserves all six roof variants and objects across filtered categories, including rotation.');
}finally{await browser.close();}

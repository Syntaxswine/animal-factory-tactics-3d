import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),id=process.env.REVIEW_ANIMAL||'horse',out=new URL('../artifacts/animal-stance/'+id+'/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1090}}),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 for(const outfit of ['normal','red-hats']){
  await page.goto((process.env.REVIEW_URL||'http://127.0.0.1:4431/tactics/animal-stance-review.html')+'?animal='+id+'&outfit='+outfit);
  await page.waitForFunction(()=>window.stanceStudy?.ready);
  for(const target of ['level','near','high'])for(const scale of ['130','58']){
   await page.selectOption('#target',target);await page.selectOption('#scale',scale);
   const rows=await page.evaluate(()=>stanceStudy.rows);for(const r of rows)for(const c of r.contacts)assert.ok(c.error<1e-6);
   await page.screenshot({path:fileURLToPath(new URL(`${outfit}-${target}-${scale}.png`,out))});results.push({outfit,target,scale,rows});
  }
  for(const scale of ['130','58']){await page.selectOption('#scale',scale);await page.evaluate(()=>stanceStudy.sequence());await page.screenshot({path:fileURLToPath(new URL(`${outfit}-transition-${scale}.png`,out))});}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(new URL('results.json',out),JSON.stringify({id,results,errors},null,2));console.log(JSON.stringify({id,configurations:results.length,errors}));
}finally{await browser.close();}

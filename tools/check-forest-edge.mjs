import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve('artifacts/forest-edge/builder');fs.mkdirSync(output,{recursive:true});
const owner=await launchSiteReview(chromium,'forest-edge-'+Date.now(),'forest-edge'),report={views:[],errors:[]};
try{
 const page=await owner.browser.newPage({viewport:{width:1500,height:1080}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto('http://127.0.0.1:4476/tactics/biome-terrain-study.html?frame=boundary&scale=game');await page.waitForFunction(()=>window.biomeTerrainReady,null,{timeout:120000});
 async function capture(name,options){
  const state=await page.evaluate(async options=>{biomeTerrainStudy.set(options);await biomeTerrainStudy.terrain.groundSkin.whenReady();biomeTerrainStudy.render();return biomeTerrainState;},options);
  await page.screenshot({path:path.join(output,name+'.png')});report.views.push({name,...state});return state;
 }
 for(const biome of ['temperate','jungle','snow','dry','wetlands']){
  const before=await capture(biome+'-before',{biome,edges:false,grid:false,scale:'game',view:'three',frame:'boundary'});
  const after=await capture(biome+'-game',{edges:true});assert.equal(after.stats.blockedCells,before.stats.blockedCells);assert.equal(after.stats.baseTriangles,before.stats.baseTriangles);assert.equal(after.ppu,32);
  await capture(biome+'-grid',{grid:true});await capture(biome+'-top',{view:'top'});await capture(biome+'-close',{grid:false,scale:'close',view:'three'});
 }
 await page.evaluate(()=>biomeTerrainStudy.dispose());await page.close();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');assert.deepEqual(report.errors,[]);console.log(JSON.stringify({views:report.views.length,errors:report.errors,output},null,2));
}finally{await owner.closeReview();}

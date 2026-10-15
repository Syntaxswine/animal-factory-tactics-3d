// Refresh provenance only after independently repainting every exported sheet
// and verifying that its decoded pixels are unchanged. Tree-paint edits share
// a source file with ground paint, but need not rewrite unchanged ground art.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {decodePNG} from './png-rgba.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH||'playwright'),root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'dist/assets/environment/connected-ground'),out=path.join(root,'artifacts/foliage-skins/ground-provenance'),origin=process.env.REVIEW_URL||'http://127.0.0.1:4476';
fs.mkdirSync(out,{recursive:true});const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'))),server=await chromium.launchServer({channel:'msedge',headless:true});let browser;
const pid=server.process().pid,identity=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object Id,Path,@{n='creationFiletime';e={$_.StartTime.ToUniversalTime().ToFileTimeUtc().ToString()}} | ConvertTo-Json`],{encoding:'utf8'}));
fs.writeFileSync(path.join(out,'helper.json'),JSON.stringify({identity,owner:'01a0b02d-63dc-7810-b02c-35f4aa80f344',task:'foliage-skins',purpose:'Pixel-check unchanged ground exports before refreshing source fingerprints',startedAt:new Date().toISOString(),end:'Finally closes browser and launch server'},null,2));
const results=[];
try{
 browser=await chromium.connect(server.wsEndpoint());const page=await browser.newPage();
 await page.route('**/foliage-export-harness',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Ground export verification</title>'}));
 await page.goto(origin+'/foliage-export-harness');
 for(const asset of manifest.assets){
  const png=await page.evaluate(async({asset,seed})=>{
   const {tutorialFoliagePlan}=await import('/tactics/biome-terrain-plan.js'),{createGroundComposition}=await import('/tactics/biome-ground-composition.js'),{paintGroundRegion,releaseGroundPaint}=await import('/tactics/biome-connected-ground.js');
   const map=await (await fetch('/tactics/sector-library/tutorial-step-1/rough-plateau.json')).json(),composition=createGroundComposition(tutorialFoliagePlan(map),asset.family,seed),canvas=document.createElement('canvas');
   try{paintGroundRegion(composition,{x:asset.origin[0],z:asset.origin[1],width:8,depth:8,pixelsPerTile:64},canvas);return canvas.toDataURL();}
   finally{releaseGroundPaint(composition);canvas.width=canvas.height=1;}
  },{asset,seed:manifest.seed});
  const previous=decodePNG(fs.readFileSync(path.join(folder,asset.file))),next=decodePNG(Buffer.from(png.split(',')[1],'base64'));
  assert.equal(next.width,previous.width);assert.equal(next.height,previous.height);assert.deepEqual(next.pixels,previous.pixels,asset.family+' ground pixels changed; perform an explicit art re-export instead');
  results.push({family:asset.family,identicalPixels:true,pixels:next.width*next.height});console.log(asset.family+': identical decoded pixels');
 }
 for(const file of Object.keys(manifest.sourceHashes))manifest.sourceHashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'dist/tactics',file),'utf8').replaceAll('\r\n','\n')).digest('hex');
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results,sourceHashes:manifest.sourceHashes},null,2));
}finally{try{await browser?.close();}finally{await server.close();fs.writeFileSync(path.join(out,'helper-closed.json'),JSON.stringify({identity,closedAt:new Date().toISOString(),exitCode:server.process().exitCode},null,2));}}

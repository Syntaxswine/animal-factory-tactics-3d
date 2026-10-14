// Uses the retained study server; the temporary browser closes in finally.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {launchSiteReview} from './site-review-browser.mjs';
import {GROUND_SPRITE_SEED,GROUND_SPRITE_ATLAS,GROUND_SPRITE_FAMILIES,groundSpriteRecipes} from '../dist/tactics/biome-ground-sprite-layout.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/baals/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(import.meta.dirname,'..'),output=path.join(root,'dist/assets/environment/biome-ground-sprites');fs.mkdirSync(output,{recursive:true});
const sha=data=>crypto.createHash('sha256').update(data).digest('hex'),sourceFiles=['dist/tactics/biome-ground-sprite-layout.js','dist/tactics/biome-ground-sprites.js'];
const manifest={version:1,seed:GROUND_SPRITE_SEED,atlas:GROUND_SPRITE_ATLAS,tileWorldUnits:1,alpha:true,sourceHashes:Object.fromEntries(sourceFiles.map(f=>[f,sha(fs.readFileSync(path.join(root,f),'utf8').replaceAll('\r\n','\n'))])),assets:[],notes:['Panels 0–15 span eight tiles; panels 16–31 span three tiles.','Paint overlays the existing ground pattern. It adds no geometry, collisions or shadows.','Use the seeded placement function to keep complete sprites on one blocked elevation. Do not tile each panel once per ground tile.','The first two atlas rows contain deadfall and branch arrangements; the last two contain smaller litter.']};
const owner=await launchSiteReview(chromium,'export-ground-sprites-'+Date.now(),'biome-ground-sprites');
try{
 const page=await owner.browser.newPage();await page.goto(process.env.BIOME_TERRAIN_URL||'http://127.0.0.1:4476/tactics/biome-terrain-study.html?frame=ground');await page.waitForFunction(()=>window.biomeTerrainReady,{timeout:60000});
 for(const family of GROUND_SPRITE_FAMILIES){
  const data=await page.evaluate(async({family,seed})=>{const {groundSpriteRecipes}=await import('./biome-ground-sprite-layout.js'),{paintGroundSpriteAtlas}=await import('./biome-ground-sprites.js'),canvas=document.createElement('canvas');paintGroundSpriteAtlas(groundSpriteRecipes(family,seed),canvas);const data=canvas.toDataURL();canvas.width=canvas.height=1;return data;},{family,seed:GROUND_SPRITE_SEED});
  const file=family+'-sprites.png',bytes=Buffer.from(data.split(',')[1],'base64');fs.writeFileSync(path.join(output,file),bytes);manifest.assets.push({family,file,sha256:sha(bytes),panels:groundSpriteRecipes(family)});
 }
 await page.evaluate(()=>biomeTerrainStudy.dispose());await page.close();fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Exported five procedural ground sheets to '+output);
}finally{await owner.closeReview();}

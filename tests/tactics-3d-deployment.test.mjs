import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {checkModuleClosure} from '../tools/check-module-closure.mjs';

test('3D distribution includes the entire encounter, editor, title and overmap module graphs',()=>{
 execFileSync(process.execPath,['tools/build-tactics-3d.mjs'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
 for(const file of ['tactics/loading-screen-study.html','tactics/loading-screen.css','tactics/loading-screen.js','tactics/loading-screen-study.js','assets/ui/loading-screen/command-room-v1.png','assets/ui/loading-screen/PROMPT.json'])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/'+file,import.meta.url)));
 for(const file of ['biome-foliage-data.js','biome-foliage-models.js','biome-foliage-paint.js','biome-foliage-study.js','biome-foliage-study.html','biome-foliage-study.css'])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/tactics/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
 const biomeSource=new URL('../dist/assets/environment/biome-foliage/',import.meta.url),biomeOutput=new URL('../.pages-output/assets/environment/biome-foliage/',import.meta.url);
 for(const file of fs.readdirSync(biomeSource,{recursive:true}).filter(file=>fs.statSync(new URL(file.replaceAll('\\','/'),biomeSource)).isFile()))assert.deepEqual(fs.readFileSync(new URL(file.replaceAll('\\','/'),biomeOutput)),fs.readFileSync(new URL(file.replaceAll('\\','/'),biomeSource)));
 for(const file of ['biome-atlas-lod.js','biome-obstacle-data.js','biome-obstacle-paint.js','biome-obstacles.js','biome-terrain-plan.js','biome-terrain.js','biome-terrain-fill.js','biome-ground-sprite-layout.js','biome-ground-sprites.js','biome-ground-composition.js','biome-ground-edge.js','biome-connected-ground.js','biome-ground-worker.js','biome-terrain-study.js','biome-terrain-study.html'])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/tactics/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
 for(const file of ['reference-v1.png','paint-atlas-v1.png','PROMPTS.json'])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/environment/biome-obstacles/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/assets/environment/biome-obstacles/'+file,import.meta.url)));
 for(const file of ['manifest.json',...['temperate','jungle','snow','dry','wetlands'].map(f=>f+'-sprites.png')])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/environment/biome-ground-sprites/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/assets/environment/biome-ground-sprites/'+file,import.meta.url)));
 for(const file of ['manifest.json',...['temperate','jungle','snow','dry','wetlands'].map(f=>f+'-joined-tiles.png')])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/environment/connected-ground/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/assets/environment/connected-ground/'+file,import.meta.url)));
 for(const name of ['reference-v1.png','paint-atlas-v1.png','PROMPTS.json'])assert.deepEqual(
  fs.readFileSync(new URL('../.pages-output/assets/environment/utility-helicopter/'+name,import.meta.url)),
  fs.readFileSync(new URL('../dist/assets/environment/utility-helicopter/'+name,import.meta.url))
 );
 assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/environment/ground-dirt.png',import.meta.url)),fs.readFileSync(new URL('../dist/assets/environment/ground-dirt.png',import.meta.url)));
 assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/effects/painted-fire/smoke-atlas-v1.png',import.meta.url)),fs.readFileSync(new URL('../dist/assets/effects/painted-fire/smoke-atlas-v1.png',import.meta.url)));
 for(const file of ['tactics/intro-study.html','tactics/intro-study.css','tactics/intro-study.js','tactics/hen-10k-data.json','assets/characters/lowpoly-proof/hen-underlay-paint-v1.png','assets/characters/lowpoly-proof/hen-tail-paint-v1.png'])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/'+file,import.meta.url)),fs.readFileSync(new URL('../dist/'+file,import.meta.url)));
});
test('deployment validation catches missing transitive and worker imports while handling cycles',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tactics-module-check-')),root=pathToFileURL(dir+path.sep);
 try{
  fs.writeFileSync(new URL('entry.js',root),"import './journey.js'; new Worker(new URL('./worker.js',import.meta.url));");
  fs.writeFileSync(new URL('journey.js',root),"export {x} from './entry.js'; import('./rig.js');");
  assert.throws(()=>checkModuleClosure(root,['entry.js']),/rig\.js/);
  fs.writeFileSync(new URL('rig.js',root),'');
  assert.throws(()=>checkModuleClosure(root,['entry.js']),/worker\.js/);
  fs.writeFileSync(new URL('worker.js',root),'');
  assert.equal(checkModuleClosure(root,['entry.js']),4);
 }finally{
  for(const name of ['entry.js','journey.js','rig.js','worker.js'])fs.rmSync(new URL(name,root),{force:true});
  fs.rmdirSync(dir);
 }
});

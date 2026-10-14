import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {checkModuleClosure} from '../tools/check-module-closure.mjs';

test('3D distribution includes the encounter, editor, title, overmap and sprite intro',()=>{
 execFileSync(process.execPath,['tools/build-tactics-3d.mjs'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
 for(const name of ['reference-v1.png','paint-atlas-v1.png','PROMPTS.json'])assert.deepEqual(
  fs.readFileSync(new URL('../.pages-output/assets/environment/utility-helicopter/'+name,import.meta.url)),
  fs.readFileSync(new URL('../dist/assets/environment/utility-helicopter/'+name,import.meta.url))
 );
 assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/environment/ground-dirt.png',import.meta.url)),fs.readFileSync(new URL('../dist/assets/environment/ground-dirt.png',import.meta.url)));
 assert.deepEqual(fs.readFileSync(new URL('../.pages-output/assets/effects/painted-fire/smoke-atlas-v1.png',import.meta.url)),fs.readFileSync(new URL('../dist/assets/effects/painted-fire/smoke-atlas-v1.png',import.meta.url)));
 // Exercise the published files, including binary sheets and JSON manifests;
 // a passing source-level intro test cannot detect an omitted Pages folder.
 const intro=new URL('../dist/tactics/intro-sprites/',import.meta.url);
 for(const relative of fs.readdirSync(intro,{recursive:true})){
  const source=new URL(relative.replaceAll(path.sep,'/'),intro);
  if(!fs.statSync(source).isFile())continue;
  assert.deepEqual(fs.readFileSync(new URL('../.pages-output/tactics/intro-sprites/'+relative.replaceAll(path.sep,'/'),import.meta.url)),fs.readFileSync(source),relative);
 }
 for(const relative of [
  'tactics/sector-library/tutorial-step-1/rough-plateau.json',
  'assets/environment/ground-grass.png',
  'assets/environment/foliage/tree-pine.png',
  'assets/environment/foliage/tree-broadleaf.png',
  'assets/environment/foliage/bush.png',
 ])assert.deepEqual(fs.readFileSync(new URL('../.pages-output/'+relative,import.meta.url)),fs.readFileSync(new URL('../dist/'+relative,import.meta.url)),relative);
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

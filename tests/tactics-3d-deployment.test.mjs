import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {checkModuleClosure} from '../tools/check-module-closure.mjs';

test('3D distribution includes the entire encounter, editor and title module graphs',()=>{
 execFileSync(process.execPath,['tools/build-tactics-3d.mjs'],{cwd:new URL('../',import.meta.url),stdio:'pipe'});
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

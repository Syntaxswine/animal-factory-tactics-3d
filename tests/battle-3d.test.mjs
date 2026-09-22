import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createGame,move,stepMovement} from '../dist/tactics/core/engine.js';
import {factoryMap} from '../dist/tactics/core/maps.js';
import {terrainKnown,personVisible} from '../dist/tactics/battle-visibility.js';

test('3D simulation dependency matches the pinned modules and recorded clock adapters',()=>{
 const root=new URL('../dist/tactics/core/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
 assert.equal(manifest.revision,'e529f4b3d512d32cea522d701d01ebe8488af013');
 assert.deepEqual(Object.keys(manifest.overrides),['engine.js','environment.js','explosives.js','maps.js','projectiles.js','world.js']);
 for(const [file,hash]of Object.entries(manifest.files))assert.equal(createHash('sha256').update(fs.readFileSync(new URL(file,root))).digest('hex'),hash,file);
});
test('Easy reveals distant scenery without revealing people or changing perception',()=>{
 const easy=createGame(1947,factoryMap(),true,'easy'),standard=createGame(1947,factoryMap(),true,'standard');
 assert.equal(terrainKnown(easy,'239,239'),true);assert.equal(terrainKnown(standard,'239,239'),false);
 assert.deepEqual(easy.visible,standard.visible);assert.deepEqual(easy.detected,standard.detected);assert.deepEqual(easy.seen,standard.seen);
 const hidden={id:99,team:'guard',hp:45,x:239,y:239,z:0};
 assert.equal(personVisible(easy,hidden),false);assert.equal(personVisible(easy,{...hidden,hp:0}),false);
 easy.detected.add(99);assert.equal(personVisible(easy,hidden),true);
 easy.detected.delete(99);assert.equal(personVisible(easy,hidden),false);
 assert.equal(personVisible(easy,{...hidden,team:'squad'}),true);
 assert.equal(personVisible(easy,{...hidden,team:'squad',away:true}),false);
});
test('presentation queries cannot alter a deterministic movement replay',()=>{
 const a=createGame(1947,factoryMap(),true,'easy'),b=structuredClone(a);
 for(const s of [a,b])assert.ok(move(s,s.units[0],4,4));
 while(a.queue.length){for(const u of a.units)personVisible(a,u);terrainKnown(a,'239,239');stepMovement(a);}
 while(b.queue.length)stepMovement(b);
 assert.deepEqual(a,b);
});

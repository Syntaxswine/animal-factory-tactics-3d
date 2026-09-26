import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBattleMap} from '../dist/tactics/battle-map.js';
import {cargoPlacements,PAINTED_PROP_FORMS} from '../dist/tactics/battle-environment.js';
const raw=fs.readFileSync(new URL('../dist/tactics/default-factory.json',import.meta.url),'utf8');
test('encounter loads the complete authored factory rather than the training template',async()=>{
 const map=await loadBattleMap(async()=>({ok:true,text:async()=>raw}));
 const authored=JSON.parse(raw);
 assert.equal(map.guards.length,36);assert.ok(map.props.length>=398);assert.equal(Object.keys(map.edges).length,1576);
 // The shipped map has gained props since the historical Factory-test backup.
 // Verify the complete shipped data rather than pinning that old backup's count.
 for(const field of ['props','guards','edges','terrain','upper'])assert.deepEqual(map[field],authored[field],field);
});
test('a missing or malformed authored map fails visibly instead of falling back',async()=>{
 await assert.rejects(loadBattleMap(async()=>({ok:false,status:404})),/Authored factory map/);
 await assert.rejects(loadBattleMap(async()=>({ok:true,text:async()=>'{broken'})));
});
test('all authored cargo uses footprint-compatible painted replacements without mutating map data',()=>{
 const map=JSON.parse(raw),before=structuredClone(map),entries=cargoPlacements(map);
 assert.equal(entries.length,261);assert.equal(entries.filter(p=>p.form==='crate-stack').length,100);
 assert.ok(entries.every(p=>['crate-square','crate-stack','barrel-single'].includes(p.form)));
 assert.equal(PAINTED_PROP_FORMS['barrels-cluster'],'barrel-single');
 assert.equal(new Set(entries.map(p=>`${p.x},${p.y},${p.z||0}`)).size,entries.length);
 assert.deepEqual(map,before);
});

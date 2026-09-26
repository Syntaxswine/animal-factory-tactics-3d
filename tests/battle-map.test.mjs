import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadBattleMap} from '../dist/tactics/battle-map.js';
import {cargoPlacements,PAINTED_PROP_FORMS} from '../dist/tactics/battle-environment.js';
const raw=fs.readFileSync(new URL('../dist/tactics/default-factory.json',import.meta.url),'utf8');
test('encounter loads the complete authored factory rather than the training template',async()=>{
 const map=await loadBattleMap(async()=>({ok:true,text:async()=>raw}));
 assert.equal(map.guards.length,36);// The 398-prop fixture gained 16 flat and 20 sloped modules over the two single-story buildings.
 assert.equal(map.props.length,398+16+20);
 const roofs=map.props.filter(p=>p.kind.startsWith('roof-climbable-'));
 assert.equal(roofs.length,38); // Includes the two original demo roofs, now climbable.
 for(const [x,y,w,h,kind] of [[8,1,8,8,'flat'],[13,12,10,8,'sloped']])for(let dy=0;dy<h;dy+=2)for(let dx=0;dx<w;dx+=2)assert(roofs.some(p=>p.x===x+dx&&p.y===y+dy&&p.z===1&&p.kind==='roof-climbable-corrugated-'+kind));assert.equal(Object.keys(map.edges).length,1576);
 for(const field of ['props','guards','edges','terrain','upper'])assert.deepEqual(map[field],JSON.parse(raw)[field],field);
 assert.deepEqual(JSON.parse(raw),JSON.parse(fs.readFileSync(new URL('../Factory-test.json',import.meta.url))));
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

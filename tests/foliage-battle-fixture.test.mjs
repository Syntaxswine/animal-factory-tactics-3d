import test from 'node:test';
import assert from 'node:assert/strict';
import {foliageBattleFixture} from '../tools/foliage-battle-fixture.mjs';
import {parseMap,passable} from '../dist/tactics/core/maps.js';

test('representative foliage benchmark has saved 240×240 terrain and four passable squad starts',()=>{
 const map=foliageBattleFixture('temperate'),serialized=JSON.stringify(map);
 assert.equal(map.width,240);assert.equal(map.height,240);assert.equal(map.starts.length,4);
 assert.deepEqual(parseMap(serialized),map);assert.ok(Buffer.byteLength(serialized)<4000000);
 assert.ok(JSON.stringify(map,null,2).length<4000000,'ordinary editor pretty export must fit the same Playtest parser limit');
 assert.ok(Object.values(map.foliage).filter(v=>v[1]).length>20000,'broad full-sector cover');
 for(const marker of [...map.starts,...map.exits])assert.equal(passable(map,marker),true);
 assert.equal(map.props.length,0,'generated flat benchmark must not claim authored tutorial scenery');
});

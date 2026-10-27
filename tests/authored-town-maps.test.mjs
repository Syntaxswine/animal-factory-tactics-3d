import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TOWNS,checkTownMap} from '../tools/author-town-maps.mjs';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {prepareVariant} from '../dist/tactics/sector-variant.js';
import {dialogueDiagnostics} from '../dist/tactics/dialogue-schema.js';
import {propCells} from '../dist/tactics/core/environment.js';
const root=new URL('../dist/tactics/sector-library/',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));

for(const recipe of TOWNS){
 const entry=read(recipe.id+'/placeholder.json'),map=read(recipe.id+'/'+recipe.variant+'.json');
 test(recipe.name+': registered editable variant, reachable rooms and standard unobstructed roads',()=>{
  assert.ok(entry.variants.includes(recipe.variant+'.json'));
  assert.equal(entry.variantDetails[recipe.variant+'.json'].preview,recipe.variant+'.svg');
  assert.ok(checkTownMap(map).reachableTargets>=18);
  const sides=recipe.variant==='last-shift-01'?['east','west']:recipe.variant==='floodmark-01'?['north','south']:['north','east','south','west'];
  for(const side of sides)for(let n=0;n<240;n++){
   const t=side==='north'?map.terrain[0][n]:side==='south'?map.terrain[239][n]:side==='east'?map.terrain[n][239]:map.terrain[n][0];
   assert.equal(t==='ground-asphalt',n>=117&&n<=122,side+' boundary tile '+n);
  }
 });
 test(recipe.name+': buildings have distinct interiors, safe stair access and intact export',()=>{
  const doc=new EditingDocument().open(JSON.stringify(map));
  const saved=prepareVariant(entry,{id:recipe.id,name:'player-copy',map:JSON.parse(doc.export())});
  assert.deepEqual(saved.map.upper,map.upper);assert.deepEqual(saved.map.edges,map.edges);
  assert.deepEqual(saved.map.sectorTemplate.town,map.sectorTemplate.town);
  assert.ok(map.stairs.length);assert.ok(map.props.some(p=>p.kind.startsWith('chair-')));
  assert.ok(map.props.some(p=>p.kind==='table-wood'));
  for(const p of map.props)for(const c of propCells(p))assert.ok(c.x>=0&&c.x<240&&c.y>=0&&c.y<240);
 });
 test(recipe.name+': residents are peaceful, talkable and have valid authored flavour',()=>{
  assert.equal(map.guards.length,2);
  for(const npc of map.guards){
   assert.equal(npc.character.category,'npc');assert.equal(npc.character.faction,'civilians');assert.equal(npc.character.attitude,'neutral');assert.equal(npc.character.canTalk,true);
   assert.deepEqual(dialogueDiagnostics(map.dialogueDefinitions[npc.character.dialogueRef]).errors,[]);
  }
 });
}
test('Floodmark keeps six continuous river tiles, with only the standard road bridge crossing it',()=>{
 const map=read('town--river-e1-w1-road-ns/floodmark-01.json');
 for(let y=77;y<=82;y++)for(let x=0;x<240;x++)assert.equal(map.terrain[y][x],x>=117&&x<=122?'bridge':'water');
 for(const y of [0,239])assert.equal(map.terrain[y].filter(t=>t==='water').length,0);
});

import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {tutorialFoliagePlan} from '../dist/tactics/biome-terrain-plan.js';
import {BIOME_FAMILIES} from '../dist/tactics/biome-foliage-data.js';
import {characterDefaults} from '../dist/tactics/character-properties.js';

// Generated performance input, not the authored tutorial map. Reuses the
// screenshot-inspired broad region layout on level ground, with four real
// squad starts. Every rendered obstruction comes from ordinary saved fields.
export function foliageBattleFixture(family='temperate'){
 if(!BIOME_FAMILIES[family])throw Error('Unknown foliage habitat: '+family);
 const map=blankMap('Generated foliage performance sector · '+family);
 map.terrain=map.terrain.map(row=>row.map(()=>'ground-biome-'+family));
 map.starts=[{x:101,y:95,z:0},{x:102,y:95,z:0},{x:101,y:96,z:0},{x:102,y:96,z:0}];
 map.starts.forEach((p,i)=>p.character={...characterDefaults('starts'),id:'char_foliage_benchmark_'+i});
 map.exits=[{x:104,y:96,z:0}];
 const plan=tutorialFoliagePlan(map);map.foliage={};
 for(let y=0;y<240;y++)for(let x=0;x<240;x++){
  const dense=plan.blockedAt(x,y),near=dense||[-5,0,5].some(dy=>[-5,0,5].some(dx=>plan.blockedAt(x+dx,y+dy)));
  if(near)map.foliage[`${x},${y},0`]=[dense?85:55,dense];
 }
 // Explicitly retain the reserved squad/exit lanes in the saved overlay.
 for(const marker of [...map.starts,...map.exits])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)delete map.foliage[`${marker.x+dx},${marker.y+dy},0`];
 const errors=validateMap(map);if(errors.length)throw Error(errors.join('\n'));
 return map;
}

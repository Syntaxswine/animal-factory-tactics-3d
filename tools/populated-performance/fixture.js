import {foliageReviewFixture} from './foliage-review-fixture.js';
import {validateMap} from './core/maps.js';

// Diagnostic input only. Stable IDs are intentional; no saved campaign is read.
export function populatedFixture(){
 const map=foliageReviewFixture('wetlands','trees-v1','sector');
 map.name='Performance investigation · 24 people';
 for(let y=113;y<=141;y++)for(let x=108;x<=139;x++)delete map.foliage[`${x},${y},0`];
 const species=['horse','goat','donkey','sheep','cow','pig-foreman','pig-director','skunk','hen'];
 map.guards=[];
 for(let i=0;i<20;i++){
  const civilian=i>=12,x=civilian?111+(i%4)*3:128+(i%4)*3,y=civilian?119+Math.floor((i-12)/4)*4:115+Math.floor(i/4)*5;
  map.guards.push({x,y,z:0,species:species[i%species.length],weapon:civilian?'hands':'pistol',heading:180,outfit:civilian?'normal':'red-hats',
   patrol:[{x,y,z:0,waitSeconds:0},{x,y:y+2,z:0,waitSeconds:0}],
   character:{id:'char_performance_'+i,displayName:(civilian?'Civilian ':'Guard ')+(i+1),scriptId:'performance_'+i,category:civilian?'npc':'combat',faction:civilian?'civilians':'red-hats',attitude:civilian?'neutral':'hostile',combatBehavior:civilian?'cower':'fight',canTalk:false,dialogueRef:'',canSell:false,shopInventoryRef:'',shopPricingRef:'',references:[]}});
 }
 const errors=validateMap(map);if(errors.length)throw Error(errors.join('\n'));
 return map;
}

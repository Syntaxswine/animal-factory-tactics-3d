import {climbingFixture} from './climbing-fixture.js';
import {characterDefaults} from './character-properties.js';
// Review-only deployment. Ordinary maps, Quick Fight and campaigns keep their
// authored cast; the editor and recruitment use the same accepted bear species.
export function bearRosterFixture(){
 const map=climbingFixture();map.name='Bear range · weapons, stances and traversal';
 map.starts.forEach((p,i)=>Object.assign(p,{species:'bear',outfit:i%2?'red-hats':'normal',weapon:['rifle','hmg','rpg','flamethrower'][i],stats:{climbing:100}}));
 const weapons=['hands','knife','pistol','rifle','assault','smg','hmg','shotgun','sniper','grenade','launcher','rpg','flamethrower'];
 map.guards=weapons.map((weapon,i)=>({x:10+i%5*3,y:16+Math.floor(i/5)*3,z:0,species:'bear',outfit:i%2?'red-hats':'normal',weapon,
  character:{...characterDefaults('guards','npc'),id:'char_bear_range_'+i,displayName:weapon+' reference',faction:'civilians',attitude:'friendly'}}));
 return map;
}

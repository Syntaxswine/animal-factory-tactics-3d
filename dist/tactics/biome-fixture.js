import {blankMap} from './core/maps.js';
import {BIOME_TERRAIN} from './biome-gameplay-data.js';
// A normal editable/playable map. No renderer-only masks or scene globals.
export function biomeFixture(){
 const map=blankMap('Biome workshop · five environments');map.foliage={};
 for(const [i,kind]of Object.keys(BIOME_TERRAIN).entries())for(let y=96;y<132;y++)for(let x=84+i*16;x<100+i*16;x++){
  map.terrain[y][x]=kind;if(y<110)map.foliage[`${x},${y},0`]=[85,true];else if(y>120)map.foliage[`${x},${y},0`]=[55,false];
 }
 // A one-cell passage tests that broad crowns and drifts do not bridge it.
 for(let y=96;y<110;y++)delete map.foliage[`107,${y},0`];
 for(let y=133;y<143;y++)for(let x=110;x<120;x++){
  map.upper[0][`${x},${y}`]='ground-biome-jungle';map.props.push({kind:'cliff-ledge',x,y,z:0,cliffMask:15});map.foliage[`${x},${y},1`]=[80,true];
 }
 for(let y=134;y<141;y++)for(let x=111;x<118;x++){
  map.upper[1][`${x},${y}`]='ground-biome-snow';map.props.push({kind:'cliff-ledge',x,y,z:1,cliffMask:15});map.foliage[`${x},${y},2`]=[70,false];
 }
 map.starts=[{x:113,y:115,z:0},{x:114,y:115,z:0},{x:113,y:116,z:0},{x:114,y:116,z:0}];map.exits=[{x:114,y:119,z:0}];
 return map;
}

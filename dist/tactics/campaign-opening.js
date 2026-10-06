import {blankMap,stampRoom,addStairs} from './core/maps.js';
import {generateWorld} from './overmap-generator.js';
import {route} from './overmap-model.js';
import {medicalChest} from './inventory-tools.js';

export const OPENING_VERSION='two-sector-1';
const character=(id,name,extra={})=>({id:'char_'+id,displayName:name,scriptId:id,category:'combat',faction:'red-hats',attitude:'hostile',combatBehavior:'fight',canTalk:false,dialogueRef:'',canSell:false,shopInventoryRef:'',shopPricingRef:'',references:[],...extra});
export function openingDefinitions(){
 const a=blankMap('Valley safehouse'),b=blankMap('Road checkpoint');
 for(let x=210;x<240;x++)for(let y=117;y<123;y++)a.terrain[y][x]='ground-asphalt';
 for(let x=0;x<36;x++)for(let y=117;y<123;y++)b.terrain[y][x]='ground-asphalt';
 a.starts=[{x:231,y:118,z:0},{x:232,y:118,z:0},{x:231,y:121,z:0},{x:232,y:121,z:0}];a.exits=[{x:237,y:120,z:0}];
 stampRoom(a,223,107,8,7);for(const k of Object.keys(a.edges))a.edges[k]=a.edges[k]==='door'?'door-wood-closed':'wall-brick';
 a.edges['s:227:113']='doorway-concrete-open';
 a.guards=[{x:228,y:115,z:0,species:'donkey',weapon:'hands',outfit:'blue-hawaiian',character:character('safehouse_guide','Valley guide',{category:'npc',faction:'civilians',attitude:'friendly',combatBehavior:'cower'})}];
 addStairs(a,226,110,0);for(let y=108;y<113;y++)for(let x=224;x<230;x++)a.upper[0][`${x},${y}`]='ground-wood-planks';
 a.campaignLoot=[{id:'safehouse-supplies',x:230,y:119,z:0,items:[{type:'ammo',kind:'assault',count:60}]},{id:'safehouse-chest',x:232,y:119,z:0,container:{id:'supply-chest',name:'Supply chest',locked:false},searched:false,items:[medicalChest(),{type:'ammo',kind:'rifle',count:12}]},{id:'safehouse-upper',x:225,y:110,z:1,items:[{type:'ammo',kind:'pistol',count:12}]}];
 b.starts=[{x:2,y:118,z:0},{x:3,y:118,z:0},{x:2,y:121,z:0},{x:3,y:121,z:0}];b.exits=[{x:2,y:120,z:0}];
 stampRoom(b,17,109,8,7);for(const k of Object.keys(b.edges))b.edges[k]=b.edges[k]==='door'?'door-wood-closed':'wall-brick';
 b.edges['e:16:112']='window-brick';
 b.guards=[[13,117],[16,121],[19,117],[22,122],[20,112],[24,126]].map(([x,y],i)=>({x,y,z:0,species:['horse','goat','pig-foreman'][i%3],weapon:i%2?'pistol':'rifle',outfit:'red-hats',heading:180,character:character('checkpoint_guard_'+(i+1),'Checkpoint guard '+(i+1))}));
 b.props=[{x:10,y:116,z:0,kind:'sandbags'},{x:10,y:124,z:0,kind:'sandbags'},{x:21,y:125,z:0,kind:'barrel-explosive'}];
 b.campaignLoot=[];
 for(const [map,id,side]of [[a,'opening-safehouse','east'],[b,'opening-checkpoint','west']])map.sectorTemplate={id,role:'special',status:'in-progress',config:{feature:null,roads:[side]},transform:{turns:0,mirror:false},scope:'Two-sector campaign foundation fixture; not the finished tutorial'};
 return {a,b};
}
export async function loadOpeningContent(fetcher=fetch){
 const content=openingContent();
 for(const assignment of Object.values(content.assignments)){
  const response=await fetcher(new URL(`./sector-library/${assignment.templateId}/${assignment.variant}.json`,import.meta.url));
  if(!response.ok)throw Error('Campaign map unavailable: '+assignment.templateId);assignment.map=await response.json();
 }
 return content;
}
// Explicit assignments are fixed for this proof; the other 448 sectors remain unassigned.
export function openingContent(){
 const overmap=generateWorld(42),{a,b}=openingDefinitions();
 overmap.sectors[70].name=a.name;overmap.sectors[71].name=b.name;
 overmap.sectors[70].routes.push(route('road','center','east',.5,.5));overmap.sectors[71].routes.push(route('road','west','center',.5,.5));
 const entry=side=>({side,offset:.5,width:6,z:0,depth:8});
 return {seed:42,contentVersion:OPENING_VERSION,overmap,start:70,assignments:{70:{templateId:'opening-safehouse',variant:'foundation-1',orientation:0,map:a,entries:[entry('east')]},71:{templateId:'opening-checkpoint',variant:'foundation-1',orientation:0,map:b,entries:[entry('west'),entry('south')]}},reinforcement:{source:101,destination:71,delay:180,count:3}};
}

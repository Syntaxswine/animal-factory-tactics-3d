import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {blankMap, edgeKey, setTerrain, addStairs, parseMap, neighbors, stairSet, tileKey, passable} from '../dist/tactics/core/maps.js';
import {PROPS, propCells} from '../dist/tactics/core/environment.js';
import {expandPlaceholder} from '../dist/tactics/sector-placeholder.js';
import {trackMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {catalog, saveVariant, exportSectors} from './sector-authoring.mjs';

const source=fileURLToPath(new URL('../../sectors/',import.meta.url));
const runtime=fileURLToPath(new URL('../dist/tactics/sector-library/',import.meta.url));
export const TOWNS=[
 {id:'town--land-road-ensw',variant:'market-clinic-01',name:'Linden Square',family:'temperate',subtitle:'A meeting hall became a clinic; the ration office stayed upstairs.',focus:[119,119],story:'The market still feeds the town. Beds have replaced the meeting-hall benches, while ration records and a private office occupy the upper floor next door.'},
 {id:'town-workshop--land-road-ew',variant:'last-shift-01',name:'Last Shift',family:'dry',subtitle:'A working town whose machines outlasted its last payday.',focus:[121,119],story:'Finished parts wait on pallets, the canteen is set for a shift that never arrived, and the manager has kept the only comfortable upstairs room.'},
 {id:'town--river-e1-w1-road-ns',variant:'floodmark-01',name:'Floodmark',family:'wetlands',subtitle:'A bridge, a customs house and homes turned into an evacuation station.',focus:[120,82],story:'Cargo was hauled off the low quay into a dry warehouse. The customs house still has its records, but the family house is now a small first-aid post and the waiting hall holds stranded travellers.'}
];

const point=(x,y,z=0)=>({x,y,z});
function rect(m,x,y,w,h,kind,z=0){for(let cy=y;cy<y+h;cy++)for(let cx=x;cx<x+w;cx++)setTerrain(m,cx,cy,z,kind);}
function roadCell(config,x,y){return (config.roads.includes('north')&&y<=122||config.roads.includes('south')&&y>=117)&&x>=117&&x<=122||(config.roads.includes('west')&&x<=122||config.roads.includes('east')&&x>=117)&&y>=117&&y<=122;}
function prop(m,kind,x,y,z=0,extra={}){if(!PROPS[kind])throw Error('Unknown furnishing '+kind);m.props.push({kind,x,y,z,...extra});}
function line(m,x1,y1,x2,y2,kind='ground-gravel',width=2){
 if(x1!==x2&&y1!==y2)throw Error('Use right-angle service paths.');
 rect(m,Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1)+width,Math.abs(y2-y1)+width,kind);
}
function boundary(b,side,offset,z=0){return side==='north'?edgeKey('s',b.x+offset,b.y-1,z):side==='south'?edgeKey('s',b.x+offset,b.y+b.h-1,z):side==='west'?edgeKey('e',b.x-1,b.y+offset,z):edgeKey('e',b.x+b.w-1,b.y+offset,z);}
function building(m,id,name,x,y,w,h,{wall='wall-brick',floor='ground-wood-planks',stories=1,door='south',offset=Math.floor(w/2),roof='roof-corrugated-flat',story=''}={}){
 const b={id,name,x,y,w,h,stories,story,visits:[]};
 rect(m,x-1,y-1,w+2,h+2,'ground-concrete');
 for(let z=0;z<stories;z++){
  rect(m,x,y,w,h,floor,z);
  for(let n=0;n<w;n++){m.edges[boundary(b,'north',n,z)]=wall;m.edges[boundary(b,'south',n,z)]=wall;}
  for(let n=0;n<h;n++){m.edges[boundary(b,'west',n,z)]=wall;m.edges[boundary(b,'east',n,z)]=wall;}
  const window=wall==='wall-corrugated'?'window-corrugated':'window-brick';
  for(const side of ['north','south'])for(let n=2;n<w-1;n+=4)m.edges[boundary(b,side,n,z)]=window;
  for(const side of ['west','east'])for(let n=2;n<h-1;n+=4)m.edges[boundary(b,side,n,z)]=window;
  b.visits.push(point(x+1,y+1,z));
 }
 m.edges[boundary(b,door,offset)]='door-wood-closed';
 b.entrance=door==='south'?point(x+offset,y+h):door==='north'?point(x+offset,y-1):door==='west'?point(x-1,y+offset):point(x+w,y+offset);
 // Complete, supported roof decks; modules never put little parapets inside a roof.
 rect(m,x,y,w,h,'floor',stories);
 for(let cy=y;cy<y+h;cy+=2)for(let cx=x;cx<x+w;cx+=2)prop(m,roof,cx,cy,stories);
 if(stories>1){addStairs(m,x+1,y+1,0);b.visits[1]=point(x+2,y+1,1);}
 m.sectorTemplate.town.places.push(b);return b;
}
function furnish(m,b,items,z=0){for(const [kind,x,y,extra]of items)prop(m,kind,b.x+x,b.y+y,z,extra);}
function partition(m,b,dy,gap){for(let dx=0;dx<b.w;dx++)m.edges[edgeKey('s',b.x+dx,b.y+dy)]=dx===gap?'door-wood-closed':'wall-brick';}
function civilian(m,id,name,species,x,y,line){
 const dialogue='town_'+id.replaceAll('-','_');
 m.guards.push({x,y,z:0,species,weapon:'hands',heading:90,character:{id:'char_'+id.replaceAll('-','_'),displayName:name,scriptId:id,category:'npc',faction:'civilians',attitude:'neutral',combatBehavior:'cower',canTalk:true,dialogueRef:dialogue,canSell:false,shopInventoryRef:'',shopPricingRef:'',references:[]}});
 m.dialogueDefinitions??={};m.dialogueDefinitions[dialogue]={schemaVersion:1,id:dialogue,version:1,entry:[{node:'greeting'}],nodes:{greeting:{npc:line}}};
 m.characterResources??={dialogues:[],shopInventories:[],shopPricing:[]};m.characterResources.dialogues.push(dialogue);
}
function borderTrees(m){
 // Deliberately sparse: visual punctuation, not a dense full-sector stress test.
 for(let n=0;n<14;n++)for(const side of [0,1]){
  const x=side?174+(n*7)%23:50+(n*11)%19,y=44+n*11;
  if(!roadCell(m.sectorTemplate.config,x,y)&&m.terrain[y][x].startsWith('ground-biome-'))prop(m,n%4===0?'tree-pine':'tree-broadleaf',x,y);
 }
}
function streetFurniture(m,points){for(const [x,y]of points){prop(m,'streetlight',x,y);rect(m,x,y,1,1,'ground-concrete');}}
function base(recipe,entry){
 const m=blankMap(recipe.name);m.levels=6;m.upper=Array.from({length:5},()=>({}));
 m.terrain=Array.from({length:240},()=>Array(240).fill('ground-biome-'+recipe.family));
 m.sectorTemplate={id:entry.id,role:entry.role,config:entry.config,transform:{turns:0,mirror:false},status:'in-progress',notes:[recipe.story,'Rough environmental storytelling layout. NPC lines are authored flavour; no mission rewards or ownership changes.'],town:{version:1,variant:recipe.variant,story:recipe.story,focus:recipe.focus,places:[]}};
 // Copy the established six-wide river recipe, including its exact edge ports.
 const skeleton=expandPlaceholder(entry);
 for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(['water','bridge'].includes(skeleton.terrain[y][x]))m.terrain[y][x]=skeleton.terrain[y][x];
 return m;
}
function market(m){
 rect(m,90,90,62,62,'ground-concrete');
 line(m,78,114,162,114);line(m,78,125,166,125);line(m,88,77,88,168);line(m,151,78,151,168);
 const clinic=building(m,'meeting-hall-clinic','Meeting hall / clinic',94,94,18,16,{floor:'ground-tiles',story:'A public hall hastily divided into a ward and a treatment room.'});partition(m,clinic,6,8);
 furnish(m,clinic,[['hospital-bed',2,2],['hospital-bed',6,2],['hospital-bed',12,2],['iv-stand',4,3],['medicine-cabinet-closed',15,1],['medical-exam-table',2,10],['scrub-sink',15,10],['chair-metal-sage',7,11]]);
 const office=building(m,'ration-office','Ration office / private flat',94,77,18,12,{stories:2,story:'Crates and the public counter below; a comfortable private room and telephone upstairs.'});
 furnish(m,office,[['table-steel',7,7],['crate-stack',14,2],['crate-wood',14,4],['guardhouse-computer-amber',5,2]]);
 furnish(m,office,[['table-wood',8,3],['chair-wingback-teal',8,5],['guardhouse-telephone',12,3],['supply-chest-closed',14,8]],1);
 const store=building(m,'cooperative','Cooperative shop',130,94,18,16,{door:'west',offset:10,story:'A full stockroom behind an almost empty shop counter.'});
 furnish(m,store,[['table-wood',3,5],['table-wood',6,5],['wooden-crate-open',13,2],['crate-stack',14,4],['supply-chest-closed',12,11]]);
 const house=building(m,'garden-house','Garden house',154,88,12,12,{wall:'wall-corrugated',roof:'roof-corrugated-sloped',story:'A small home with the dining table still laid and a little garden behind it.'});
 furnish(m,house,[['table-wood',4,4],['chair-wood-honey',4,6],['chair-wood-walnut',6,6],['supply-chest-open',9,2]]);
 const grocer=building(m,'market-store','Market store',94,130,18,12,{door:'north',story:'Pallets and open crates link the store to the outdoor stalls.'});
 furnish(m,grocer,[['crate-stack',2,2],['wooden-crate-open',5,2],['table-wood',11,6]]);
 const boarding=building(m,'boarding-house','Workers boarding house',80,150,20,12,{stories:2,story:'A shared dining room below and simple beds upstairs.'});
 furnish(m,boarding,[['table-wood',5,6],['chair-wood-honey',5,8],['table-wood',11,6],['chair-wood-walnut',11,8]]);
 furnish(m,boarding,[['hospital-bed',5,2],['hospital-bed',9,2],['hospital-bed',13,2],['supply-chest-closed',17,8]],1);
 const canteen=building(m,'square-canteen','Square canteen',130,130,18,14,{door:'north',story:'Tables face the square; supplies are pushed into the back corner.'});
 furnish(m,canteen,[['table-wood',3,5],['chair-wood-honey',3,7],['table-wood',10,5],['chair-wood-walnut',10,7],['barrel-single',14,10]]);
 const shed=building(m,'garden-shed','Garden tool shed',152,150,12,10,{wall:'wall-corrugated',story:'Tools, spare parts and an improvised workbench.'});
 furnish(m,shed,[['workbench-vise',2,2],['toolbox-open',8,2],['spare-parts',8,6]]);
 for(const [x,y]of [[99,113],[107,113],[130,113],[139,113],[103,125],[135,125]]){prop(m,'table-wood',x,y);prop(m,'wooden-crate-open',x+3,y);}
 for(const [x,y]of [[83,109],[155,106],[81,143],[161,141]]){prop(m,'tree-broadleaf',x,y);prop(m,'bush',x+2,y+1);}
 streetFurniture(m,[[115,106],[124,106],[115,132],[124,132]]);
 civilian(m,'linden-ward-nurse','Ward volunteer','sheep',104,106,'This used to be the meeting hall. We moved the beds in when the trucks stopped coming. The ration office is the two-storey building behind us.');
 civilian(m,'linden-grocer','Cooperative grocer','goat',135,106,'The shelves are bare, but the stockroom is not. We sell what we can and save the rest for the ward.');
 m.starts=[point(111,118),point(111,120),point(109,118),point(109,120)];m.exits=[point(5,119)];
}
function lastShift(m){
 rect(m,83,90,82,25,'ground-concrete');rect(m,83,125,82,30,'ground-gravel');
 line(m,81,112,169,112);line(m,85,126,169,126);line(m,109,128,109,165);
 const shop=building(m,'repair-shop','Repair shop',101,94,22,18,{wall:'wall-corrugated',floor:'ground-concrete',story:'An unfinished lathe job, boxed finished parts, and a clean service aisle.'});
 furnish(m,shop,[['machine-lathe',3,3],['workbench-vise',9,3],['workbench-metal',15,3],['toolbox-open',16,7],['pallet',3,12],['crate-steel',6,12],['spare-parts',11,12]]);
 const office=building(m,'manager-flat','Manager office / flat',131,96,14,14,{stories:2,story:'The payroll counter is downstairs; the manager kept a private room above it.'});
 furnish(m,office,[['table-steel',6,6],['guardhouse-computer',9,2],['chair-desk-teal',8,7],['supply-chest-closed',10,10]]);
 furnish(m,office,[['table-wood',6,4],['chair-wingback-russet',6,7],['guardhouse-telephone',10,4],['hospital-bed',10,9]],1);
 const tools=building(m,'tool-lockup','Tool lockup',85,96,10,14,{wall:'wall-corrugated',story:'The useful tools have been packed away; loose spares remain on the bench.'});
 furnish(m,tools,[['workbench-metal',2,3],['toolbox-closed',6,4],['crate-steel',6,8],['spare-parts',2,10]]);
 const home=building(m,'worker-home','Worker family home',90,133,16,12,{door:'north',roof:'roof-corrugated-sloped',story:'A modest family table and a chest packed for departure.'});
 furnish(m,home,[['table-wood',5,4],['chair-wood-honey',5,6],['chair-wood-walnut',7,6],['supply-chest-open',12,8]]);
 const lodging=building(m,'shift-lodgings','Shift lodgings',115,133,14,12,{stories:2,door:'north',story:'A common room and four beds whose owners never came back for their things.'});
 furnish(m,lodging,[['table-wood',5,5],['chair-metal-iron',5,7]]);furnish(m,lodging,[['hospital-bed',4,2],['hospital-bed',7,2],['hospital-bed',10,2],['supply-chest-open',10,9]],1);
 const canteen=building(m,'shift-canteen','Shift canteen',140,133,18,14,{door:'north',story:'The tables are set; fuel and the cooking area are outside in the yard.'});
 furnish(m,canteen,[['table-wood',3,4],['chair-metal-sage',3,6],['table-wood',10,4],['chair-metal-iron',10,6],['barrel-single',14,10]]);
 const dispatch=building(m,'dispatch','Dispatch store',145,155,14,10,{wall:'wall-corrugated',story:'Finished goods arranged beside the loading apron, with nobody left to collect them.'});
 furnish(m,dispatch,[['crate-stack',2,2],['crate-steel',5,2],['pallet',9,6]]);
 // The tall mill stands in the open service yard, not under a low shack roof.
 prop(m,'machine-mill',154,98);prop(m,'workbench-metal',159,103);prop(m,'toolbox-open',161,107);
 for(const [x,y]of [[128,112],[135,112],[155,112],[163,112],[137,152],[161,158]]){prop(m,'pallet',x,y);prop(m,'crate-steel',x+1,y);}
 for(const [x,y]of [[81,129],[167,131],[87,151],[133,163]])prop(m,'tree-broadleaf',x,y);
 streetFurniture(m,[[99,115],[124,115],[145,124],[86,124]]);
 civilian(m,'last-shift-mechanic','Off-duty machinist','donkey',110,107,'That part on the lathe was supposed to be the last job on Friday. Nobody has been paid since. The finished ones are still out on the loading apron.');
 civilian(m,'last-shift-cook','Canteen keeper','cow',151,142,'I set the tables out of habit. If they start the line again, somebody will need to feed the shift.');
 m.starts=[point(115,119),point(115,121),point(113,119),point(113,121)];m.exits=[point(5,119)];
}
function floodmark(m){
 for(const y of [73,83])rect(m,70,y,110,4,'ground-dirt');
 rect(m,92,70,20,7,'ground-wood-planks');rect(m,92,83,20,5,'ground-wood-planks');
 line(m,87,89,165,89);line(m,87,126,161,126);line(m,88,49,88,75);line(m,150,48,150,73);line(m,88,67,150,67);
 const waiting=building(m,'waiting-hall','Waiting hall / shelter',96,52,16,14,{story:'Waiting benches, luggage crates and a room now used as an overnight shelter.'});
 furnish(m,waiting,[['chair-wood-honey',3,4],['chair-wood-honey',5,4],['chair-wood-walnut',7,4],['supply-chest-open',11,3],['hospital-bed',3,9],['hospital-bed',8,9]]);
 const rescue=building(m,'north-home','North-bank family home',132,52,16,14,{door:'west',offset:10,wall:'wall-corrugated',roof:'roof-corrugated-sloped',story:'A family dining room looking down toward the bridge.'});
 furnish(m,rescue,[['table-wood',5,4],['chair-wood-honey',5,6],['chair-wood-walnut',7,6],['supply-chest-closed',11,9]]);
 const shed=building(m,'quay-tools','Quay tool shed',155,55,10,10,{wall:'wall-corrugated',story:'Rope and repair supplies are represented by a bench, toolbox and packed chest.'});
 furnish(m,shed,[['workbench-vise',2,2],['toolbox-open',6,3],['supply-chest-closed',6,6]]);
 const warehouse=building(m,'dry-warehouse','Dry warehouse',94,94,18,16,{wall:'wall-corrugated',floor:'ground-concrete',door:'north',story:'Cargo rescued from the low quay is stacked on the dry side of the road.'});
 furnish(m,warehouse,[['crate-stack',2,2],['crate-steel',6,2],['crate-stack',12,2],['pallet',3,10],['wooden-crate-open',9,11],['table-steel',14,9]]);
 const customs=building(m,'customs-house','Customs house / lookout',130,90,16,14,{stories:2,door:'west',offset:8,story:'Records and inspection tables below; a bridge-facing office above.'});
 furnish(m,customs,[['table-steel',5,5],['crate-wood',11,3],['supply-chest-closed',11,9]]);
 furnish(m,customs,[['guardhouse-computer-amber',5,3],['chair-desk-russet',6,5],['guardhouse-telephone',11,3]],1);
 const aid=building(m,'first-aid-home','House / first-aid post',132,110,14,12,{door:'west',offset:6,story:'A family home converted to a two-bed first-aid post.'});
 furnish(m,aid,[['hospital-bed',2,2],['hospital-bed',6,2],['iv-stand',4,3],['medical-exam-table',3,8],['medicine-cabinet-closed',11,2]]);
 const broken=building(m,'empty-quay-house','Vacated quay house',155,95,12,12,{wall:'wall-corrugated',story:'The household has packed; only a bare table and an open chest remain.'});
 furnish(m,broken,[['table-wood',4,4],['supply-chest-open',9,7]]);
 const kitchen=building(m,'bridge-kitchen','Bridge kitchen',96,132,16,12,{door:'north',story:'A shared kitchen provides a reason for people on both banks to keep the bridge open.'});
 furnish(m,kitchen,[['table-wood',3,4],['chair-wood-honey',3,6],['table-wood',9,4],['chair-wood-walnut',9,6],['barrel-single',12,9]]);
 const beds=building(m,'shelter-store','Shelter store',132,134,14,10,{door:'north',story:'Dry bedding and relief supplies, represented by stacked crates and chests.'});
 furnish(m,beds,[['crate-stack',2,2],['supply-chest-closed',6,2],['wooden-crate-open',10,6]]);
 for(const [x,y]of [[94,74],[105,85],[153,74],[160,85]])prop(m,'crate-wood',x,y);
 for(let x=72;x<174;x+=9){if(x>=113&&x<=126)continue;prop(m,'reeds',x,75);prop(m,'reeds',x+2,84);}
 for(const [x,y]of [[83,62],[153,118],[88,142],[158,140]])prop(m,'tree-broadleaf',x,y);
 streetFurniture(m,[[115,74],[124,85],[115,111],[124,128]]);
 civilian(m,'floodmark-carrier','Quay carrier','goat',105,102,'We moved the cargo off the boards and into this warehouse. The bridge is the only dry crossing; please keep the road clear.');
 civilian(m,'floodmark-volunteer','Shelter volunteer','sheep',141,118,'The waiting hall on the north bank is a shelter now. Anyone hurt comes here; anyone hungry goes to the kitchen south of the warehouse.');
 m.starts=[point(119,90),point(121,90),point(119,92),point(121,92)];m.exits=[point(119,5)];
}
export function makeTownMap(recipe,entry){
 const m=base(recipe,entry);({ 'market-clinic-01':market,'last-shift-01':lastShift,'floodmark-01':floodmark })[recipe.variant](m);
 borderTrees(m);
 // Restore the exact reserved main-road cells after landscaping and service paths.
 for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(roadCell(entry.config,x,y))m.terrain[y][x]=['water','bridge'].includes(m.terrain[y][x])?'bridge':'ground-asphalt';
 return m;
}

export function checkTownMap(map){
 // Query an immutable validation snapshot, not the editor's mutable source.
 map=trackMapGeometry(parseMap(JSON.stringify(map)));
 const occupied=new Set(),config=map.sectorTemplate.config;
 for(const p of map.props)for(const c of propCells(p)){
  const key=tileKey(c.x,c.y,c.z);if(occupied.has(key))throw Error(map.name+': overlapping objects at '+key);occupied.add(key);
  if(!c.z&&roadCell(config,c.x,c.y))throw Error(map.name+': road blocked by '+p.kind);
 }
 for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(roadCell(config,x,y)){
  if(!['ground-asphalt','bridge'].includes(map.terrain[y][x])||!passable(map,point(x,y)))throw Error('Broken main road at '+x+','+y);
  for(const axis of ['e','s'])if(map.edges[edgeKey(axis,x,y)])throw Error('Barrier in main road at '+x+','+y);
 }
 // Validate all rooms, upper rooms, entry aprons, bridge ends and every road port,
 // not just the four squad starts required by the normal map schema.
 const targets=map.sectorTemplate.town.places.flatMap(b=>[b.entrance,...b.visits]);
 for(const side of config.roads)targets.push(side==='north'?point(119,0):side==='south'?point(119,239):side==='east'?point(239,119):point(0,119));
 const remaining=new Set(targets.map(p=>tileKey(p.x,p.y,p.z))),seen=new Set(),queue=[map.starts[0]],stairs=stairSet(map);
 for(let i=0;i<queue.length&&remaining.size;i++){
  const p=queue[i],key=tileKey(p.x,p.y,p.z);remaining.delete(key);
  for(const q of neighbors(map,p,stairs,false).filter(q=>!q.kind||q.kind==='stairs')){const k=tileKey(q.x,q.y,q.z);if(!seen.has(k)){seen.add(k);queue.push(q);}}
 }
 if(remaining.size)throw Error(map.name+': unreachable room or road '+[...remaining].join('; '));
 return {name:map.name,buildings:map.sectorTemplate.town.places.length,props:map.props.length,civilians:map.guards.length,reachableTargets:targets.length};
}

const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function townPreview(map){
 let svg='<rect width="240" height="240" fill="'+({temperate:'#82916b',dry:'#b6a06a',wetlands:'#788e7c'}[map.terrain[0][0].replace('ground-biome-','')])+'"/>';
 const colors={'ground-asphalt':'#515653',bridge:'#b8976c',water:'#608d96','ground-gravel':'#a99c81','ground-dirt':'#998061','ground-concrete':'#b0ad9b','ground-wood-planks':'#b89867'};
 for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(colors[map.terrain[y][x]])svg+=`<path d="M${x} ${y}h1v1h-1z" fill="${colors[map.terrain[y][x]]}"/>`;
 for(const b of map.sectorTemplate.town.places)svg+=`<g><title>${xml(b.name+': '+b.story)}</title><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${b.stories>1?'#b77b56':'#847c6a'}" stroke="#443d34" stroke-width=".7"/><text x="${b.x+b.w/2}" y="${b.y+b.h/2+1}" text-anchor="middle" fill="#fff2d3" font-family="sans-serif" font-size="4.5">${map.sectorTemplate.town.places.indexOf(b)+1}</text></g>`;
 for(const p of map.props.filter(p=>p.kind.startsWith('tree-')))svg+=`<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#3d6249"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><title>${xml(map.name)}</title>${svg}<rect x="5" y="5" width="115" height="14" fill="#243b32"/><text x="9" y="15" fill="#f4e9c8" font-family="sans-serif" font-size="7">${xml(map.name)}</text><path d="M226 19v-12m-3 3l3-3 3 3" stroke="#f4e9c8" fill="none"/></svg>\n`;
}
function gallery(maps){return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Three town maps · Animal Factory</title><style>body{margin:0;background:#172b25;color:#e7dfc6;font:16px system-ui;line-height:1.5}main{max-width:1320px;margin:auto;padding:28px}a{color:#f5cd84}h1{margin-bottom:6px}header p{max-width:850px}.towns{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:22px}article{background:#243c32;padding:20px;border:1px solid #6c7b62}img{width:100%;background:#748568}h2{margin-bottom:4px}article p{min-height:74px}.open{display:block;padding:12px;background:#d4b47d;color:#172b25;text-align:center;font-weight:bold}li{margin:5px 0}small{color:#bdc9af}</style><main><header><a href="../sector-library.html">← Sector library</a><h1>Three towns with lives of their own</h1><p>Editable 240 × 240 map variants. Central roads and the river are six tiles wide, with their standard boundary connections. Side streets, yards and upper rooms offer routes around the buildings.</p><p><small>Rough layouts using existing assets. Two peaceful residents in each town have short authored lines. These maps are not automatically assigned to a campaign.</small></p></header><section class="towns">${maps.map((m,i)=>{const r=TOWNS[i];return `<article><h2>${xml(m.name)}</h2><small>${xml(r.subtitle)}</small><a href="../editor-3d.html?editing=1&amp;sectorTemplate=${r.id}&amp;orientation=0&amp;variant=${r.variant}.json"><img src="${r.id}/${r.variant}.svg" alt="${xml(m.name)} road and building plan"></a><p>${xml(r.story)}</p><a class="open" href="../editor-3d.html?editing=1&amp;sectorTemplate=${r.id}&amp;orientation=0&amp;variant=${r.variant}.json">Open town in the editor</a><ol>${m.sectorTemplate.town.places.map(b=>`<li><b>${xml(b.name)}</b> — ${xml(b.story)}</li>`).join('')}</ol></article>`;}).join('')}</section><p>Use Sector presets to reopen these, then Save to make another named variant in the same configuration folder. Coordinates and building notes are preserved in each map's sectorTemplate.town metadata.</p></main></html>\n`;}

export function authorTowns({root=source,out=runtime,check=false}={}){
 const entries=catalog(root),maps=TOWNS.map(r=>makeTownMap(r,entries.find(e=>e.id===r.id))),results=maps.map(checkTownMap);
 for(let i=0;i<maps.length;i++){
  const r=TOWNS[i],folder=entries.find(e=>e.id===r.id).folder,file=path.join(folder,r.variant+'.json');
  if(check){if(!fs.existsSync(file))throw Error('Missing authored town '+file);checkTownMap(JSON.parse(fs.readFileSync(file,'utf8')));continue;}
  // Never overwrite a user's edited variant on a later generator run.
  if(fs.existsSync(file))throw Error('Variant already exists: '+file+'. Use --check, or save a new variant from the editor.');
  saveVariant(root,out,{id:r.id,name:r.variant,status:'in-progress',map:maps[i]});
  fs.writeFileSync(path.join(folder,r.variant+'.svg'),townPreview(maps[i]));
 }
 if(!check){exportSectors(root,out);fs.writeFileSync(path.join(out,'town-maps.html'),gallery(maps));}
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(authorTowns({check:process.argv.includes('--check')}),null,2));

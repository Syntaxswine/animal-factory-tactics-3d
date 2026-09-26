import {TRUCK_PAINT} from '../dist/tactics/canvas-truck-paint.js';
import {RAMP_PROPS} from '../dist/tactics/cliff-ramps.js';
import {BANK_PROPS} from '../dist/tactics/ramp-banks.js';
import {DIAGONAL_ROADS} from '../dist/tactics/diagonal-roads.js';
import {ROOF_KINDS,climbableRoofKind} from '../dist/tactics/climbable-roofs.js';
import {environmentGeometries} from '../dist/tactics/environment-geometry.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {buildWorld} from '../dist/tactics/hybrid-world.js';
import {surfacePixels} from '../dist/tactics/hybrid-materials.js';
import {CARGO_ATLAS} from '../dist/tactics/painted-cargo.js';
import {PAINTED_ATLAS} from '../dist/tactics/painted-environment-scene.js';
import {FOLIAGE_ATLAS,FOLIAGE_MATERIALS} from '../dist/tactics/foliage-materials.js';
import {PROPS,EDGES,GROUNDS} from '../dist/tactics/environment.js';
import {CHARACTER_SPECIES,ARMED_WEAPONS,characterArt} from '../dist/tactics/character-art.js';
import {readFile,readdir} from 'node:fs/promises';
import {PROP_ART} from '../dist/tactics/prop-art.js';
import {DOOR_ART} from '../dist/tactics/door-art.js';
import {ROOM_SURFACES} from '../dist/tactics/hybrid-room-art.js';
import {RED_HAT_SPECIES,unitArt} from '../dist/tactics/red-hats-art.js';
import {EXPANSION_WEAPONS,weaponExpansionArt} from '../dist/tactics/weapon-expansion-art.js';
import {WEAPON_EXPANSION_FRAMES} from '../dist/tactics/weapon-expansion-frames.js';
import assert from 'node:assert/strict';
import {TYPES} from '../dist/engine.js';
const root=new URL('../dist/',import.meta.url);
await checkPNG('assets/characters/lowpoly-proof/horse-worker-atlas-v1.png',1254,1254,2);
for(const name of ['flamethrower','fuel'])assert.match(await readFile(new URL(`assets/equipment/${name}.svg`,root),'utf8'),/<svg/);
async function checkPNG(path,width,height,channels=6){
 const data=await readFile(new URL(path,root));
 assert.equal(data.subarray(1,4).toString(),'PNG',path);
 assert.equal(data.readUInt32BE(16),width,path);assert.equal(data.readUInt32BE(20),height,path);
 assert.equal(data[25],channels,`${path} has unexpected PNG channels`);
}
await checkPNG(TRUCK_PAINT.replace('../',''),1536,1024,2);
const manifest=JSON.parse(await readFile(new URL('assets/characters/manifest.json',root)));
for(const species of CHARACTER_SPECIES)for(const weapon of ['hands',...ARMED_WEAPONS])for(const stance of ['standing','kneeling','prone']){
 const frame=characterArt(species,weapon,'idle',stance);
 await checkPNG(frame.src.replace('../',''),frame.width,frame.height);
}
assert.equal(WEAPON_EXPANSION_FRAMES.length,384,'Complete weapon expansion and flamethrower set');
assert.equal(new Set(WEAPON_EXPANSION_FRAMES.map(f=>f.src)).size,384,'Each combination has its own PNG');
for(const outfit of ['normal','red-hats'])for(const species of outfit==='normal'?CHARACTER_SPECIES:RED_HAT_SPECIES)for(const weapon of EXPANSION_WEAPONS)for(const stance of ['standing','kneeling','prone']){
 const frame=weaponExpansionArt(species,weapon,stance,outfit);
 assert.ok(frame,`Missing ${outfit}/${species}/${weapon}/${stance}`);
 await checkPNG(frame.src.replace('../',''),frame.width,frame.height);
 assert.equal(unitArt({species,weapon,stance,outfit}).src,frame.src);
 assert.equal(frame.anchor[0],frame.width/2);assert.equal(frame.anchor[1],244);
 assert.equal(frame.contentHeight,{standing:236,kneeling:176,prone:96}[stance]);
 if(weapon==='grenade-launcher')assert.equal(unitArt({species,weapon:'launcher',stance,outfit}).src,frame.src);
}
assert.equal(Object.keys(manifest.characters).length,8);
for(const def of Object.values(manifest.characters)){
 assert.equal(def.frames.length,4);await checkPNG('assets/characters/'+def.sheet,768,256);
 for(const frame of def.frames)await checkPNG('assets/characters/'+frame,192,256);
}
for(const [type,t] of Object.entries(TYPES)){if(t.sprite)assert.match(await readFile(new URL('assets/machines/'+t.sprite,root),'utf8'),/<svg/);else await checkPNG(`assets/machines/${type}.png`,320,320);}
for(const type of ['mill','bakery','bottler','dairy'])await checkPNG(`assets/machines/industrial/${type}.png`,320,320);
for(const file of ['index.html','sprites.html','app.js','engine.js','people.js','renderer.js','isometric.js','style.css'])await readFile(new URL(file,root));
const environment=JSON.parse(await readFile(new URL('assets/environment/manifest.json',root)));
const artIds=[...Object.keys(PROPS),...new Set(Object.values(EDGES).map(r=>r.art).filter(Boolean)),...GROUNDS];
// Procedural assets and roof aliases have real render paths, not independent PNGs.
const proceduralProps=[...Object.keys(RAMP_PROPS),...Object.keys(BANK_PROPS)],roofAliases=ROOF_KINDS.map(climbableRoofKind),nonRaster=new Set([...proceduralProps,...roofAliases,...DIAGONAL_ROADS]);
assert.deepEqual(environment.assets.map(a=>a.id).sort(),artIds.filter(id=>!nonRaster.has(id)).sort());
const geometries=environmentGeometries();
try{for(const kind of [...proceduralProps,...roofAliases]){
 assert(PROPS[kind],kind);const z=roofAliases.includes(kind)?1:0,map={terrain:[['yard']],upper:[{'0,0':'floor'}],props:[{kind,x:0,y:0,z}],edges:{}};
 const parts=environmentVisuals(buildWorld(map),map).filter(p=>p.source.prop?.endsWith(':'+kind));assert(parts.length,kind);
 for(const p of parts){const g=geometries[p.shape||'box'];assert(g?.attributes.position.count,kind);assert([...g.attributes.position.array].every(Number.isFinite),kind);assert(p.size.every(n=>Number.isFinite(n)&&n>0),kind);}
}}finally{Object.values(geometries).forEach(g=>g.dispose());}
for(const kind of ROOF_KINDS)assert(environment.assets.some(a=>a.id===kind),kind);
for(const kind of DIAGONAL_ROADS){assert(GROUNDS.includes(kind),kind);assert(FOLIAGE_MATERIALS.has(kind),kind);const {data:pixels}=surfacePixels(kind,16);assert.equal(pixels.length,16*16*4,kind);assert(pixels.some(v=>v!==0),kind);}
for(const a of environment.assets)await checkPNG('assets/environment/'+a.file,1254,1254,a.kind==='terrain'?2:6);
// Validate the actual runtime overrides as well as catalog paths.
const active=new Set(environment.assets.map(a=>(DOOR_ART[a.id]||PROP_ART[a.id])?.file||a.file));
active.add(TRUCK_PAINT.replace('../assets/environment/',''));
for(const {file} of Object.values(ROOM_SURFACES))active.add(file);
for(const file of active)await readFile(new URL('assets/environment/'+file,root));
const cargoAtlas=CARGO_ATLAS.replace('../assets/environment/','');active.add(cargoAtlas);await checkPNG('assets/environment/'+cargoAtlas,1536,1024,2);
const studyAtlas=PAINTED_ATLAS.replace('../assets/environment/','');active.add(studyAtlas);await checkPNG('assets/environment/'+studyAtlas,1254,1254,2);
const foliageAtlas=FOLIAGE_ATLAS.replace('../assets/environment/','');active.add(foliageAtlas);await checkPNG('assets/environment/'+foliageAtlas,1254,1254,2);
active.add('foliage/river-water.png');active.add('foliage/shore-tiles-atlas.png');
for(const kind of ['lathe','mill','press']){for(const name of [kind+'-sketch-v1.png',kind+'-paint-v1.png',...(kind==='press'?['press-paint-v2.png']:[])])active.add('factory-machines/'+name);await checkPNG('assets/environment/factory-machines/'+kind+'-paint-v'+(kind==='press'?2:1)+'.png',1536,1024,2);}
// Reusable cliff-study paint is intentionally separate from the gameplay catalog.
for(const [directory,names] of [['sand-cliff',['sand.png','sand-feather.png']],['grass-cliff-meadow',['grass-0.png','grass-1.png','grass-2.png','grass-3.png']]]){
 const manifest=JSON.parse(await readFile(new URL('assets/environment/'+directory+'/tiles.json',root)));
 assert.deepEqual(manifest.tiles,names);assert.equal(manifest.pixels,512);
 for(const name of names){const file=directory+'/'+name;active.add(file);await checkPNG('assets/environment/'+file,512,512);}
 if(directory==='grass-cliff-meadow'){assert.deepEqual(manifest.atlas,{file:'atlas.png',columns:2,rows:2});active.add(directory+'/atlas.png');await checkPNG('assets/environment/'+directory+'/atlas.png',1024,1024);}
}
const superseded=new Set(['door-steel-closed.png','door-wood-closed.png','doorway-concrete-open.png','foliage/river-straight.png','foliage/river-bend.png','foliage/river-banks-atlas.png']);
for(const file of await readdir(new URL('assets/environment/',root),{recursive:true}))if(file.endsWith('.png'))assert.ok(active.has(file.replaceAll('\\','/'))||superseded.has(file.replaceAll('\\','/')),`Unattached environment sprite: ${file}`);
for(const species of RED_HAT_SPECIES)for(const weapon of ['hands',...ARMED_WEAPONS])for(const stance of ['standing','kneeling','prone']){
 const frame=unitArt({species,weapon,stance,outfit:'red-hats'});
 await checkPNG(frame.src.replace('../',''),frame.width,frame.height);
}
console.log(`Verified tactical assets: ${CHARACTER_SPECIES.length*ARMED_WEAPONS.length} armed character sprites, ${CHARACTER_SPECIES.length*5*2} stance sprites, base character frames and strips, environment assets, machines, and entrypoints.`);

for(const species of ['horse','goat','donkey','sheep','cow','hen'])await checkPNG('assets/characters/red-hats/'+species+'-idle.png',256,256);

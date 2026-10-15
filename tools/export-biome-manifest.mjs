// An art contract for the integration agent. This does not register gameplay
// terrain/prop types or change movement, collision, or foliage selection.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as T from '../dist/tactics/vendor/three.module.js';
import {BIOME_FAMILIES,BIOME_PLANTS,BIOME_TEXTURES,GROUND_TILE_SIZE,MATURE_TREE_SCALE} from '../dist/tactics/biome-foliage-data.js';
import {createBiomeMaterials,configureBiomeTexture} from '../dist/tactics/biome-foliage-paint.js';
import {createBiomePlantFactory,biomePlantParts} from '../dist/tactics/biome-foliage-models.js';
import {BIOME_TREE_MIXES} from '../dist/tactics/biome-tree-mix.js';
import {SCREEN_PANELS} from '../dist/tactics/foliage-screen-paint.js';

const root=new URL('../',import.meta.url),folder=new URL('dist/assets/environment/biome-foliage/',root);
const textures=Object.fromEntries(Object.keys(BIOME_TEXTURES).map(k=>[k,configureBiomeTexture(new T.Texture())])),materials=createBiomeMaterials(textures),factory=createBiomePlantFactory(materials);
try{
 // Bake only the vertex-grounding translation. Rules consume this tiny table
 // and pure part descriptions, never Three.js or loaded textures.
 const grounding=Object.fromEntries(Object.values(BIOME_FAMILIES).flatMap(f=>f.trees).map(id=>[id,[0,1,2].map(variant=>{const p=biomePlantParts(id,variant)[0],tree=factory.create(id,{variant});return tree.children[0].position.y-(p.position?.[1]??(p.a[1]+p.b[1])/2);})]));
 const partsURL=new URL('dist/tactics/biome-plant-parts.js',root),parts=fs.readFileSync(partsURL,'utf8');
 if(!parts.includes('export const BIOME_TREE_GROUNDING='))throw Error('Missing tree grounding table');
 fs.writeFileSync(partsURL,parts.replace(/export const BIOME_TREE_GROUNDING=[\s\S]*?;\s*$/,'export const BIOME_TREE_GROUNDING='+JSON.stringify(grounding,null,1)+';\n'));
 const sources=['dist/tactics/biome-tree-mix.js','dist/tactics/foliage-obstacles.js','dist/tactics/biome-terrain.js','dist/tactics/foliage-screen-paint.js','dist/tactics/foliage-screen-surface.js','dist/tactics/foliage-screen-scene.js','dist/tactics/biome-scene.js','dist/tactics/biome-atlas-lod.js','dist/tactics/biome-foliage-data.js','dist/tactics/biome-foliage-models.js','dist/tactics/biome-plant-parts.js','dist/tactics/biome-foliage-paint.js','dist/tactics/foliage-models.js','dist/tactics/environment-geometry.js'];
 const plants=Object.fromEntries(Object.entries(BIOME_PLANTS).map(([id,spec])=>[id,{...spec,appearances:[false,...(spec.category==='tree'?[true]:[])].flatMap(mature=>[0,1,2].map(variant=>factory.create(id,{variant,mature}).userData))}]));
 const tiles=JSON.parse(fs.readFileSync(new URL('ground-tiles/tiles.json',folder)));
 const manifest={schemaVersion:1,scope:'Art assets only. Gameplay owns terrain IDs, automatic biome selection, placement, collision and density.',units:{gameTile:1,groundTextureRepeatWorldSize:GROUND_TILE_SIZE,groundTextureRepeatGameCells:[2,2],matureTreeScale:MATURE_TREE_SCALE},placement:'Each returned root starts at [0,0,0], with the lowest actual vertex at local Y=0. root.position.set(tileX, groundY, tileZ) is safe. Bounds describe the local art extent, not a collision footprint.',families:BIOME_FAMILIES,treeMixes:BIOME_TREE_MIXES,plants,ground:{manifest:'ground-tiles/tiles.json',families:tiles.families,usage:tiles.usage},sourceHashFormat:'SHA-256 of UTF-8 text with LF line endings',sources:Object.fromEntries(sources.map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL(name,root),'utf8').replace(/\r\n/g,'\n')).digest('hex')]))};
 fs.writeFileSync(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');
 const screens=new URL('dist/assets/environment/foliage-screens/',root);
 const screenManifest={schemaVersion:1,scope:'Cosmetic dense-screen backing and cutout bough paint. Existing foliage presets and finite obstacles remain authoritative.',panels:SCREEN_PANELS,assets:Object.fromEntries(['screen-atlas-v1.png','fringe-atlas-v1.png'].map(name=>{const data=fs.readFileSync(new URL(name,screens));return [name,{width:data.readUInt32BE(16),height:data.readUInt32BE(20),sha256:createHash('sha256').update(data).digest('hex'),prompt:name.startsWith('fringe')?'FRINGE-PROMPT.json':'PROMPT.json'}];}))};
 fs.writeFileSync(new URL('manifest.json',screens),JSON.stringify(screenManifest,null,2)+'\n');
 console.log(JSON.stringify({families:Object.keys(manifest.families).length,plants:Object.keys(plants).length,appearances:Object.values(plants).reduce((n,p)=>n+p.appearances.length,0),groundImages:Object.values(tiles.families).flat().length}));
}finally{factory.dispose();Object.values(materials).forEach(m=>m.dispose());Object.values(textures).forEach(t=>t.dispose());}

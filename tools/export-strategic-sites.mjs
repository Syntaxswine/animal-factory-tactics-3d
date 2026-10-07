import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {STRATEGIC_SITES,createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
import {SITE_CLEARANCE_PROFILES,SITE_STEP_CLEARANCE} from '../dist/tactics/strategic-site-clearance.js';
const texture=new THREE.Texture(),library=createStrategicSiteLibrary(texture);
try{
 const assets=[];
 for(const site of STRATEGIC_SITES)for(const state of ['intact','destroyed']){
  const asset=library.build(site.id,{state});let triangles=0,meshes=0;
  asset.root.traverse(o=>{if(o.isMesh){triangles+=o.geometry.attributes.position.count/3;meshes++;}});
  const clearance={};
  for(const profile of Object.keys(SITE_CLEARANCE_PROFILES)){
   const map=library.clearance(site.id,{state,profile});
   clearance[profile]={rows:map.rows,links:map.links.map(l=>[...l.from,...l.to]),entries:map.entries};
  }
  assets.push({id:site.id+'-'+state,siteId:site.id,name:site.name,state,tiles:site.tiles,triangles,drawCalls:meshes,height:+asset.bounds.max.y.toFixed(3),reference:'reference-'+site.id+'.png',foundations:asset.root.userData.foundations,clearance});
 }
 const manifest={
  version:3,status:'integrated-gameplay-assets',units:'1 world unit = 1 game tile; standard wall height = 2; horse model height = 1.65',
  footprint:{width:8,depth:8,anchor:'center at [0,0,0], local Y up',boundsXZ:[-4,4],slabHeight:.24},
  library:'../../../tactics/strategic-sites.js',atlas:'material-atlas.png',
  ownership:'Build results borrow cached geometry/materials/textures. Remove roots before disposing their library; input atlas remains caller-owned.',
  integration:'Registered in the shared 3D editor/game prop catalog. Gameplay uses baked model triangles, the wide standing passage mask, slab support, persistent wrecks and optional sabotage. Radio, radar and SAM strategic effects remain separate campaign work. See docs/tactics/STRATEGIC-SITES-GAMEPLAY-HANDOFF.md.',
  clearance:{status:'proposed-standing-clearance',shape:'circular-height-bands',profiles:SITE_CLEARANCE_PROFILES,stepClearance:SITE_STEP_CLEARANCE,cellOrigin:[-3.5,-3.5],placementOriginOffset:[3.5,3.5],legend:{'.':'clear and reachable','#':'blocked','o':'isolated clear pocket'},links:'[fromColumn,fromRow,toColumn,toRow], zero-based cardinal connections with continuous circular-band capsule sweeps; diagonals not defined',rows:'Row zero is local Z=-3.5; column zero is local X=-3.5. Surface is slabHeight. Keep the site placement footprint separate from its passage mask.',scope:'Neutral standing and turning clearance measured from body triangle cross-sections, plus .02 radius margin rounded up to .01. Held weapons, combat poses, cover/visibility and gameplay step heights require separate fitting.'},
  assets,
 };
 // Keep each numeric coordinate/link tuple on one line for reviewable diffs.
 const json=JSON.stringify(manifest,null,2).replace(/\[\s+(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?:,\s+-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)+)\s+\]/gi,(_,numbers)=>'['+numbers.replace(/\s+/g,' ')+']');
 fs.writeFileSync(new URL('../dist/assets/environment/strategic-sites/manifest.json',import.meta.url),json+'\n');
 console.log(assets.map(a=>a.id+': '+a.triangles+' triangles, '+a.height+' tiles tall').join('\n'));
}finally{library.dispose();texture.dispose();}

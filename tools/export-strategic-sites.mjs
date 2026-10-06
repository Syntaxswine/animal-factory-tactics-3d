import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {STRATEGIC_SITES,createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
const texture=new THREE.Texture(),library=createStrategicSiteLibrary(texture);
try{
 const assets=[];
 for(const site of STRATEGIC_SITES)for(const state of ['intact','destroyed']){
  const asset=library.build(site.id,{state});let triangles=0,meshes=0;
  asset.root.traverse(o=>{if(o.isMesh){triangles+=o.geometry.attributes.position.count/3;meshes++;}});
  assets.push({id:site.id+'-'+state,siteId:site.id,name:site.name,state,tiles:site.tiles,triangles,drawCalls:meshes,height:+asset.bounds.max.y.toFixed(3),reference:'reference-'+site.id+'.png'});
 }
 const manifest={
  version:1,status:'presentation-assets',units:'1 world unit = 1 game tile; standard wall height = 2',
  footprint:{width:8,depth:8,anchor:'center at [0,0,0], local Y up',boundsXZ:[-4,4],slabHeight:.24},
  library:'../../../tactics/strategic-sites.js',atlas:'material-atlas.png',
  ownership:'Build results borrow cached geometry/materials/textures. Remove roots before disposing their library; input atlas remains caller-owned.',
  integration:'Not registered in the gameplay/editor prop catalog. Collision, traversal, damage events and strategic effects are not defined by these art assets.',
  assets,
 };
 fs.writeFileSync(new URL('../dist/assets/environment/strategic-sites/manifest.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
 console.log(assets.map(a=>a.id+': '+a.triangles+' triangles, '+a.height+' tiles tall').join('\n'));
}finally{library.dispose();texture.dispose();}

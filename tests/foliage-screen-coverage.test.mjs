// Independent read-only-source diagnostic. Run from the repository root.
// Samples real triangle intersections, atlas alpha, finite fragment clipping,
// and visible LOD. A missing sample is not itself proof that a whole unit reads
// clearly; broad contiguous gaps and low coverage require visual review.
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {decodePNG} from '../tools/png-rgba.mjs';
import {biomePlans} from '../dist/tactics/biome-gameplay.js';
import {traceFoliage} from '../dist/tactics/foliage-obstacles.js';
import {createFoliageScreens} from '../dist/tactics/foliage-screen-scene.js';
import {createScreenMaterials,SCREEN_PANELS} from '../dist/tactics/foliage-screen-paint.js';
import {atlasRect} from '../dist/tactics/biome-foliage-paint.js';

const png=decodePNG(fs.readFileSync(new URL('../dist/assets/environment/foliage-screens/fringe-atlas-v1.png',import.meta.url)));
const alpha=new Float32Array(png.width*png.height);
for(let i=0;i<alpha.length;i++)alpha[i]=png.pixels[i*4+3]/255;
const mips=[{w:png.width,h:png.height,data:alpha}];
for(let i=1;i<=4;i++){
 const prev=mips[i-1],w=prev.w/2,h=prev.h/2,data=new Float32Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)data[y*w+x]=(prev.data[(y*2)*prev.w+x*2]+prev.data[(y*2)*prev.w+x*2+1]+prev.data[(y*2+1)*prev.w+x*2]+prev.data[(y*2+1)*prev.w+x*2+1])/4;
 mips.push({w,h,data});
}
function alphaAt(family,uv,lod){
 const r=atlasRect(SCREEN_PANELS[family]),m=mips[lod],u=r.origin[0]+Math.max(0,Math.min(1,uv.x))*r.size[0],v=r.origin[1]+Math.max(0,Math.min(1,uv.y))*r.size[1];
 const x=u*m.w-.5,y=(1-v)*m.h-.5,ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
 const at=(a,b)=>m.data[Math.max(0,Math.min(m.h-1,b))*m.w+Math.max(0,Math.min(m.w-1,a))];
 return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
}
function fixture(family,width,density){
 const map={terrain:Array.from({length:16},()=>Array(16).fill('ground-biome-'+family)),upper:[{},{}],props:[],foliage:{}};
 for(let z=5;z<11;z++)for(let x=7;x<7+width;x++)map.foliage[`${x},${z},0`]=[density,true,family==='wetlands'?'wetland-v1':'thicket-v1'];
 return map;
}
function finiteHit(point,lookup){
 const x=Math.floor(point.x+.5),z=Math.floor(point.z+.5),s=lookup.get(x+','+z);if(!s)return false;
 const radius=s.lobes[2].radius[0],q=((point.x-x)**2+(point.z-z)**2)/(radius*radius),top=s.base+s.height-.75+.75*Math.sqrt(Math.max(0,1-q));
 return point.y<=top+.04&&point.y>=s.base-.04;
}
test('actual leaf alpha and visible LOD do not expose a character-sized gap through dense strips',()=>{
const textures=[new T.Texture(),new T.Texture()],materials=createScreenMaterials(...textures),bark=new T.MeshStandardMaterial(),raycaster=new T.Raycaster(),results=[];
try{
 for(const family of ['temperate','jungle','snow','dry','wetlands'])for(const width of [1,2,6]){
  const plan=biomePlans(fixture(family,width,1))[0],lookup=new Map(plan.obstacles.screens.map(s=>[s.x+','+s.y,s]));
  const scene=createFoliageScreens(plan,{plantMaterials:{bark},screenMaterials:materials});scene.root.position.y=.008;scene.root.updateMatrixWorld(true);
  try{
   for(const [label,ppu,lod]of [['near',32,2],['far',12,4],['distant',8,4]]){
    scene.update(ppu);const meshes=[];scene.root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
    for(const [direction,dx,dz]of [['x',1,0],['z',0,1],['diagonal',Math.SQRT1_2,Math.SQRT1_2]])for(const height of [.6,1.2,1.8]){
     const misses=[];let tests=0,covered=0,longestGap=0,gap=0;
     for(let i=0;i<=120;i++){
      const offset=-4+i/15,cx=7+(width-1)/2,cz=7.5,start=new T.Vector3(cx-dz*offset-dx*12,height,cz+dx*offset-dz*12),end=new T.Vector3(cx-dz*offset+dx*12,height,cz+dx*offset+dz*12);
      if(!traceFoliage(plan.obstacles,start.toArray(),end.toArray(),'sight','world')){gap=0;continue;}tests++;
      raycaster.set(start,new T.Vector3(dx,0,dz));raycaster.near=0;raycaster.far=24;
      const hits=raycaster.intersectObjects(meshes,false);let found=false;
      for(const hit of hits){
       const material=hit.object.material;
       if(material.name.startsWith('thicket:')){if(finiteHit(hit.point,lookup)){found=true;break;}continue;}
       if(!material.name.startsWith('thicket-fringe:')){found=true;break;}
       if(finiteHit(hit.point,lookup)&&alphaAt(material.name.slice('thicket-fringe:'.length),hit.uv,lod)>=.28){found=true;break;}
      }
      if(found){covered++;gap=0;}else{gap++;longestGap=Math.max(gap,longestGap);if(misses.length<8)misses.push(Number(offset.toFixed(3)));}
     }
     results.push({family,width,density:1,lod:label,atlasMip:lod,direction,height,tests,covered,coverage:tests?Number((covered/tests).toFixed(3)):null,longestMissSpan:Number((longestGap/15).toFixed(3)),missOffsets:misses});
    }
   }
  }finally{scene.dispose();}
 }
}finally{bark.dispose();for(const m of Object.values(materials))m.dispose();textures.forEach(t=>t.dispose());}

// Point rays can graze the extreme outer edge. The important regression is
// a contiguous, character-width see-through opening in an opaque tile.
for(const r of results){
 if(r.height>=1.2)assert.ok(r.longestMissSpan<=.4,JSON.stringify(r));
 if(r.width===1&&r.direction==='x'&&r.height===1.8)assert.ok(r.coverage>=.95,JSON.stringify(r));
}
});

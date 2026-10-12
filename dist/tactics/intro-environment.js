import * as T from './vendor/three.module.js';
import {createPaintedGrass} from './painted-grass.js';
import {cliffMaterials} from './cliff-models.js';
import {foliageModel} from './foliage-models.js';
import {PLATEAU,SAM_POSITION,plateauContour,crashForest,noise} from './intro-geography.js';

export function createIntroEnvironment(foliageAtlas,{sector='crash'}={}){
 if(!['crash','sam'].includes(sector))throw Error('Unknown intro environment');
 const root=new T.Group(),geometries=new Set(),materials=new Set(),textures=new Set();root.name=sector==='crash'?'Crash sector — wooded two-tier plateau':'SAM sector — remote launch clearing';root.userData.sector=sector;
 const grass=createPaintedGrass({tint:0xb8d1a6}),cliffSet=cliffMaterials(),cliff=cliffSet[0];cliffSet[1].dispose();materials.add(grass);materials.add(cliff);
 const rimMaterial=new T.MeshStandardMaterial({color:0x62553c,roughness:1});materials.add(rimMaterial);
 function mesh(g,m,p=[0,0,0]){geometries.add(g);const o=new T.Mesh(g,m);o.position.fromArray(p);o.receiveShadow=true;root.add(o);return o;}
 const ground=new T.PlaneGeometry(sector==='crash'?300:160,sector==='crash'?280:160);ground.rotateX(-Math.PI/2);mesh(ground,grass,sector==='crash'?[-20,-.012,-55]:[SAM_POSITION[0],-.012,SAM_POSITION[2]]);
 const tiers=[];
 if(sector==='crash')for(let tier=0;tier<PLATEAU.tiers;tier++){
  const contour=plateauContour(tier),bottom=tier*PLATEAU.tierHeight,top=bottom+PLATEAU.tierHeight,walls=[],colors=[],cap=[],rim=[];
  for(let i=0;i<contour.length;i++){
   const a=contour[i],b=contour[(i+1)%contour.length],mid=(p,n)=>[p[0]+.10*Math.sin(n*1.7),bottom+1,p[1]+.13*Math.sin(n*2.3)];
   const levels=[[a[0],bottom,a[1]],mid(a,i),[a[0],top,a[1]]],other=[[b[0],bottom,b[1]],mid(b,(i+1)%contour.length),[b[0],top,b[1]]];
   for(let h=0;h<2;h++){walls.push(...levels[h],...other[h+1],...other[h],...levels[h],...levels[h+1],...other[h+1]);const s=.87+noise(i+tier*170+h)*.18;for(let j=0;j<6;j++)colors.push(.62*s,.57*s,.44*s);}
   cap.push(PLATEAU.center[0],top,PLATEAU.center[1],b[0],top,b[1],a[0],top,a[1]);
   const inner=p=>{const d=new T.Vector2(PLATEAU.center[0]-p[0],PLATEAU.center[1]-p[1]).normalize().multiplyScalar(.16);return [p[0]+d.x,top+.012,p[1]+d.y];};
   rim.push(a[0],top+.012,a[1],...inner(a),...inner(b),a[0],top+.012,a[1],...inner(b),b[0],top+.012,b[1]);
  }
  const make=(positions,m,color)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));if(color)g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.computeVertexNormals();return mesh(g,m);};
  const face=make(walls,cliff,colors);face.name='Cliff tier '+(tier+1);face.castShadow=true;
  const surface=make(cap,grass);surface.name='Plateau level '+(tier+1);make(rim,rimMaterial);tiers.push({bottom,top,contour,face,surface});
 }
 function paint(panel,color){const t=foliageAtlas.clone();t.offset.set(panel%2*.5+.012,panel<2?.512:.012);t.repeat.set(.476,.476);t.needsUpdate=true;textures.add(t);const m=new T.MeshStandardMaterial({map:t,color,roughness:1});materials.add(m);return m;}
 const mats={bark:paint(3,0xc5b994),pine:paint(2,0xa3b479),'leaf-light':paint(1,0xd0d09d)},matrices=new Map(),shapeG=new Map();
 function shape(name){if(!shapeG.has(name)){let g;if(name==='pine-tier')g=new T.ConeGeometry(.5,1,9);else if(name==='broadleaf-crown')g=new T.IcosahedronGeometry(.52,1);else g=new T.CylinderGeometry(name==='cone'?.02:.24,.5,1,7);shapeG.set(name,g);geometries.add(g);}return shapeG.get(name);}
 const placements=sector==='crash'?crashForest():Array.from({length:44},(_,i)=>{const a=i/44*Math.PI*2,r=28+noise(i+211)*16;return {x:SAM_POSITION[0]+Math.cos(a)*r,z:SAM_POSITION[2]+Math.sin(a)*r,y:0,scale:2.5+noise(i+92),kind:i%4===0?'tree-oak':'tree-pine',angle:i*2.399};});
 for(const {x,y,z,scale,kind,angle}of placements){
  const m=new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),new T.Vector3(scale,scale,scale));
  for(const part of foliageModel(kind)){const key=part.shape+':'+part.material;if(!matrices.has(key))matrices.set(key,{part,values:[]});const local=new T.Matrix4().compose(new T.Vector3(...part.center),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.size));matrices.get(key).values.push(m.clone().multiply(local));}
 }
 const foliage=new T.Group();foliage.name='Surrounding trees';root.add(foliage);
 for(const {part,values}of matrices.values()){const inst=new T.InstancedMesh(shape(part.shape),mats[part.material],values.length);values.forEach((m,i)=>inst.setMatrixAt(i,m));inst.castShadow=inst.receiveShadow=true;foliage.add(inst);}
 let disposed=false;
 return {root,foliage,tiers,trees:placements,dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}

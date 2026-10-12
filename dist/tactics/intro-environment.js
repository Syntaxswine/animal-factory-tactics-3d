import * as T from './vendor/three.module.js';
import {createPaintedGrass} from './painted-grass.js';
import {cliffMaterials} from './cliff-models.js';
import {foliageModel} from './foliage-models.js';
import {createStrategicSiteLibrary} from './strategic-sites.js';
const noise=n=>{const f=Math.sin(n*173.31+9.7)*43758.5453;return f-Math.floor(f);};

export function createIntroEnvironment(siteAtlas,foliageAtlas){
 const root=new T.Group(),geometries=new Set(),materials=new Set(),textures=new Set();root.name='Wooded plateau and crash clearing';
 const grass=createPaintedGrass(),cliffSet=cliffMaterials(),cliff=cliffSet[0];cliffSet[1].dispose();materials.add(grass);materials.add(cliff);
 function mesh(g,m,p){geometries.add(g);const o=new T.Mesh(g,m);o.position.fromArray(p);o.receiveShadow=true;root.add(o);return o;}
 const ground=new T.PlaneGeometry(150,130);ground.rotateX(-Math.PI/2);mesh(ground,grass,[0,-.012,0]);
 const top=new T.PlaneGeometry(130,60);top.rotateX(-Math.PI/2);mesh(top,grass,[0,18,-38]);
 // Nine ordinary wall-height strata make the cinematic plateau. This never
 // changes the gameplay cliff tile height or its traversal/occupancy rules.
 const p=[],colors=[],ix=[];for(let y=0;y<=9;y++)for(let x=0;x<=65;x++){const z=-8+(y===9?0:.22*Math.sin(x*.79+y*2.7));p.push(x*2-65,y*2,z);const shade=.84+noise(x*3+y*23)*.17;colors.push(.62*shade,.57*shade,.44*shade);}
 for(let y=0;y<9;y++)for(let x=0;x<65;x++){const a=y*66+x;ix.push(a,a+1,a+66,a+1,a+67,a+66);}const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(p,3));cg.setAttribute('color',new T.Float32BufferAttribute(colors,3));cg.setIndex(ix);cg.computeVertexNormals();mesh(cg,cliff,[0,0,0]);
 function paint(panel,color){const t=foliageAtlas.clone();t.offset.set(panel%2*.5+.012,panel<2?.512:.012);t.repeat.set(.476,.476);t.needsUpdate=true;textures.add(t);const m=new T.MeshStandardMaterial({map:t,color,roughness:1});materials.add(m);return m;}
 const mats={bark:paint(3,0xc5b994),pine:paint(2,0xa3b479),'leaf-light':paint(1,0xd0d09d)};
 const matrices=new Map(),shapeG=new Map();
 function shape(name){if(!shapeG.has(name)){let g;if(name==='pine-tier')g=new T.ConeGeometry(.5,1,9);else if(name==='broadleaf-crown')g=new T.IcosahedronGeometry(.52,1);else g=new T.CylinderGeometry(name==='cone'?.02:.24,.5,1,7);shapeG.set(name,g);geometries.add(g);}return shapeG.get(name);}
 const placements=[];for(let i=0;i<92;i++){let x=-52+noise(i+11)*106,z=-5+noise(i+101)*39;const topTree=i>=66;if(topTree)z=-13-noise(i+17)*27;
  // Keep the flight corridor and crash clearing genuinely open, including
  // crown radii, rather than just checking trunk centers.
  if(!topTree&&x>-8&&x<22&&z>-1&&z<11)continue;
  if(!topTree&&z>6&&Math.abs(x-(9+.6*(z-3.5)))<12)continue;
  if(topTree&&Math.hypot(x-10,z+16)<9)continue;
  const scale=2.9+noise(i+19)*1.6,kind=i%4===0?'tree-oak':'tree-pine',m=new T.Matrix4().compose(new T.Vector3(x,topTree?18:0,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),i*2.399),new T.Vector3(scale,scale,scale));placements.push({x,z,scale,top:topTree});
  for(const part of foliageModel(kind)){const key=part.shape+':'+part.material;if(!matrices.has(key))matrices.set(key,{part,values:[]});const local=new T.Matrix4().compose(new T.Vector3(...part.center),new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),new T.Vector3(...part.size));matrices.get(key).values.push(m.clone().multiply(local));}
 }
 const foliage=new T.Group();foliage.name='Surrounding trees';root.add(foliage);
 for(const {part,values}of matrices.values()){const inst=new T.InstancedMesh(shape(part.shape),mats[part.material],values.length);values.forEach((m,i)=>inst.setMatrixAt(i,m));inst.castShadow=inst.receiveShadow=true;foliage.add(inst);}
 const library=createStrategicSiteLibrary(siteAtlas),relay=library.build('radio');relay.root.position.set(18,18,-20);root.add(relay.root);let disposed=false;
 return {root,relay,foliage,trees:placements,dispose(){if(disposed)return;disposed=true;root.removeFromParent();library.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}

import * as T from './vendor/three.module.js';
import {createCasualtyWeaponDrop} from './casualty-weapon-drop.js';

// Snapshot every currently displayed component in gun space. In particular the
// fuel pack and flexible hose must not be left floating in the living pose.
// The released assembly is a bounded rigid approximation, not a tether solver.
export function createCasualtyWeaponAssembly(weapon,{floor,velocity}={}){
 if(!weapon?.anchors?.grip||!weapon.root.visible)return null;
 const roots=[weapon.root,weapon.mount,weapon.hose].filter((r,i,a)=>r?.visible&&a.indexOf(r)===i),inverse=new T.Matrix4().copy(weapon.root.matrixWorld).invert(),groups=new Map();
 for(const root of roots)root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.isSkinnedMesh)return;let at=mesh;while(at&&at!==root.parent){if(!at.visible)return;at=at.parent;}
  const g=mesh.geometry,a=g.attributes,transform=inverse.clone().multiply(mesh.matrixWorld),normal=new T.Matrix3().getNormalMatrix(transform),parts=g.groups.length?g.groups:[{start:0,count:g.index?.count??a.position.count,materialIndex:0}];
  for(const range of parts){const material=Array.isArray(mesh.material)?mesh.material[range.materialIndex]:mesh.material;if(!groups.has(material))groups.set(material,{position:[],normal:[],uv:[],dropLocalPosition:[],dropLocalNormal:[]});const data=groups.get(material);
   for(let j=range.start;j<range.start+range.count;j++){const id=g.index?g.index.getX(j):j,p=new T.Vector3().fromBufferAttribute(a.position,id),n=new T.Vector3().fromBufferAttribute(a.normal,id);data.dropLocalPosition.push(...p.toArray());data.dropLocalNormal.push(...n.toArray());data.position.push(...p.applyMatrix4(transform).toArray());data.normal.push(...n.applyMatrix3(normal).normalize().toArray());data.uv.push(a.uv?.getX(id)||0,a.uv?.getY(id)||0);}
  }
 });
 if(groups.size>9)throw Error('Released assembly exceeds its nine-material budget');
 const root=new T.Group(),geometries=[];
 for(const [material,data]of groups){const g=new T.BufferGeometry();for(const [name,values]of Object.entries(data))g.setAttribute(name,new T.Float32BufferAttribute(values,name==='uv'?2:3));geometries.push(g);root.add(new T.Mesh(g,material));}
 let drop;try{
  drop=createCasualtyWeaponDrop({root,anchors:weapon.anchors});if(!drop){geometries.forEach(g=>g.dispose());return null;}
  drop.root.traverse(mesh=>{if(!mesh.isMesh)return;const material=mesh.material,original=material.onBeforeCompile,key=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,...args){original.call(this,shader,...args);shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 dropLocalPosition,dropLocalNormal;').replace('vPaintP=position;vPaintN=normal;','vPaintP=dropLocalPosition;vPaintN=dropLocalNormal;');};material.customProgramCacheKey=()=>key+';released-assembly-local-paint-v1';
  });
  drop.capture(weapon.root.matrixWorld,{floor,velocity});
 }catch(error){drop?.dispose();geometries.forEach(g=>g.dispose());throw error;}
 let disposed=false;return {root:drop.root,sourceRoots:roots,drawCalls:groups.size,update:drop.update,dispose(){if(disposed)return;disposed=true;drop.dispose();for(const g of geometries)g.dispose();}};
}

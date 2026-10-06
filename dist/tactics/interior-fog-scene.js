import * as T from './vendor/three.module.js';
import {DIMENSIONS as D} from './hybrid-world.js';
import {interiorCells,concealedInteriorCells,knownInteriorRooms} from './interior-fog.js';

export class InteriorFogScene {
 constructor(scene){
  this.scene=scene;this.hidden=new Set();this.shown=new Set();this.cells=[];
  this.geometry=new T.BoxGeometry(1,D.wall-.04,1);
  this.material=new T.MeshBasicMaterial({color:0x000000,toneMapped:false});
 }
 update(state,world){
  if(this.world!==world){this.world=world;this.cells=interiorCells(state);}
  const hidden=concealedInteriorCells(this.cells,state),known=knownInteriorRooms(this.cells,state),cells=hidden.filter(p=>known.has(p.room));
  if(hidden.length===this.hidden.size&&hidden.every(p=>this.hidden.has(p.key))&&cells.length===this.shown.size&&cells.every(p=>this.shown.has(p.key)))return;
  this.hidden.clear();for(const p of hidden)this.hidden.add(p.key);
  this.shown.clear();for(const p of cells)this.shown.add(p.key);
  this.mesh?.removeFromParent();this.mesh?.dispose();this.mesh=null;
  if(!cells.length)return;
  const mesh=new T.InstancedMesh(this.geometry,this.material,cells.length),matrix=new T.Matrix4();
  cells.forEach((p,i)=>{matrix.makeTranslation(p.x,p.z*D.floorSpacing+(D.wall-.04)/2,p.y);mesh.setMatrixAt(i,matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name='unexplored-room-interiors';
  mesh.userData.noShadow=true;mesh.raycast=()=>{};this.scene.add(mesh);this.mesh=mesh;
 }
 dispose(){this.mesh?.removeFromParent();this.mesh?.dispose();this.mesh=null;this.geometry.dispose();this.material.dispose();this.hidden.clear();this.shown.clear();this.cells=[];this.world=null;}
}

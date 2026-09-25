import * as T from './vendor/three.module.js';
import {createCliffTiles} from './cliff-tiles.js';
import {isCliff,cliffTiles} from './cliff-map.js';
import {DIMENSIONS} from './hybrid-world.js';
import {terrainKnown} from './battle-visibility.js';
import {isRampTerrain} from './cliff-ramp-surfaces.js';
import {propCells} from './core/environment.js';
// Clip visibility after welding: discovering a neighbor must never reshape rock.
export function hideUnknownCliffTriangles(geometry,known){
 const positions=geometry.attributes.position,indices=[],groups=[];
 for(const group of geometry.groups){
  const start=indices.length;
  for(let i=group.start;i<group.start+group.count;i+=3){
   const x=(positions.getX(i)+positions.getX(i+1)+positions.getX(i+2))/3,y=(positions.getZ(i)+positions.getZ(i+1)+positions.getZ(i+2))/3;
   if(known(Math.floor(x-1e-7),Math.floor(y-1e-7))||known(Math.floor(x+1e-7),Math.floor(y+1e-7)))indices.push(i,i+1,i+2);
  }
  groups.push({start,count:indices.length-start,materialIndex:group.materialIndex});
 }
 geometry.setIndex(indices);geometry.clearGroups();for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);
}
export class CliffMapScene {
 constructor(scene){this.group=new T.Group();scene.add(this.group);this.parts=[];}
 rebuild(map,level,{editor=false}={}){
  const props=(map.props||[]).filter(p=>(isCliff(p)||isRampTerrain(p))&&(p.z||0)<=level),known=(x,y,z)=>editor||terrainKnown(map,z?`${x},${y},${z}`:`${x},${y}`);
  const signature=JSON.stringify([props,level,editor,props.flatMap(p=>(isRampTerrain(p)?propCells(p):[p]).map(q=>[known(q.x,q.y,q.z||0),(map.map||map.terrain)?.[q.y]?.[q.x]==='water']))]);if(signature===this.signature)return;this.signature=signature;this.clear();
  for(let z=0;z<=level;z++){
   const tiles=cliffTiles(props,z),ramps=props.filter(p=>isRampTerrain(p)&&(p.z||0)===z);if(!tiles.length&&!ramps.length)continue;
   const wet=props.some(p=>(p.z||0)===z&&(map.map||map.terrain)?.[p.y]?.[p.x]==='water'),part=createCliffTiles('mixed',tiles,{water:wet,ramps});
   if(!editor)hideUnknownCliffTriangles(part.mesh.geometry,(x,y)=>known(x,y,z));
   part.root.position.set(-.5,z*DIMENSIONS.floorSpacing,-.5);
   if(editor&&z<level)for(const material of part.original)material.color.multiplyScalar(.38);
   this.parts.push(part);this.group.add(part.root);
  }
 }
 clear(){for(const part of this.parts){part.root.removeFromParent();part.dispose();}this.parts=[];}
 dispose(){this.clear();this.group.removeFromParent();}
}

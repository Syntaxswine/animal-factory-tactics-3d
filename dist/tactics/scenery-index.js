import {mapGeometryRevision} from './map-geometry-cache.js';
const EMPTY=Object.freeze([]);
const fields=['x','y','z','kind','rotated','rotation'];
// Footprint indexes depend only on placement, not inventories, dialogue or paint.
// Exact snapshots avoid JSON allocation while detecting mutable editor changes.
// Live encounters use the existing explicit geometry invalidation contract.
export class SceneryIndex{
 constructor(build){this.build=build;this.entries=new WeakMap();}
 get(map){
  const props=map.props||EMPTY,revision=mapGeometryRevision(map),old=this.entries.get(props);
  if(old&&revision!==undefined&&old.revision===revision)return old.index;
  if(old&&old.stamp.length===props.length&&props.every((p,i)=>old.stamp[i][0]===p&&fields.every((k,j)=>old.stamp[i][j+1]===p[k]))){old.revision=revision;return old.index;}
  const index=this.build(props),stamp=props.map(p=>[p,...fields.map(k=>p[k])]);this.entries.set(props,{revision,stamp,index});return index;
 }
}

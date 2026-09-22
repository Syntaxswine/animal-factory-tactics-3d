import * as T from '../dist/tactics/vendor/three.module.js';
export function stanceSurfaces(worker){
 const result={body:Infinity,weapon:Infinity,knees:[Infinity,Infinity],feet:[Infinity,Infinity]},v=new T.Vector3();
 for(const part of worker.parts){const a=part.geometry.attributes.position;
  for(let i=0;i<a.count;i++){part.getVertexPosition(i,v);v.applyMatrix4(part.matrixWorld);result.body=Math.min(result.body,v.y);
   const side=a.getZ(i)<0?0:1;if(/hoof|boot|foot/.test(part.name))result.feet[side]=Math.min(result.feet[side],v.y);
   if(/overalls|trouser/.test(part.name)&&a.getY(i)>.40&&a.getY(i)<.53)result.knees[side]=Math.min(result.knees[side],v.y);
  }
 }
 worker.weapon?.root.traverse(part=>{if(!part.isMesh||!part.visible)return;const a=part.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(part.matrixWorld);result.weapon=Math.min(result.weapon,v.y);}});
 return result;
}

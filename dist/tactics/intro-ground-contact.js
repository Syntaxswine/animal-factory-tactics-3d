import * as T from './vendor/three.module.js';
import {createUtilityHelicopter} from './utility-helicopter.js';

// Read the actual approved rail vertices once, then dispose the temporary
// assets. The timeline and smoke emitter share this pure support calculation.
let rails;
function supportVertices(){
 if(rails)return rails;
 const intact=createUtilityHelicopter(null),wreck=createUtilityHelicopter(null,{state:'survivable'});
 try{intact.root.updateMatrixWorld(true);wreck.root.updateMatrixWorld(true);rails=[];
  for(const side of [-1,1]){const a=intact.root.getObjectByName('Landing skid '+side),b=wreck.root.getObjectByName('Collapsed landing skid '+side),from=a.geometry.attributes.position,to=b.geometry.attributes.position;
   if(from.count!==to.count)throw Error('Landing support topology mismatch');
   for(let i=0;i<from.count;i++)rails.push([new T.Vector3().fromBufferAttribute(from,i).applyMatrix4(a.matrixWorld),new T.Vector3().fromBufferAttribute(to,i).applyMatrix4(b.matrixWorld)]);
  }return rails;
 }finally{intact.dispose();wreck.dispose();}
}
export function landingSupportHeight(compression,roll,yaw,pitch){
 const q=new T.Quaternion().setFromEuler(new T.Euler(roll,yaw,pitch)),p=new T.Vector3();let lowest=Infinity;
 for(const [a,b]of supportVertices())lowest=Math.min(lowest,p.copy(a).lerp(b,compression).applyQuaternion(q).y);
 const height=.002-lowest;return Math.abs(height)<1e-12?0:height;
}

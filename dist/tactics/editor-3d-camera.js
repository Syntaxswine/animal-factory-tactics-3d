import * as T from './vendor/three.module.js';
import {DIMENSIONS} from './hybrid-world.js';
export function setInspectionCamera(camera,{x,y,level=0,span=24,preset='0'},width,height){
 const aspect=width/Math.max(1,height),target=new T.Vector3(x,level*DIMENSIONS.floorSpacing,y);
 camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=1800;
 if(preset==='top'){camera.up.set(0,0,-1);camera.position.copy(target).add(new T.Vector3(0,800,0));}
 else{const a=Math.PI/4+Number(preset)*Math.PI/2;camera.up.set(0,1,0);camera.position.copy(target).add(new T.Vector3(Math.sin(a)*Math.sqrt(3)*400,400,Math.cos(a)*Math.sqrt(3)*400));}
 camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
export function floorPoint(camera,x,y,width,height,level){
 const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x/width*2-1,1-y/height*2),camera);
 const point=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-level*DIMENSIONS.floorSpacing),new T.Vector3());
 return point?{x:point.x,y:point.z,z:level}:null;
}

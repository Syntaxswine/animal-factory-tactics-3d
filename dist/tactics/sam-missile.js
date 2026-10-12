import * as T from './vendor/three.module.js';
import {createIntroPaint} from './intro-paint.js';

export const SAM_MISSILE=Object.freeze({bodyLength:2.85,radius:.17,noseLength:.68,finSpan:1.08,finThickness:.035,finAngles:[0,Math.PI/2],nose:2.105,exhaust:-1.47});

// +X forward. TWO complete perpendicular plates pass through the cylinder.
// Four exposed fins are the ends of those plates, not four floating wedges.
export function createSAMMissile(atlas){
 const root=new T.Group();root.name='SAM missile — perpendicular through-body fins';const kit=createIntroPaint(atlas),shell=new T.Group();root.add(shell);
 kit.cylinder(shell,'Central cylinder',.17,.17,2.85,[0,0,0],1,[0,0,-Math.PI/2],16);
 kit.cylinder(shell,'Red nose',0,.17,.68,[1.765,0,0],0,[0,0,-Math.PI/2],16);
 for(const x of [-.94,.97])kit.cylinder(shell,'Body band '+x,.176,.176,.055,[x,0,0],4,[0,0,-Math.PI/2],16);
 kit.cylinder(shell,'Exhaust collar',.14,.14,.045,[-1.4475,0,0],4,[0,0,-Math.PI/2]);
 kit.cylinder(shell,'Exhaust throat',.115,.115,.004,[-1.472,0,0],5,[0,0,-Math.PI/2]);
 const fins=SAM_MISSILE.finAngles.map((angle,i)=>{
  const shape=new T.Shape();shape.moveTo(-1.30,-.54);shape.lineTo(-.77,-.48);shape.lineTo(-.49,-.12);shape.lineTo(-.49,.12);shape.lineTo(-.77,.48);shape.lineTo(-1.30,.54);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:false,steps:1});g.translate(0,0,-.0175);
  const m=kit.add(root,'Continuous fin plate '+(i+1),g,1,[0,0,0],[angle,0,0]);m.userData.finPlaneAngle=angle;return m;
 });
 const wireGeometry=new T.EdgesGeometry(shell.children[0].geometry),wireMaterial=new T.LineBasicMaterial({color:0xc9b880,transparent:true,opacity:.42});
 const wire=new T.LineSegments(wireGeometry,wireMaterial);wire.rotation.z=-Math.PI/2;wire.visible=false;root.add(wire);
 let disposed=false;
 return {root,shell,fins,
  setSection(value){shell.visible=!value;wire.visible=!!value;},setGrey:kit.setGrey,
  diagnostics(){root.updateMatrixWorld(true);return {triangles:kit.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0),finPlates:fins.length,planeAngleDegrees:90,span:SAM_MISSILE.finSpan,scale:root.scale.toArray()};},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();kit.dispose();wireGeometry.dispose();wireMaterial.dispose();}
 };
}

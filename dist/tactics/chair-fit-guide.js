import * as T from './vendor/three.module.js';
import {CHAIR_CONTACT as C,CHAIR_PLAN_SCALE} from './painted-chairs.js';

// A furniture fitting mannequin, deliberately not a skinned-character clip.
// Same proportions and contacts for every chair; no model-ID special cases.
const referencePoints={
 pelvis:[0,.62,-.03],chest:[0,1.02,.035],head:[0,1.31,.04],
 leftHip:[-.18,.61,-.03],rightHip:[.18,.61,-.03],
 leftKnee:[-.23,.57,.43],rightKnee:[.23,.57,.43],
 leftAnkle:[-.23,.08,.43],rightAnkle:[.23,.08,.43],
 leftShoulder:[-.25,1.06,.035],rightShoulder:[.25,1.06,.035],
 leftElbow:[-.32,.80,.12],rightElbow:[.32,.80,.12],
 leftHand:[-.23,.66,.31],rightHand:[.23,.66,.31]
};
export const CHAIR_FIT_POINTS=Object.freeze(Object.fromEntries(Object.entries(referencePoints).map(([name,p])=>[name,[p[0],p[1]-(name.includes('Ankle')?0:.48-C.seatHeight),/Knee|Ankle/.test(name)?C.feet[0][2]:p[2]*CHAIR_PLAN_SCALE]])));
export function createChairFitGuide(){
 const root=new T.Group(),geometries=[],materials=[];
 const flesh=new T.MeshStandardMaterial({color:0xf6bd67,transparent:true,opacity:.30,roughness:1,depthWrite:false}),line=new T.LineBasicMaterial({color:0xffd488}),contact=new T.MeshBasicMaterial({color:0x7bf2c4});materials.push(flesh,line,contact);
 function ellipsoid(name,p,scale){const g=new T.SphereGeometry(1,10,6),m=new T.Mesh(g,flesh);geometries.push(g);m.name=name;m.position.fromArray(p);m.scale.fromArray(scale);root.add(m);}
 ellipsoid('Seat contact envelope',CHAIR_FIT_POINTS.pelvis,[.34,.14,.22]);
 ellipsoid('Torso clearance',CHAIR_FIT_POINTS.chest,[.30,.28,.16]);
 ellipsoid('Head clearance',CHAIR_FIT_POINTS.head,[.13,.17,.13]);
 const segments=[['pelvis','chest',.12],['chest','head',.065]];
 for(const side of ['left','right'])segments.push([side+'Hip',side+'Knee',.085],[side+'Knee',side+'Ankle',.065],[side+'Shoulder',side+'Elbow',.055],[side+'Elbow',side+'Hand',.05]);
 for(const [a,b,r]of segments){const start=new T.Vector3(...CHAIR_FIT_POINTS[a]),end=new T.Vector3(...CHAIR_FIT_POINTS[b]),g=new T.CylinderGeometry(r,r,start.distanceTo(end),8),m=new T.Mesh(g,flesh);m.name=a+' → '+b;geometries.push(g);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());root.add(m);}
 const edges=[];for(const [a,b]of segments)edges.push(...CHAIR_FIT_POINTS[a],...CHAIR_FIT_POINTS[b]);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(edges,3));geometries.push(g);root.add(new T.LineSegments(g,line));
 for(const p of [C.seatCenter,...C.feet]){const g=new T.SphereGeometry(.018,8,4),m=new T.Mesh(g,contact);geometries.push(g);m.position.fromArray(p);root.add(m);}
 let disposed=false;return {root,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofMantle} from '../dist/tactics/roof-mantle.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';

const V=()=>new T.Vector3(),EPS=1e-7;
function soup(mesh){
 const g=mesh.geometry,index=g.index,vertices=Array.from({length:g.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld)),triangles=[];
 for(let i=0;i<(index?.count||vertices.length);i+=3){const points=[0,1,2].map(j=>vertices[index?index.getX(i+j):i+j]);triangles.push({points,box:new T.Box3().setFromPoints(points)});}
 return {vertices,triangles,box:new T.Box3().setFromPoints(vertices)};
}
function edgeHitsTriangle(a,b,triangle){
 const direction=b.clone().sub(a),length=direction.length();if(length<EPS)return false;
 const hit=new T.Ray(a,direction.multiplyScalar(1/length)).intersectTriangle(...triangle.points,false,V());
 return !!hit&&a.distanceTo(hit)>EPS&&a.distanceTo(hit)<length-EPS;
}
// Three non-axis-aligned rays vote on containment. Shared triangle edges are
// deduplicated, so the count does not double at a triangulation diagonal.
function inside(point,body){
 if(!body.box.containsPoint(point))return false;
 let votes=0;
 for(const direction of [[1,.371,.193],[.217,1,.437],[.317,.223,1]]){
  const ray=new T.Ray(point,new T.Vector3(...direction).normalize()),distances=[];
  for(const triangle of body.triangles){const hit=ray.intersectTriangle(...triangle.points,false,V());if(hit){const distance=point.distanceTo(hit);if(distance<EPS)return false;if(!distances.some(d=>Math.abs(d-distance)<1e-6))distances.push(distance);}}
  if(distances.length%2)votes++;
 }
 return votes>=2;
}
function intersects(a,b){
 if(!a.box.intersectsBox(b.box))return null;
 for(const first of a.triangles)for(const second of b.triangles){
  if(!first.box.intersectsBox(second.box))continue;
  for(let i=0;i<3;i++)if(edgeHitsTriangle(first.points[i],first.points[(i+1)%3],second)||edgeHitsTriangle(second.points[i],second.points[(i+1)%3],first))return 'triangle crossing';
 }
 // Surface-only intersection misses a small cartridge wholly inside the tail.
 if(a.vertices.some(p=>inside(p,b)))return 'equipment contained in tail';
 if(b.vertices.some(p=>inside(p,a)))return 'tail contained in equipment';
 return null;
}
function edgeDistanceSquared(a,b,c,d){
 const direction=b.clone().sub(a),length=direction.length(),closest=V();
 if(length<EPS)return new T.Line3(c,d).closestPointToPoint(a,true,closest).distanceToSquared(a);
 const distance=new T.Ray(a,direction.multiplyScalar(1/length)).distanceSqToSegment(c,d,closest,V());
 return a.distanceTo(closest)<=length+EPS?distance:new T.Line3(c,d).closestPointToPoint(b,true,V()).distanceToSquared(b);
}
function clearanceBelow(a,b,limit){
 if(!a.box.clone().expandByScalar(limit).intersectsBox(b.box))return Infinity;
 let minimum=Infinity;
 for(const first of a.triangles)for(const second of b.triangles){
  if(!first.box.clone().expandByScalar(limit).intersectsBox(second.box))continue;
  const ta=new T.Triangle(...first.points),tb=new T.Triangle(...second.points);
  for(let i=0;i<3;i++){
   minimum=Math.min(minimum,tb.closestPointToPoint(first.points[i],V()).distanceToSquared(first.points[i]),ta.closestPointToPoint(second.points[i],V()).distanceToSquared(second.points[i]));
   for(let j=0;j<3;j++)minimum=Math.min(minimum,edgeDistanceSquared(first.points[i],first.points[(i+1)%3],second.points[j],second.points[(j+1)%3]));
  }
 }
 return Math.sqrt(Math.max(0,minimum));
}

test('equipment/tail intersection predicate detects crossing and enclosure without equating overlapping bounds to a collision',()=>{
 const material=new T.MeshBasicMaterial(),make=(geometry,x,y,z)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.updateMatrixWorld(true);return m;};
 const a=make(new T.BoxGeometry(1,1,1),0,0,0),cross=make(new T.BoxGeometry(1,1,1),.75,.2,.1),contained=make(new T.BoxGeometry(.1,.1,.1),0,0,0),sphere=make(new T.SphereGeometry(.5,20,14),0,0,0),corner=make(new T.BoxGeometry(.08,.08,.08),.46,.46,.46),near=make(new T.BoxGeometry(1,1,1),1.001,0,0);
 try{assert(intersects(soup(cross),soup(a)));assert.equal(intersects(soup(contained),soup(a)),'equipment contained in tail');assert(soup(sphere).box.intersectsBox(soup(corner).box));assert.equal(intersects(soup(corner),soup(sphere)),null);assert.equal(intersects(soup(near),soup(a)),null);assert(Math.abs(clearanceBelow(soup(near),soup(a),.002)-.001)<1e-7,'near miss must retain its actual one-millimetre gap');}finally{for(const m of [a,cross,contained,sphere,corner,near])m.geometry.dispose();material.dispose();}
});

const categories={receiver:/receiver|action|feed lid|lid top/,ammunition:/ammunition|belt|cartridge/,bipod:/bipod/,sling:/Equipment shoulder sling/};
for(const [category,pattern]of Object.entries(categories))test(`skunk HMG ${category} clears the actual posed tail through press, leg swing, settle and gather`,()=>{
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='skunk'),w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),gun=createWeaponModel('hmg');w.equipWeapon(gun);
 const motion=createRoofMantle(w,profile),tail=w.parts.find(p=>p.name==='skunk tail plume');assert(tail);
 try{
  // Include the reported 2.69–3.35 interval, phase boundaries and the later
  // supported sprawl/gather. Source tail geometry is skinned anew every frame.
  const times=new Set([2.69,2.7,3.35,4.15,4.65,4.9]);for(let i=0;i<=44;i++)times.add(2+i*.075);for(const p of motion.phases)if(p.start>=2&&p.start<=5.3)times.add(p.start);
  for(const time of [...times].sort((a,b)=>a-b)){
   motion.apply(time/motion.duration);const posedTail=soup(tail),meshes=[];
   w.root.traverse(o=>{if(!o.isMesh||!pattern.test(o.name))return;for(let p=o;p;p=p.parent)if(!p.visible)return;meshes.push(o);});assert(meshes.length,'missing '+category+' geometry');
   for(const mesh of meshes){const equipment=soup(mesh),collision=intersects(equipment,posedTail);assert.equal(collision,null,`${mesh.name}: ${collision} at ${time.toFixed(3)} seconds`);const gap=clearanceBelow(equipment,posedTail,.002);assert(gap>=.002,`${mesh.name}: only ${gap.toFixed(6)} tail clearance at ${time.toFixed(3)} seconds`);}
  }
 }finally{motion.dispose();gun.dispose();w.dispose();}
});

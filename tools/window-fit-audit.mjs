// Independent posed triangle/solid audit. Geometry clearance is not dynamics approval.
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createAnimalWindowMotion} from '../dist/tactics/animal-window-motion.js';
import {WINDOW_SOLIDS} from '../dist/tactics/body-collisions.js';
import {fitRedHatGeometry,RED_HAT_FITS} from '../dist/tactics/red-hat-model.js';
const arg=(key,fallback)=>process.argv.find(s=>s.startsWith('--'+key+'='))?.split('=')[1]??fallback;
const id=arg('animal','pig-director'),outfit=arg('outfit','normal'),step=Number(arg('step','.04')),baseline=process.argv.includes('--baseline');
if(!Number.isFinite(step)||step<=0||step>1)throw Error('Audit step must be in (0,1]');
const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id);if(!profile)throw Error('Unknown species');
const data=p=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)));
const worker=profile.create(data(profile));let cap;
if(outfit==='red-hats'&&RED_HAT_FITS[id]){
 const donorProfile=ANIMAL_MOTION_CATALOG.find(p=>p.id==='pig-foreman'),donor=donorProfile.create(data(donorProfile));
 worker.root.updateMatrixWorld(true);const head=worker.bones.find(b=>b.name==='head');
 cap=new T.Mesh(fitRedHatGeometry(donor.parts.find(p=>p.name.includes('service cap')).geometry,head,RED_HAT_FITS[id]),new T.MeshBasicMaterial());head.add(cap);donor.dispose();
}
const motion=createAnimalWindowMotion(worker,profile,{fitting:!baseline});
const solids=WINDOW_SOLIDS.map(s=>({name:s.name,box:new T.Box3(new T.Vector3(...s.lo).addScalar(.001),new T.Vector3(...s.hi).addScalar(-.001))}));
const tri=new T.Triangle(),bounds=new T.Box3(),report={animal:id,outfit,baseline,step,method:'All indexed posed triangles versus finite window boxes inset by .001 tile; floor vertex depth; no self/dynamics certification',samples:0,wallSamples:0,floorSamples:0,peakWall:{count:0,time:0,parts:{}},peakFloor:{depth:0,time:0},peakMarker:{error:0,time:0},finalBounds:null};
try{
 for(let i=0;i<=Math.ceil(8/step);i++){
  const time=Math.min(8,i*step),d=motion.sample(time),parts={};let count=0,minY=Infinity;const all=new T.Box3();
  worker.root.traverseVisible(m=>{if(!m.isMesh)return;const attr=m.geometry.attributes.position,points=Array.from({length:attr.count},(_,j)=>m.getVertexPosition(j,new T.Vector3()).applyMatrix4(m.matrixWorld));for(const p of points){minY=Math.min(minY,p.y);all.expandByPoint(p);}const idx=m.geometry.index,indices=idx?idx.array:Array.from({length:points.length},(_,j)=>j);
   for(let j=0;j<indices.length;j+=3){tri.set(points[indices[j]],points[indices[j+1]],points[indices[j+2]]);bounds.setFromPoints([tri.a,tri.b,tri.c]);if(solids.some(s=>s.box.intersectsBox(bounds)&&s.box.intersectsTriangle(tri))){count++;parts[m.name]=(parts[m.name]||0)+1;}}
  });
  report.samples++;if(count)report.wallSamples++;if(minY<-.001)report.floorSamples++;if(count>report.peakWall.count)report.peakWall={count,time,parts};if(-minY>report.peakFloor.depth)report.peakFloor={depth:-minY,time};for(const e of d.errors)if(e.error>report.peakMarker.error)report.peakMarker={error:e.error,time,name:e.name};if(time===8)report.finalBounds={min:all.min.toArray(),max:all.max.toArray()};
 }
 report.geometryClear=report.wallSamples===0&&report.floorSamples===0;
 fs.mkdirSync(new URL('../artifacts/window-fit/',import.meta.url),{recursive:true});fs.writeFileSync(new URL(`../artifacts/window-fit/${id}-${outfit}${baseline?'-baseline':''}.json`,import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(process.argv.includes('--strict')&&!report.geometryClear)process.exitCode=1;
}finally{motion.dispose();if(cap){cap.removeFromParent();cap.geometry.dispose();cap.material.dispose();}worker.dispose();}

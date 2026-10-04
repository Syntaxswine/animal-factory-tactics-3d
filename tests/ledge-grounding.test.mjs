import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createRoofJourney} from '../dist/tactics/roof-journey.js';
import {createCliffJourney} from '../dist/tactics/cliff-journey.js';
import {createDescentJourney} from '../dist/tactics/ledge-descent-journey.js';
import {ledgeHeightFrame} from '../dist/tactics/ledge-height-frame.js';
const near=(a,b,label,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${label}: ${a} versus ${b}`);
function minSole(worker){let min=Infinity;for(const p of worker.parts.filter(p=>/hoof|boot|foot|toes/i.test(p.name)))for(let i=0;i<p.geometry.attributes.position.count;i++)min=Math.min(min,p.getVertexPosition(i,new T.Vector3()).applyMatrix4(p.matrixWorld).y);return min;}
for(const [n,profile]of ANIMAL_MOTION_CATALOG.entries())for(const kind of ['roof','cliff'])for(const down of [false,true])test(`${profile.id} ${kind} ${down?'descent':'ascent'} has distinct grounded floor and lip contacts`,()=>{
 const w=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),height=kind==='roof'?2.12:2,base=n%2?2.12:0,heading=n%4*90,dx=Math.round(Math.cos(heading*Math.PI/180)),dy=Math.round(Math.sin(heading*Math.PI/180)),a={x:4,y:5,z:base?1:0},b={x:4+dx,y:5+dy,z:a.z+1};
 const event=down?{from:b,to:a}:{from:a,to:b},frame={origin:[4+dx*.5,base,5+dy*.5],heading,ledgeHeight:height,fromWorld:down?[b.x,base+height,b.y]:[a.x,base,a.y],toWorld:down?[a.x,base,a.y]:[b.x,base+height,b.y]},journey=down?createDescentJourney(w,profile,event,frame):kind==='roof'?createRoofJourney(w,profile,event,frame):createCliffJourney(w,profile,event,frame);
 const lengths=[];w.root.traverse(b=>{if(b.isBone&&b.parent.isBone)lengths.push([b,b.position.length()]);});
 try{
  // Check lower-floor preparation and landing before the adapter endpoint can
  // hide a height mismatch, plus the opposite supported interval and rewinds.
  const low=down?[2.86,3.13,4.13,4.38,4.63]:[0,.175,.35,.80,1.10],high=down?[.35,.90,1.20,1.50]:[5.95,6.30,6.60,7.10];
  for(const [times,plane]of [[low,base],[high,base+height]])for(const t of [...times,...times.toReversed()]){
   const pose=journey.apply(Math.min(1,t/journey.duration));near(minSole(w),plane,'actual grounded sole',.018);
   // Contacts inside the clip are transformed by the height-adjusted frame.
   // Entry/exit contact translation itself remains the Stage 2 repair.
   if(t>=.35&&t<=journey.duration-.5)for(const c of pose.contacts.filter(c=>c.planted))near(c.worldPoint[1],base+(c.kind==='floor'?0:height),'declared support height');
   for(const [bone,length]of lengths)near(bone.position.length(),length,'native bone length');near(w.root.scale.y,1,'native scale');
  }
  // No adapter/frame jump at first roof support or at the ground impact.
  const boundary=down?2.86:1.60,epsilon=1e-6;journey.apply((boundary-epsilon)/journey.duration);const before=w.root.position.clone();journey.apply((boundary+epsilon)/journey.duration);assert.ok(before.distanceTo(w.root.position)<.0001,'height correction jumps at support boundary');
 }finally{journey.dispose();w.dispose();}
});
test('height frame is immutable, deterministic and identity for the authored two-unit clip',()=>{
 const clip={duration:4,phases:[{},{},{start:.8,end:1.2},{},{},{start:2,end:2.5}]},frame={origin:[2,4.24,3],heading:90,ledgeHeight:2.12},original=structuredClone(frame);
 for(const p of [0,.25,1,.25,0]){const out=ledgeHeightFrame(clip,p,frame);assert.deepEqual(frame,original);if(p===0)near(out.origin[1],4.24,'floor');if(p===1)near(out.origin[1],4.36,'roof offset');}
 near(ledgeHeightFrame(clip,1,frame,'down').origin[1],4.24,'landing floor');const standard={origin:[0,0,0],heading:0};assert.equal(ledgeHeightFrame(clip,.5,standard),standard);
});

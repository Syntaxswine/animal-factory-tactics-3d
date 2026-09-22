import test from 'node:test';import assert from 'node:assert/strict';
import {buildWorld,traceWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {mirroredPaintUV} from '../dist/tactics/foliage-materials.js';

test('grass is deterministic, rooted at its floor, inset from tile edges and excluded from props and hard surfaces',()=>{
 const map={terrain:[['ground-grass','water','floor','ground-concrete','ground-grass'],['woodland','ground-grass','ground-gravel','void','yard']],props:[{x:4,y:0,kind:'crate-wood'}],upper:[{'0,0':'ground-grass'}],edges:{},stairs:[]},world=buildWorld(map),before=JSON.stringify([map,world.boxes]),hit=traceWorld(world,[-2,.4,0],[7,.4,0]);
 const a=environmentVisuals(world,map),b=environmentVisuals(world,map);assert.deepEqual(a,b);assert.equal(JSON.stringify([map,world.boxes]),before);assert.deepEqual(traceWorld(world,[-2,.4,0],[7,.4,0]),hit);
 const tufts=a.filter(p=>p.kind==='grass');assert(tufts.some(p=>p.source.z===1));assert(tufts.length>0);
 for(const t of tufts){const {x,y,z}=t.source;assert(z||['ground-grass','woodland','yard'].includes(map.terrain[y][x]));assert(!(x===4&&y===0));assert(Math.abs(t.center[1]-t.size[1]/2-z*DIMENSIONS.floorSpacing)<1e-9);assert(Math.abs(t.center[0]-x)+t.size[0]/2<.52);assert(Math.abs(t.center[2]-y)+t.size[2]/2<.52);}
});
test('paint repetition joins positive and negative tile boundaries without touching other atlas panels',()=>{
 for(let panel=0;panel<4;panel++)for(let edge=-4;edge<=4;edge++)for(const v of [-2.3,.2,1.7]){
  const a=mirroredPaintUV(edge-1e-8,v,panel),b=mirroredPaintUV(edge+1e-8,v,panel);assert(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-7);
  const x=panel%2*.5,y=panel<2?.5:0;assert(a[0]>=x+.0039&&a[0]<=x+.4961&&a[1]>=y+.0039&&a[1]<=y+.4961);
 }
});

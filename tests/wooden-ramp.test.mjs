import test from 'node:test';import assert from 'node:assert/strict';
import {rampInfo,rampHeight,woodenRampParts,rampRayHit,RAMP_PROPS} from '../dist/tactics/cliff-ramps.js';
import {blankMap,validateMap,neighbors} from '../dist/tactics/core/maps.js';
import {createGame,move,stepMovement,refresh,pathTo} from '../dist/tactics/core/engine.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {buildWorld,traceWorld} from '../dist/tactics/hybrid-world.js';
for(const direction of ['north','east','south','west'])test(direction+' wooden ramp walks three tiles to a raised timber landing and back',()=>{
 const m=blankMap('Wooden ramp'),p={kind:'ramp-wood-'+direction,x:16,y:16,z:0},r=rampInfo(p);m.props=[p];m.upper[0][r.exit.x+','+r.exit.y]='ground-wood-planks';m.starts[0]=r.entry;
 assert.equal(RAMP_PROPS[p.kind].w*RAMP_PROPS[p.kind].h,3);assert.deepEqual(validateMap(m,{connectivity:false}),[]);
 const d=new EditingDocument().open(JSON.stringify(m));assert.equal(new EditingDocument().open(d.export()).map.props[0].kind,p.kind);
 const s=createGame(1,m,false),u=s.units[0];refresh(s);assert.equal(pathTo(s,u,r.exit.x,r.exit.y,1).length,4);assert.ok(move(s,u,r.exit.x,r.exit.y,1));while(s.queue.length)stepMovement(s);assert.equal(u.z,1);assert.ok(move(s,u,r.entry.x,r.entry.y,0));while(s.queue.length)stepMovement(s);assert.deepEqual({x:u.x,y:u.y,z:u.z},r.entry);
 const mid={x:r.low.x+r.dx,y:r.low.y+r.dy,z:0};assert.ok(neighbors(m,mid).every(q=>r.dx?q.y===mid.y:q.x===mid.x));
 assert.equal(woodenRampParts(p).length,42);const origin={...mid,h:4},directionRay={x:0,y:0,h:-1};const hit=rampRayHit([p],origin,directionRay,6);assert.ok(Math.abs(4-hit-rampHeight(p,mid))<.03);
 const world=buildWorld(m);assert.deepEqual(world.diagnostics,[]);const renderedHit=traceWorld(world,[mid.x,4,mid.y],[mid.x,.1,mid.y]);assert.ok(renderedHit);assert.ok(renderedHit.id.includes('timber'));
 // The space under the raised end is open, not a solid earth wedge.
 const high=r.high;assert.equal(rampRayHit([p],{x:high.x-r.dy*.8,y:high.y+r.dx*.8,h:.25},{x:r.dy,y:-r.dx,h:0},1.6),null);
});

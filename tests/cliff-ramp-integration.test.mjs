import test from 'node:test';
import assert from 'node:assert/strict';
import {blankMap,validateMap,neighbors,passable} from '../dist/tactics/core/maps.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {cutCliffRamp,outerRampBanks} from '../dist/tactics/cliff-ramp-placement.js';
import {rampInfo,RAMP_DIRECTIONS,rampHeight} from '../dist/tactics/cliff-ramps.js';
import {bankInfo,bankRayHit} from '../dist/tactics/ramp-banks.js';
import {cliffTiles} from '../dist/tactics/cliff-map.js';
import {cliffTileGeometry} from '../dist/tactics/cliff-tiles.js';
import {isRampTerrain} from '../dist/tactics/cliff-ramp-surfaces.js';
import {cliffRayHit} from '../dist/tactics/cliff-map-geometry.js';
import {createGame,move,stepMovement,refresh} from '../dist/tactics/core/engine.js';
import {CliffMapScene} from '../dist/tactics/cliff-map-scene.js';
import * as T from '../dist/tactics/vendor/three.module.js';

export function plateau(width,direction,z=0,wall='crag'){
 const map=blankMap('Ramp integration'),[dx,dy]=RAMP_DIRECTIONS[direction],start={x:24,y:24,z};map.props=[];map.guards=[];map.edges={};map.stairs=[];map.climbs=[];
 for(let u=-1;u<=6;u++)for(let v=-2;v<=width+1;v++){
  const x=start.x+dx*u-dy*v,y=start.y+dy*u+dx*v;
  if(z)map.upper[z-1][x+','+y]='floor';
  if(u<0)continue;map.props.push({x,y,z,kind:(v<0||v>=width)&&u<5?'cliff-'+wall:'cliff-ledge',cliffMask:15,cliffSand:0});map.upper[z][x+','+y]='floor';
 }
 return {map,start,options:{rampWidth:width,rampDirection:direction}};
}
test('6–10-wide cuts in both levels and all directions save, reload, undo, and retain only outer banks',()=>{
 for(const width of [6,8,10])for(const direction of Object.keys(RAMP_DIRECTIONS))for(const z of [0,1]){
  const f=plateau(width,direction,z),d=new EditingDocument().open(JSON.stringify(f.map)),before=d.export();
  const result=d.apply({tool:'ramp-cut',start:f.start,options:f.options});assert.ok(result.ok,result.error);
  assert.deepEqual(validateMap(d.map,{connectivity:false}),[]);assert.equal(d.map.props.filter(p=>bankInfo(p)).length,8);
  const ramps=d.map.props.filter(p=>rampInfo(p));assert.equal(ramps.length,width);assert.equal(outerRampBanks(d.map.props,ramps[Math.floor(width/2)]).length,8);
  for(const p of ramps){const r=rampInfo(p);assert.ok(passable(d.map,r.low));assert.equal(d.map.upper[z][r.low.x+','+r.low.y],undefined);assert.ok(d.map.upper[z][r.exit.x+','+r.exit.y]);}
  const saved=d.export(),loaded=new EditingDocument().open(saved);assert.equal(loaded.export(),saved);d.undo();assert.equal(d.export(),before);d.redo();assert.equal(d.export(),saved);
 }
});
test('a blocked broad cut is atomic and leaves unrelated props, characters and authored connections intact',()=>{
 for(const obstacle of ['prop','unit','edge','climb','landing']){
  const f=plateau(6,'east');
  if(obstacle==='prop')f.map.props.push({x:25,y:26,z:1,kind:'crate-wood'});
  if(obstacle==='unit')f.map.starts[0]={x:25,y:26,z:1};
  if(obstacle==='edge')f.map.edges['e:25:26:1']='wall-brick';
  if(obstacle==='climb')f.map.climbs.push({x:23,y:26,z:0,dx:1,dy:0,kind:'cliff'});
  if(obstacle==='landing')f.map.props=f.map.props.filter(p=>p.x!==28||p.y!==26);
  const before=JSON.stringify(f.map);assert.throws(()=>cutCliffRamp(f.map,f.start,f.options));assert.equal(JSON.stringify(f.map),before);
 }
});
test('wide ramps walk up, down and laterally after save/load while outside banks remain inaccessible',()=>{
 for(const direction of Object.keys(RAMP_DIRECTIONS)){
  const f=plateau(6,direction),out=cutCliffRamp(f.map,f.start,f.options),r=rampInfo(out.ramps[0]),next=rampInfo(out.ramps[1]);
  out.map.starts[0]=r.entry;const map=new EditingDocument().open(JSON.stringify(out.map)).map,s=createGame(1,map,false),u=s.units[0];refresh(s);
  assert.ok(move(s,u,r.exit.x,r.exit.y,r.exit.z));while(s.queue.length)stepMovement(s);
  assert.ok(move(s,u,r.entry.x,r.entry.y,r.entry.z));while(s.queue.length)stepMovement(s);
  assert.ok(neighbors(map,r.low).some(q=>q.x===next.low.x&&q.y===next.low.y));
  assert.ok(move(s,u,next.high.x,next.high.y,next.high.z));while(s.queue.length)stepMovement(s);assert.equal(u.x,next.high.x);assert.equal(u.y,next.high.y);
  for(const p of out.map.props.filter(p=>bankInfo(p)))assert.equal(passable(map,p),false);
 }
});
test('cliff, crag, banks and broad ramp share welded caps and physical crest heights',()=>{
 for(const width of [6,10])for(const direction of Object.keys(RAMP_DIRECTIONS))for(const wall of ['ledge','crag']){
  const f=plateau(width,direction,0,wall),out=cutCliffRamp(f.map,f.start,f.options),ramps=out.map.props.filter(isRampTerrain);
  const g=cliffTileGeometry('mixed',cliffTiles(out.map.props,0),{ramps}),a=g.attributes.position;
  for(let i=0;i<a.count;i++){assert.ok(Number.isFinite(a.getY(i)));assert.ok(a.getY(i)>=0&&a.getY(i)<=2.000001);}
  // A longitudinal lane seam must have no exposed rim or buried vertical skirt.
  const r=rampInfo(out.ramps[0]),q=rampInfo(out.ramps[1]),mx=(r.low.x+q.low.x)/2+.5,my=(r.low.y+q.low.y)/2+.5;
  for(let i=g.groups[1].start;i<a.count;i++)if(Math.abs(a.getX(i)-mx)<1e-5&&Math.abs(a.getZ(i)-my)<1e-5)assert.ok(g.attributes.cliffRim.getX(i)>.1);
  for(const p of out.ramps){const r=rampInfo(p);for(const t of [0,1.3,2.6,3.5]){const x=r.low.x+r.dx*t,y=r.low.y+r.dy*t,hit=cliffRayHit(out.map.props,{x,y,h:3},{x:0,y:0,h:-1},4);assert.ok(Math.abs(3-hit-rampHeight(p,{x,y}))<1e-5);}}
  // Every rim segment belongs to the exterior, never the full-height bank/crag join.
  for(const b of out.map.props.filter(p=>bankInfo(p))){const info=bankInfo(b),[dx,dy]=RAMP_DIRECTIONS[info.direction],sign=info.side==='left'?-1:1;
   const x=b.x-dy*sign*.5,y=b.y+dx*sign*.5;
   const hit=cliffRayHit(out.map.props,{x,y,h:3},{x:0,y:0,h:-1},4);assert.ok(Math.abs(3-hit-2)<1e-5,'closed wall-height bank/crag seam');
   const origin={x:b.x+dx*.17-dy*sign*.13,y:b.y+dy*.17+dx*sign*.13,h:3};
   assert.ok(Math.abs(cliffRayHit(out.map.props,origin,{x:0,y:0,h:-1},4)-bankRayHit([b],origin,{x:0,y:0,h:-1},4))<1e-5,'rendered bank triangles agree with occlusion away from grid vertices');
  }
  g.dispose();
 }
});
test('discovery reveals individual ramp cells without exposing other lanes or waiting for the anchor',()=>{
 const f=plateau(6,'east'),out=cutCliffRamp(f.map,f.start,f.options),map={...out.map,seen:new Set(),difficulty:'standard'},scene=new CliffMapScene(new T.Scene()),r=rampInfo(out.ramps[0]);
 try{
  scene.rebuild(map,0);assert.equal(scene.parts[0].mesh.geometry.index.count,0);
  map.seen.add(r.high.x+','+r.high.y);scene.rebuild(map,0);const geometry=scene.parts[0].mesh.geometry;assert.ok(geometry.index.count>0);
  for(let i=0;i<geometry.index.count;i+=3){let x=0,y=0;for(let j=0;j<3;j++){const id=geometry.index.getX(i+j);x+=geometry.attributes.position.getX(id)/3;y+=geometry.attributes.position.getZ(id)/3;}assert.ok(Math.abs(x-(r.high.x+.5))<=.500001&&Math.abs(y-(r.high.y+.5))<=.500001);}
  map.seen.add(r.low.x+','+r.low.y);scene.rebuild(map,0);assert.ok(scene.parts[0].mesh.geometry.index.count>geometry.index.count);
 }finally{scene.dispose();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {toWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {projectBattlePoint,battleFloorPoint,rotateBattleView,focusBattleView,overviewBattleView,setBattleCamera} from '../dist/tactics/isometric-camera.js';
import {rotateInspectionView,setInspectionCamera,floorPoint} from '../dist/tactics/editor-3d-camera.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} differs from ${b}`);
const screen=(camera,point,w,h)=>{const v=new T.Vector3(...point).project(camera);return {x:(v.x+1)*w/2,y:(1-v.y)*h/2};};

test('game overlays and floor clicks agree with the rendered camera in every orientation and level',()=>{
 const camera=new T.OrthographicCamera(),w=1100,h=720;
 for(const turn of [0,1,2,3])for(const level of [0,1,2,3])for(const zoom of [.12,1.15,3]){
  const view={x:630,y:-220,zoom,turn};setBattleCamera(camera,view,w,h,level);
  const points=[{x:21.4,y:15.8,z:level},{x:22,y:17,z:2,towerPost:{}},{x:3,y:4,z:0,cliffSupport:{level:1,height:.24}},{x:20,y:30,z:0,h:4.1}];
  for(const point of points){const actual=projectBattlePoint(point,view,level),rendered=screen(camera,toWorld(point),w,h);close(actual.x,rendered.x);close(actual.y,rendered.y);}
  const point=points[0],p=projectBattlePoint(point,view,level),hit=battleFloorPoint(view,p.x,p.y,level);close(hit.x,point.x);close(hit.y,point.y);assert.equal(hit.z,level);
  // Elevated flame templates use a plane above the selected floor.
  const raised={x:12.8,y:20.2,z:level,towerElevation:2.4},q=projectBattlePoint(raised,view,level),aim=battleFloorPoint(view,q.x,q.y,level,2.4);close(aim.x,raised.x);close(aim.y,raised.y);
 }
});

test('quarter turns preserve the viewport center, zoom, and world state',()=>{
 for(const delta of [-1,1])for(const level of [0,1,2]){
  const view={x:-805,y:-707,zoom:1.6,turn:0},before={...view},anchor=battleFloorPoint(view,600,400,level);
  for(let i=0;i<4;i++){rotateBattleView(view,delta,1200,800,level);const p=projectBattlePoint(anchor,view,level);close(p.x,600);close(p.y,400);close(view.zoom,before.zoom);}
  close(view.x,before.x);close(view.y,before.y);assert.equal(view.turn,0);
 }
});

test('Center and Overview frame their destinations after rotation, including rectangular maps',()=>{
 for(const turn of [0,1,2,3]){
  const view={x:-50,y:72,zoom:.2,turn},w=1000,h=750;
  focusBattleView(view,32,14,w,h);const p=projectBattlePoint({x:32,y:14,z:2},view,2);close(p.x,w/2);close(p.y,h*.55);assert.equal(view.turn,turn);
  overviewBattleView(view,90,40,w,h);
  for(const [x,y]of [[-.5,-.5],[89.5,-.5],[-.5,39.5],[89.5,39.5]]){const p=projectBattlePoint({x,y},view);assert(p.x>=24.9&&p.x<=w-24.9);assert(p.y>=29.9&&p.y<=h-29.9);}
 }
});

test('editor turns keep the center and selected layer, including top-down picking',()=>{
 const camera=new T.OrthographicCamera(),w=960,h=720;
 for(const preset of ['0','1','2','3','top'])for(const level of [0,1,2,3]){
  const view={x:32,y:19,span:28,preset,level};
  for(let i=0;i<4;i++){
   rotateInspectionView(view,1);setInspectionCamera(camera,view,w,h);
   const center=screen(camera,[view.x,level*DIMENSIONS.floorSpacing,view.y],w,h);close(center.x,w/2);close(center.y,h/2);
   const p=screen(camera,[33.4,level*DIMENSIONS.floorSpacing,20.1],w,h),hit=floorPoint(camera,p.x,p.y,w,h,level);close(hit.x,33.4);close(hit.y,20.1);
   assert.equal(view.span,28);assert.equal(view.level,level);
  }
  assert.equal(view.preset,preset);
 }
 const view={preset:'0'};rotateInspectionView(view,-1);assert.equal(view.preset,'3');rotateInspectionView(view,1);assert.equal(view.preset,'0');
});

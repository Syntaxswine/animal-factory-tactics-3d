import {HybridRenderer} from './hybrid-renderer.js';
import {buildWorld} from './hybrid-world.js';
import {CliffMapScene} from './cliff-map-scene.js';
import {RAMP_DIRECTIONS} from './cliff-ramps.js';
import {cutCliffRamp} from './cliff-ramp-placement.js';
import {blankMap,validateMap} from './core/maps.js';
import {createPaintedGrass} from './painted-grass.js';
import * as T from './vendor/three.module.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
for(const id of ['direction','width','surface','bank','wall','view','scale'])if(params.has(id))$(id).value=params.get(id);
const hybrid=new HybridRenderer(),cliffs=new CliffMapScene(hybrid.scene),{renderer,camera,scene}=hybrid;
$('scene').append(renderer.domElement);renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const ground=new T.Mesh(new T.PlaneGeometry(120,120),createPaintedGrass());ground.rotation.x=-Math.PI/2;ground.position.set(48,.009,48);scene.add(ground);
let map,ramps;
function render(){renderer.render(scene,camera);}
function frame(){
 const width=+$('width').value,[dx,dy]=RAMP_DIRECTIONS[$('direction').value],cx=48+dx*2-dy*(width-1)/2,cz=48+dy*2+dx*(width-1)/2;
 const orbit={front:[-10,8,10],rear:[12,9,-10],side:[0,8,14]}[$('view').value],span=$('scale').value==='gameplay'?17:Math.max(8,width*.7+2);
 const w=Math.min(1200,$('scene').clientWidth),h=Math.round(w*.65);renderer.setSize(w,h);camera.left=-span;camera.right=span;camera.top=span*h/w;camera.bottom=-span*h/w;camera.near=.1;camera.far=160;
 camera.position.set(cx+dx*orbit[0]-dy*orbit[2],orbit[1],cz+dy*orbit[0]+dx*orbit[2]);camera.lookAt(cx,1,cz);camera.updateProjectionMatrix();render();
}
function update(){
 const direction=$('direction').value,width=+$('width').value,surface=$('surface').value,[dx,dy]=RAMP_DIRECTIONS[direction],base=blankMap('Broad cliff ramp');
 base.terrain=base.terrain.map(row=>row.map(()=> 'ground-grass'));base.props=[];base.guards=[];base.edges={};base.stairs=[];base.climbs=[];base.upper=[{},{}];
 // A ramp is a breach in a long, continuous cliff front. Its flank banks
 // return into that front; the plateau and wall extend beyond the study frame.
 for(let u=0;u<9;u++)for(let v=-15;v<width+15;v++){
  const x=48+dx*u-dy*v,y=48+dy*u+dx*v;
  const p={x,y,z:0,kind:$('wall').value==='crag'&&u<2?'cliff-crag':'cliff-ledge',cliffMask:15,cliffVariant:0,cliffSand:0};
  base.props.push(p);base.upper[0][x+','+y]='floor';
 }
 const result=cutCliffRamp(base,{x:48,y:48,z:0},{rampWidth:width,rampDirection:direction,rampSurface:surface,rampBank:$('bank').value});map=result.map;ramps=result.ramps;
 const errors=validateMap(map,{connectivity:false});if(errors.length)throw Error(errors.join('\n'));
 hybrid.rebuild(buildWorld(map),null,0,map);cliffs.rebuild(map,0,{editor:true});frame();
 $('status').textContent=`${width} tiles wide · 4 tiles uphill · 2 m rise · joined outer banks · ordinary walking, including lane changes`;
 window.rampStudy={hybrid,cliffs,map,ramps,render,update,frame};
}
hybrid.onReady=render;for(const id of ['direction','width','surface','bank','wall'])$(id).onchange=update;for(const id of ['view','scale'])$(id).onchange=frame;window.onresize=frame;update();

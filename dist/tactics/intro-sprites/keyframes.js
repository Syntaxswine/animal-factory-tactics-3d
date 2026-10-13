// Intro sprite proof: three painted keyframes of the descent and crash, composed
// in the game camera over the real tutorial-plateau crash sector.
//   keyframes.html?shot=A|B|C[&layers=1]
import {buildSector,makeView,paintTerrain,LEVEL_HEIGHT,SUN,rng} from './crash-sector.js';
import {planFlora,planRocks,drawFlora,drawFloraShadow} from './painted-trees.js';
import {plume,rotorDisc,dustBurst,clods,furrows,debris,aircraftShadow} from './effects.js';

const WIDTH=1600,HEIGHT=900;
// The user's circled clearing (crash-sector-woodland.json, markedClearing).
const CLEARING=[205.5,104];
// Heading is world +x for every shot: the nose stays toward screen right.
// B and C share one locked camera: the impact and the settle play over the
// same painted plate, which is what makes them cheap to animate as sprites.
const CRASH_CAMERA={w:52,anchor:[204,104,0],at:[790,640]};
export const SHOTS={
 A:{title:'Descent past the plateau',caption:'The hit aircraft drops off the curved plateau rim toward the wooded pocket below; its shadow and the smoke trail give the altitude.',
  w:30,anchor:[188,102.5,9],at:[820,330],heli:{sprite:'descent',x:188,y:102.5,h:9},rotor:1,
  trail:{from:[160,100.5,20],seed:5}},
 B:{title:'Impact in the marked clearing',caption:'Skids plant and buckle first; rotor wash and soil burst outward, the blades still turning. Same rim and screen direction.',
  ...CRASH_CAMERA,heli:{sprite:'impact',x:202.2,y:104,h:0},rotor:.75,
  dust:{x:201.9,y:104,radius:4.6,strength:1},clods:true,furrow:{from:201.6,to:202.2}},
 C:{title:'Settled survivable wreck',caption:'Upright cabin, attached damaged tail, crushed skids, broken rotor and an open starboard door with clear ground for the squad. Thin engine smoke.',
  ...CRASH_CAMERA,heli:{sprite:'settled',x:205.5,y:104,h:0},rotor:0,
  furrow:{from:201.6,to:205.5},engineSmoke:true,debris:true},
};

const load=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(Error('Missing '+src));i.src=src;});
const json=async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing '+p);return r.json();};

export async function loadAssets(){
 const [map,woodland,heli,smoke]=await Promise.all([json('../sector-library/tutorial-step-1/rough-plateau.json'),json('crash-sector-woodland.json'),json('heli/heli.json'),load('../../assets/effects/painted-fire/smoke-atlas-v1.png')]);
 const sprites={};for(const [k,s]of Object.entries(heli.sprites))sprites[k]={...s,img:await load('heli/'+s.file),shadowImg:await load('heli/'+s.shadow)};
 return {sector:buildSector(map,woodland),woodland,sprites,smoke,ppu:heli.ppu};
}

export function keepClear(){
 const [cx,cy]=CLEARING;
 return [
  // The landing pocket: the user's circle, ringed by trees but open inside.
  {name:'pocket',test:(x,y,r)=>Math.hypot(x-cx,(y-cy)*1.05)<8.6+r*.55},
  // No lone trees in the open ground around it: the woodland edge is the user's.
  {name:'meadow',test:(x,y,r,lone)=>lone&&Math.hypot(x-cx,y-cy)<10.5+r},
  // Sightline to the open starboard door (world +y, screen lower left).
  {name:'exit',test:(x,y,r)=>y>cy&&y<cy+16&&Math.abs(x-cx+(y-cy)*.15)<3.5+r},
  // The last stretch of the descent, so no tree stands in the rotor's path.
  {name:'approach',test:(x,y,r)=>x>191&&x<cx&&Math.abs(y-103.6)<3.6+r*.6},
 ];
}

export function renderShot(assets,id,{layers=false}={}){
 const shot=SHOTS[id];if(!shot)throw Error('Unknown shot '+id);
 const view=makeView({w:shot.w,anchor:shot.anchor,at:shot.at,width:WIDTH,height:HEIGHT});
 const {sector,sprites,smoke}=assets;
 const canvas=(n)=>{const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;c.dataset.layer=n;return c;};
 const L={ground:canvas('ground'),shadows:canvas('shadows'),objects:canvas('objects'),atmosphere:canvas('atmosphere')};
 // 1. Terrain plate.
 paintTerrain(L.ground.getContext('2d'),sector,view);
 const g=L.ground.getContext('2d');
 // 2. Ground decals.
 const H=shot.heli,sp=sprites[H.sprite];
 // Touchdown at furrow.from (skid rear); the tips now sit 1.9 ahead of the origin.
 if(shot.furrow)furrows(g,view,{x0:shot.furrow.from-1.6,x1:shot.furrow.to+1.9,lanes:[H.y-.92,H.y+.92],seed:23});
 if(shot.debris)debris(g,view,{x:H.x+.5,y:H.y-.4,radius:6,seed:31,count:34});
 // Flora plan over the visible tile bounds (plus margin for tall sprites).
 const corners=[[0,0],[WIDTH,0],[0,HEIGHT],[WIDTH,HEIGHT]].flatMap(([sx,sy])=>[view.unproject(sx,sy,0),view.unproject(sx,sy,LEVEL_HEIGHT*2),view.unproject(sx,sy+view.hv*10,0)]);
 const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),bounds=[Math.min(...xs)-3,Math.min(...ys)-3,Math.max(...xs)+3,Math.max(...ys)+3];
 const kc=keepClear(),flora=[...planFlora(sector,bounds,{keepClear:kc,seed:3}),...planRocks(sector,bounds,{keepClear:kc,seed:9})];
 // 3. Shadows.
 const s=L.shadows.getContext('2d');
 for(const t of flora)drawFloraShadow(s,t,view);
 const groundUnder=(x,y)=>sector.heightAt(x,y);
 {const dx=-SUN[0]/SUN[1]*H.h,dy=-SUN[2]/SUN[1]*H.h;aircraftShadow(s,view,sp.shadowImg,sp,{x:H.x,y:H.y,h:H.h,ground:groundUnder(H.x+dx,H.y+dy),k:view.w/Math.SQRT2/assets.ppu});}
 // 4. Objects, far to near (view depth of the crown / body centre).
 const o=L.objects.getContext('2d');
 const items=flora.map(t=>({depth:view.depth(t.x,t.y,t.base+(t.kind==='rock'?.2:t.height*.45)),draw:()=>drawFlora(o,t,view)}));
 const k=view.w/Math.SQRT2/assets.ppu,[hx,hy]=view.project(H.x,H.y,H.h);
 const heliDepth=view.depth(H.x,H.y,H.h+1.2);
 items.push({depth:heliDepth,draw:()=>{
  o.drawImage(sp.img,hx-sp.anchor[0]*k,hy-sp.anchor[1]*k,sp.size[0]*k,sp.size[1]*k);
  if(shot.rotor>0&&sp.disc){const d=sp.disc,hub=[hx+(d.hub[0]-sp.anchor[0])*k,hy+(d.hub[1]-sp.anchor[1])*k];rotorDisc(o,{hub,u:[d.u[0]*k,d.u[1]*k],v:[d.v[0]*k,d.v[1]*k]},{alpha:shot.rotor,seed:id.charCodeAt(0)});}
 }});
 if(shot.dust){const D=shot.dust;
  items.push({depth:heliDepth-.6,draw:()=>{o.save();o.beginPath();o.rect(0,0,WIDTH,hy-2*k);o.clip();dustBurst(o,smoke,view,{x:D.x,y:D.y,radius:D.radius,seed:11,strength:D.strength,bias:[-1,.2]});o.restore();}});
  items.push({depth:heliDepth+.6,draw:()=>{o.save();o.beginPath();o.rect(0,hy-2*k,WIDTH,HEIGHT);o.clip();dustBurst(o,smoke,view,{x:D.x,y:D.y,radius:D.radius,seed:11,strength:D.strength,bias:[-1,.2]});o.restore();if(shot.clods)clods(o,view,{x:D.x-1,y:D.y,radius:5.5,seed:17,count:70,lift:3});}});
 }
 items.sort((a,b)=>a.depth-b.depth);
 // The smoke trail rides above the canopy: drawn after the flora behind the
 // aircraft, before the aircraft itself.
 if(shot.trail){const idx=items.findIndex(i=>i.depth>=heliDepth-.01);items.splice(idx,0,{depth:heliDepth-.01,draw:()=>trail(o,view,smoke,shot,H,k)});}
 for(const it of items)it.draw();
 if(shot.engineSmoke){const u=view.w/48,[ex,ey]=view.project(H.x-1.2,H.y-.1,3.0);for(let i=0;i<3;i++)plume(o,smoke,{cell:(i+1)%4,x:ex+i*3*u,y:ey+i*2*u,angle:.32+i*.1,length:(190+i*60)*u,width:(44+i*16)*u,alpha:.34-i*.08,tint:i?'rgb(170,166,158)':'rgb(118,114,106)',flip:i===1});}
 // 5. Atmosphere: depth haze toward the top, warm light, vignette.
 const a=L.atmosphere.getContext('2d');
 const haze=a.createLinearGradient(0,0,0,HEIGHT);haze.addColorStop(0,'rgba(206,214,196,.30)');haze.addColorStop(.38,'rgba(206,214,196,.08)');haze.addColorStop(1,'rgba(206,214,196,0)');a.fillStyle=haze;a.fillRect(0,0,WIDTH,HEIGHT);
 const vig=a.createRadialGradient(WIDTH/2,HEIGHT*.55,HEIGHT*.35,WIDTH/2,HEIGHT*.55,HEIGHT*1.05);vig.addColorStop(0,'rgba(20,18,10,0)');vig.addColorStop(1,'rgba(20,18,10,.42)');a.fillStyle=vig;a.fillRect(0,0,WIDTH,HEIGHT);
 // Composite.
 const out=canvas('composite'),c=out.getContext('2d');
 c.drawImage(L.ground,0,0);c.save();c.globalCompositeOperation='multiply';c.globalAlpha=.9;c.drawImage(L.shadows,0,0);c.restore();c.drawImage(L.objects,0,0);
 // Light grade: warm sun from the upper left, cooler air toward the lower right.
 c.save();c.globalCompositeOperation='soft-light';const grade=c.createLinearGradient(0,0,WIDTH,HEIGHT);grade.addColorStop(0,'rgba(255,214,150,.55)');grade.addColorStop(.55,'rgba(250,226,180,.25)');grade.addColorStop(1,'rgba(110,130,150,.45)');c.fillStyle=grade;c.fillRect(0,0,WIDTH,HEIGHT);c.restore();
 c.drawImage(L.atmosphere,0,0);
 return {canvas:out,layers:L,view,flora:flora.length};
}

function trail(o,view,smoke,shot,H,k){
 // Tail position for the art-directed pitch (-0.42 rad nose down).
 const p=-.42,tx=H.x+(-5.6*Math.cos(p)-1.9*Math.sin(p)),th=H.h+(-5.6*Math.sin(p)+1.9*Math.cos(p));
 const [fx,fy,fh]=shot.trail.from,r=rng(shot.trail.seed),n=16;
 const pts=[];for(let i=0;i<n;i++){const t=i/(n-1),x=tx+(fx-tx)*t,y=H.y+(fy-H.y)*t+Math.sin(t*4)*.6,h=th+(fh-th)*t+t*t*2.5;pts.push({t,p:view.project(x,y,h)});}
 for(let i=n-1;i>=0;i--){const {t,p}=pts[i],size=(2.6+t*7.5)*view.w/Math.SQRT2*(.85+r()*.3),next=pts[Math.max(0,i-1)].p,ang=Math.atan2(p[0]-next[0],-(p[1]-next[1]));
  plume(o,smoke,{cell:Math.floor(r()*4),x:p[0],y:p[1],angle:ang+(r()-.5)*.5,length:size*1.3,width:size,alpha:(.72-t*.45)*(.8+r()*.2),tint:t<.2?'rgb(70,66,60)':'rgb(150,144,134)',flip:r()<.5});}
}

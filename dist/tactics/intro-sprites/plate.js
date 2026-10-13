// The static half of the intro sprite proof: the painted plate (terrain, the
// game's flora sprites, their shadows) and the frame finish (split tone is
// applied to the plate here; the tone grade runs on every finished frame).
import {paintTerrain,LEVEL_HEIGHT} from './crash-sector.js';
import {planFlora,planRocks,drawFlora,drawFloraShadow} from './painted-trees.js';
import {splitToneCanvas} from './grade.js';

// The user's circled clearing (crash-sector-woodland.json, markedClearing).
const CLEARING=[205.5,104];

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

// The static world on one canvas: terrain, flora shadows, then flora far to
// near. Nothing that moves: the aircraft, decals and effects draw over it.
export function paintPlate(assets,view,{seed=3}={}){
 const {sector}=assets,c=document.createElement('canvas');c.width=view.width;c.height=view.height;const g=c.getContext('2d');
 paintTerrain(g,sector,view,{textures:assets.textures});
 const corners=[[0,0],[view.width,0],[0,view.height],[view.width,view.height]].flatMap(([sx,sy])=>[view.unproject(sx,sy,0),view.unproject(sx,sy,LEVEL_HEIGHT*2),view.unproject(sx,sy+view.hv*10,0)]);
 const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),bounds=[Math.min(...xs)-3,Math.min(...ys)-3,Math.max(...xs)+3,Math.max(...ys)+3];
 const kc=keepClear(),flora=[...planFlora(sector,bounds,{keepClear:kc,seed}),...planRocks(sector,bounds,{keepClear:kc,seed:9})];
 const sh=document.createElement('canvas');sh.width=view.width;sh.height=view.height;const s=sh.getContext('2d');for(const t of flora)drawFloraShadow(s,t,view,assets.flora);
 g.save();g.globalCompositeOperation='multiply';g.globalAlpha=.9;g.drawImage(sh,0,0);g.restore();
 flora.map(t=>({t,d:view.depth(t.x,t.y,t.base+(t.kind==='rock'?.2:t.height*.45))})).sort((a,b)=>a.d-b.d).forEach(({t})=>drawFlora(g,t,view,assets.flora));
 splitToneCanvas(c);
 return {canvas:c,flora:flora.length};
}
// Screen-space finish, shared by the stills and the player.
// GRADE was measured against the storyboard sheets (luminance p10/p50/p90 and
// mean HSV saturation; see INTRO-SPRITE-PROOF.md): the raw frames were too
// compressed (60/103/136) beside the storyboard's 42-59 / 104-120 / 169-188.
// Saturation is matched per material, not on average (the storyboard's low
// mean comes from its grey rock and sky): grass and foliage hue 39-44 deg,
// saturation .44-.53; rock cool grey in shade, warm ochre-pink where lit.
export const GRADE='brightness(1.2) contrast(1.4) saturate(.72)';
let scratch=null;
export function finishFrame(c,width,height){
 // Warm sun from the upper left, cooler air toward the lower right.
 c.save();c.globalCompositeOperation='soft-light';const grade=c.createLinearGradient(0,0,width,height);grade.addColorStop(0,'rgba(255,214,150,.32)');grade.addColorStop(.55,'rgba(250,226,180,.12)');grade.addColorStop(1,'rgba(110,130,150,.26)');c.fillStyle=grade;c.fillRect(0,0,width,height);c.restore();
 // Tone and saturation, as one filtered copy of the frame.
 if(!scratch||scratch.width!==width||scratch.height!==height){scratch=document.createElement('canvas');scratch.width=width;scratch.height=height;}
 const sg=scratch.getContext('2d');sg.clearRect(0,0,width,height);sg.drawImage(c.canvas,0,0);
 c.save();c.setTransform(1,0,0,1,0,0);c.filter=GRADE;c.globalCompositeOperation='copy';c.drawImage(scratch,0,0);c.restore();
 const haze=c.createLinearGradient(0,0,0,height);haze.addColorStop(0,'rgba(206,214,196,.1)');haze.addColorStop(.3,'rgba(206,214,196,.02)');haze.addColorStop(1,'rgba(206,214,196,0)');c.fillStyle=haze;c.fillRect(0,0,width,height);
 const vig=c.createRadialGradient(width/2,height*.55,height*.4,width/2,height*.55,height*1.1);vig.addColorStop(0,'rgba(14,18,24,0)');vig.addColorStop(1,'rgba(14,18,24,.28)');c.fillStyle=vig;c.fillRect(0,0,width,height);
}

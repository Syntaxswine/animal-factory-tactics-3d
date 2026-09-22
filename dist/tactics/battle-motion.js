// Presentation time only. The core has already accepted and charged each step.
export const MOVEMENT_MS=500;
const clamp=v=>Math.max(0,Math.min(1,v));
const angle=(a,b,t)=>a+(((b-a+540)%360)-180)*t;
export class BattleMotion {
 constructor(){this.tracks=new Map();this.samples=new Map();}
 update(units,now,reduced=false){
  const ids=new Set(units.map(u=>u.id));
  // Forget hidden opponents: reappearance must not reveal an unseen route.
  for(const id of this.tracks.keys())if(!ids.has(id)){this.tracks.delete(id);this.samples.delete(id);}
  for(const u of units){
   const point={x:u.x,y:u.y,z:u.z||0,heading:u.heading||0};let t=this.tracks.get(u.id);
   if(!t){t={from:point,to:point,start:now,last:now,position:point,distance:0,blend:0};this.tracks.set(u.id,t);}
   const dt=Math.max(0,now-t.last),changed=point.x!==t.to.x||point.y!==t.to.y||point.z!==t.to.z||point.heading!==t.to.heading;
   if(changed){t.from={...t.position};t.to=point;t.start=now;}
   const teleport=Math.hypot(point.x-t.from.x,point.y-t.from.y)>1.6||point.z!==t.from.z;
   const progress=reduced||teleport||u.hp<=0?1:clamp((now-t.start)/MOVEMENT_MS);
   const position={x:t.from.x+(point.x-t.from.x)*progress,y:t.from.y+(point.y-t.from.y)*progress,z:point.z,heading:angle(t.from.heading,point.heading,progress)};
   const walking=progress<1&&Math.hypot(point.x-t.from.x,point.y-t.from.y)>.001;
   if(!teleport&&!reduced&&u.hp>0)t.distance+=Math.hypot(position.x-t.position.x,position.y-t.position.y);
   t.blend=reduced||teleport||u.hp<=0?0:t.blend+((walking?1:0)-t.blend)*(1-Math.exp(-dt/65));
   if(t.blend<.001)t.blend=0;
   t.position=position;t.last=now;
   this.samples.set(u.id,{...u,...position,distance:t.distance,blend:t.blend,walking});
  }
 }
 sample(unit){return this.samples.get(unit.id)||{...unit,distance:0,blend:0,walking:false};}
 clear(){this.tracks.clear();this.samples.clear();}
}

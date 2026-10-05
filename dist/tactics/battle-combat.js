import {personVisible} from './battle-visibility.js';
import {flamePhase} from './battle-flame-effects.js';
import {paintedOperatorSupported,paintedFlamePhase} from './painted-fire-state.js';
export const RIFLE_SHOT_MS=380,RIFLE_DURATION_MS=1100;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
export function shotPhase(elapsed,rifle=true,reduced=false){
 const discharge=reduced||!rifle?0:RIFLE_SHOT_MS,duration=reduced?180:rifle?RIFLE_DURATION_MS:260,t=elapsed-discharge;
 return {duration,discharged:t>=0,aim:reduced?1:rifle?ease(elapsed/320)*(1-ease((elapsed-800)/300)):0,
  recoil:reduced||t<0||t>.45e3?0:t<30?ease(t/30):1-ease((t-30)/420),flash:!reduced&&t>=0&&t<65,trace:!reduced&&t>=0&&t<180,impact:t>=0&&t<180};
}
export class BattleCombat {
 constructor(){this.lastEffect=null;this.previous=new Map();this.queue=[];this.held=new Map();this.active=null;}
 observe(state,now,reduced=false){
  if(reduced)for(const shot of [this.active,...this.queue])if(shot)shot.reduced=true;
  if(state.effect&&state.effect!==this.lastEffect){
   this.lastEffect=state.effect;
   for(const event of state.effect.sequence||[state.effect]){
    const unit=state.units.find(u=>u.id===event.shooter),before=this.previous.get(event.shooter);
    if(!unit||!personVisible(state,unit))continue;
    const shooter=before||unit;
    // Flames carry their actual area; other attacks need resolved trajectories.
    if(!event.flame&&(!event.trajectories?.length||event.incendiary||event.explosions?.length))continue;
    const shot={event:structuredClone(event),shooter:{...shooter,x:event.ax,y:event.ay,z:event.az||0},rifle:!event.flame&&shooter.weapon==='rifle',reduced,knownUnitIds:[...this.previous.keys(),...state.detected]};
    shot.paintedFire=!!event.flame&&paintedOperatorSupported(shooter);
    this.queue.push(shot);
    for(const id of event.downed||[]){const prior=this.previous.get(id);if(prior)this.held.set(id,prior);}
   }
  }
  this.advance(now);
  this.previous=new Map(state.units.filter(u=>personVisible(state,u)).map(u=>[u.id,{...u}]));
 }
 advance(now){
  const phase=(shot,elapsed)=>shot.paintedFire?paintedFlamePhase(elapsed,shot.reduced):shot.event.flame?flamePhase(elapsed,shot.reduced):shotPhase(elapsed,shot.rifle,shot.reduced);
  if(this.active&&now-this.active.start>=phase(this.active,0).duration)this.active=null;
  if(!this.active&&this.queue.length)this.active={...this.queue.shift(),start:now};
  if(this.active){this.active.phase=phase(this.active,now-this.active.start);if(this.active.phase.discharged)for(const id of this.active.event.downed||[])this.held.delete(id);}
  if(!this.active&&!this.queue.length)this.held.clear();
 }
 get busy(){return !!this.active||this.queue.length>0;}
 display(unit){return this.held.has(unit.id)?{...unit,hp:this.held.get(unit.id).hp,casualty:null}:unit;}
 clear(){this.lastEffect=null;this.previous.clear();this.queue=[];this.held.clear();this.active=null;}
}

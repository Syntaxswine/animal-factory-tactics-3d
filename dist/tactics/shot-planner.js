import {previewAttack,WEAPONS} from './core/engine.js';
import {bulletTrajectory,shotgunTrajectories} from './core/projectiles.js';
import {AIM_LEVELS,supportsAim} from './aim-levels.js';
import {METRES_PER_TILE,roundChance} from './combat-state.js';

// Forecast the current projectile rules without touching encounter randomness.
// The accurate branch is weighted exactly; the existing miss branch is sampled.
export function shotForecast(s,a,b,p,{samples=96}={}){
 if(!p.ok||!supportsAim(WEAPONS[a.weapon]))return null;
 const w=WEAPONS[a.weapon];let seed=0x9e3779b9;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const result=[];
 for(let index=0;index<p.rounds;index++){
  const chance=roundChance(p.chance,index),hit={selected:0,any:0};
  for(const accurate of [true,false]){
   const count=w.pellets||!accurate?samples:1,weight=(accurate?chance:100-chance)/count;
   for(let i=0;i<count;i++){
    const options={accurate,zone:p.zone,chance,burst:p.rounds>1,reach:w.range*1.5,pellets:w.pellets};
    const paths=w.pellets?shotgunTrajectories(s,a,b,options,random):[bulletTrajectory(s,a,b,options,random)];
    if(paths.some(path=>path.unitId===b.id))hit.any+=weight;
    if(paths.some(path=>path.unitId===b.id&&path.zone===p.zone))hit.selected+=weight;
   }
  }
  result.push({selected:Math.round(hit.selected),any:Math.round(hit.any),chance});
 }
 return result;
}

export function renderShotPlanner(node,s,a,b,{zone,aim,burst,onSelect}){
 node.replaceChildren();if(!b||!supportsAim(WEAPONS[a.weapon]))return;
 const table=document.createElement('table'),caption=document.createElement('caption');
 caption.textContent=`Plan shot · ${(Math.hypot(a.x-b.x,a.y-b.y)*METRES_PER_TILE).toFixed(1)} m`;
 table.append(caption);
 const heading=document.createElement('tr');for(const title of ['Target','Hip','Aimed','Full']){const th=document.createElement('th');th.textContent=title;heading.append(th);}table.append(heading);
 for(const part of ['head','torso','legs','weapon']){
  const row=document.createElement('tr'),label=document.createElement('th');label.textContent=part[0].toUpperCase()+part.slice(1);row.append(label);
  for(const key of Object.keys(AIM_LEVELS)){
   const cell=document.createElement('td'),button=document.createElement('button'),p=previewAttack(s,a,b,burst,part,null,key),forecast=shotForecast(s,a,b,p);
   button.setAttribute('aria-pressed',String(zone===part&&aim===key));
   button.textContent=forecast?`${forecast.map(r=>r.selected+'%').join(' / ')} · ${p.cost} AP`:`— · ${p.cost??'—'} AP`;
   button.title=forecast?`${AIM_LEVELS[key].label} at ${part}. Hit selected part: ${forecast.map(r=>r.selected+'%').join(', ')}. Hit anywhere: ${forecast.map(r=>r.any+'%').join(', ')}. Approximate per-round chances; shotgun: at least one pellet. Expected damage per hit: ${p.damage}.`:p.reason;
   button.disabled=!p.ok;button.onclick=()=>onSelect(part,key);cell.append(button);row.append(cell);
  }
  table.append(row);
 }
 node.append(table);
 const detail=document.createElement('p'),p=previewAttack(s,a,b,burst,zone,null,aim),forecast=shotForecast(s,a,b,p);
 detail.textContent=forecast?`${AIM_LEVELS[aim].label} → ${zone}: selected part ≈ ${forecast.map(r=>r.selected+'%').join(' / ')}; anywhere on target ≈ ${forecast.map(r=>r.any+'%').join(' / ')}. ${p.cost} AP total.${burst?' Values follow burst order.':''}`:p.reason;
 const note=document.createElement('small');note.textContent='Estimates use current collision shapes and miss rules. Full aim removes the aim penalty; wounds, fatigue, range and cover still matter. Chances assume each round fires.';
 node.append(detail,note);
}

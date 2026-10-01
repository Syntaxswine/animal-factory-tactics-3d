import {previewAttack,WEAPONS,canSee,combatCosts} from './core/engine.js';
import {bulletTrajectory,shotgunTrajectories} from './core/projectiles.js';
import {AIM_LEVELS,supportsAim} from './aim-levels.js';
import {METRES_PER_TILE,roundChance} from './combat-state.js';

// Forecast the current projectile rules without touching encounter randomness.
// The accurate branch is weighted exactly; the existing miss branch is sampled.
export function shotForecast(s,a,b,p,{samples=96}={}){
 if(!Number.isFinite(p.chance)||!supportsAim(WEAPONS[a.weapon])||!canSee(s,a,b))return null;
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
 const focused=node.contains(document.activeElement)?document.activeElement.dataset.choice:null;
 node.replaceChildren();if(!b)return;
 const heading=document.createElement('h2');heading.id='shot-title';heading.textContent=b.name;
 const subtitle=document.createElement('p');subtitle.className='shot-distance';subtitle.textContent=a.name+' · '+a.ap+' AP available · '+WEAPONS[a.weapon].name+' · '+(Math.hypot(a.x-b.x,a.y-b.y)*METRES_PER_TILE).toFixed(1)+' m';node.append(heading,subtitle);
 if(!supportsAim(WEAPONS[a.weapon])){const note=document.createElement('p');note.textContent='Use Fire to attack with your held weapon.';node.append(note);return;}
 const body=document.createElement('div');body.className='shot-body';
 body.innerHTML='<svg viewBox="0 0 320 300" aria-hidden="true"><defs><pattern id="shot-lines" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 12 0 L 0 0 0 12" fill="none" stroke="currentColor" stroke-opacity=".12"/></pattern></defs><rect width="320" height="300" fill="url(#shot-lines)"/><path class="body-outline" data-zone="head" d="M140 60 L133 41 144 29 156 38 165 29 179 41 173 60 Q174 78 158 82 Q140 79 140 60 Z"/><path class="body-outline" data-zone="torso" d="M139 88 Q158 82 179 88 L193 155 177 164 174 137 174 173 137 173 137 133 128 166 113 158 Z"/><path class="body-outline" data-zone="legs" d="M137 173 H174 L177 266 H159 L155 194 150 266 H132 Z"/><path data-zone="weapon" class="body-weapon" d="M129 125 L194 148 192 160 157 148 150 164 141 160 146 144 125 139 Z"/><path class="shot-leaders" d="M145 64 H96 M141 109 H219 M142 223 H94 M175 148 H220"/></svg>';
 body.querySelector('svg').addEventListener('click',event=>{const part=event.target.dataset.zone;if(part)onSelect(part,aim);});
 const names={head:'Head',torso:'Torso',legs:'Legs',weapon:'Weapon'};
 for(const part of Object.keys(names)){
  const p=previewAttack(s,a,b,burst,part,null,aim),forecast=shotForecast(s,a,b,p),button=document.createElement('button');
  button.className='body-target target-'+part;button.dataset.choice=part;button.setAttribute('aria-pressed',String(zone===part));
  button.textContent=names[part]+' · '+(forecast?'≈ '+forecast[0].selected+'%':'—');button.title=p.reason||'Select '+part;button.onclick=()=>onSelect(part,aim);body.append(button);
 }
 node.append(body);
 const modes=document.createElement('div');modes.className='shot-aims';modes.setAttribute('aria-label','Aim level');
 for(const [key,value] of Object.entries(AIM_LEVELS)){
  const p=previewAttack(s,a,b,burst,zone,null,key),forecast=shotForecast(s,a,b,p),button=document.createElement('button');button.dataset.choice=key;button.dataset.aim=key;button.setAttribute('aria-pressed',String(aim===key));
  const icon=document.createElement('span');icon.className='aim-icon aim-'+key;icon.setAttribute('aria-hidden','true');icon.textContent=key==='hip'?'•':key==='aimed'?'⊕':'◎';
  const label=document.createElement('strong');label.textContent=value.label;const cost=document.createElement('span');cost.textContent=p.cost+' AP · '+(forecast?'≈ '+forecast[0].selected+'%':'—');button.append(icon,label,cost);button.title=p.reason||value.label;button.disabled=!!a.pinned&&key!=='hip';button.onclick=()=>onSelect(zone,key);modes.append(button);
 }
 node.append(modes);
 const detail=document.createElement('p'),p=previewAttack(s,a,b,burst,zone,null,aim),forecast=shotForecast(s,a,b,p);detail.className='shot-detail';detail.setAttribute('aria-live','polite');
 detail.textContent=forecast?AIM_LEVELS[aim].label+' → '+zone+': selected part ≈ '+forecast.map(r=>r.selected+'%').join(' / ')+'; anywhere ≈ '+forecast.map(r=>r.any+'%').join(' / ')+'. '+p.cost+' AP total.'+(burst?' Values follow burst order.':''):'Hit estimates unavailable until this merc can identify the target.';
 node.append(detail);
 const blockers=shotBlockers(s,a,b,p);if(blockers.length){const status=document.createElement('p');status.className='shot-blockers';status.setAttribute('role','status');status.textContent=blockers.join(' ');node.append(status);}
 if(focused)node.querySelector('[data-choice="'+focused+'"]')?.focus({preventScroll:true});
}

export function shotBlockers(s,a,b,p){
 const reasons=[];
 if(combatCosts(s)&&Number.isFinite(p.cost)&&a.ap<p.cost)reasons.push(a.name+' has '+a.ap+' AP; this shot needs '+p.cost+' AP. Choose another merc or end the turn.');
 if(p.reason&&p.reason!=='Not enough AP')reasons.push(p.reason==='Selected merc has not identified this target'?a.name+' has not personally identified '+b.name+'. Another squad member can see them; this merc cannot fire yet.':p.reason+'.');
 return reasons;
}

import {QUICKPLAY_PRESETS,DEFAULT_QUICKPLAY_TEAM,normalizeQuickPlayTeam} from './quickplay-presets.js';
import {createWeaponSprite} from './weapon-icons.js';

export function createQuickPlayMenu(root,{onLaunch}){
 const grid=document.createElement('div');grid.className='quickplay-grid';
 const choices=QUICKPLAY_PRESETS.map(p=>{
  const card=document.createElement('label');card.className='quickplay-card';
  const check=document.createElement('input');check.type='checkbox';check.value=p.id;check.setAttribute('aria-label',p.label+' · '+p.name);
  const heading=document.createElement('span');heading.className='quickplay-heading';
  const role=document.createElement('strong');role.textContent=p.label;const name=document.createElement('small');name.textContent=p.name+' / '+p.species;
  heading.append(role,name);const art=document.createElement('span');art.className='quickplay-weapons';
  for(const kind of p.weapons){const frame=document.createElement('span');frame.append(createWeaponSprite(kind,{height:42}));art.append(frame);}
  const description=document.createElement('span');description.className='quickplay-description';description.textContent=p.description;
  const skills=document.createElement('span');skills.className='quickplay-skills';
  const keys=p.id==='doctor'?['medical','firearms']:p.id==='demolition'?['explosives','dexterity']:p.id==='sniper'?['firearms','perception']:p.id==='rifleman'?['firearms','agility']:['heavyWeapons','strength'];
  skills.textContent=keys.map(k=>k.replace(/([A-Z])/g,' $1')+' '+p.stats[k]).join(' / ');
  card.append(check,heading,art,description,skills);grid.append(card);check.onchange=sync;return {check,card};
 });
 const footer=document.createElement('div');footer.className='quickplay-actions';
 const count=document.createElement('p');count.id='quickplay-count';count.setAttribute('role','status');
 const reset=document.createElement('button');reset.type='button';reset.className='quickplay-reset';reset.textContent='Default team';reset.onclick=()=>setTeam(DEFAULT_QUICKPLAY_TEAM);
 const start=document.createElement('button');start.type='button';start.className='action';start.textContent='Start Quick Fight ↗';start.onclick=()=>{if(!start.disabled)onLaunch(value());};
 footer.append(count,reset,start);root.append(grid,footer);
 function value(){return choices.filter(c=>c.check.checked).map(c=>c.check.value);}
 function sync(){const selected=value().length;count.textContent=selected+' / 4 selected'+(selected===4?' · Ready to deploy':' · Choose exactly four');start.disabled=selected!==4;for(const c of choices)c.card.classList.toggle('chosen',c.check.checked);}
 function setTeam(ids){const selected=new Set(normalizeQuickPlayTeam(ids));for(const c of choices)c.check.checked=selected.has(c.check.value);sync();}
 return {setTeam,value};
}

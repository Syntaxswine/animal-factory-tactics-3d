import {campaignCandidates,campaignRoster,deploymentSectors,hiringReason} from './campaign-hiring.js';
import {describeKit,contractPrices,contractMinutesLeft,ROSTER_MAX} from './core/recruits.js';
import {WEAPONS} from './core/engine.js';
import {hudPortrait} from './battle-hud-model.js';
import {isDeceased} from './mercenary-status.js';

const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function portrait(u){const box=el('div',undefined,'merc-portrait roster-portrait'+(isDeceased(u)?' deceased':'')),img=el('img');img.src=hudPortrait(u);img.alt=u.name;box.append(img);if(isDeceased(u))box.append(el('span','Deceased','deceased-stamp'));return box;}

export function createCampaignRoster({getCampaign,change}){
 const dialog=document.querySelector('#hire-mercenaries'),list=document.querySelector('#hire-candidates'),term=document.querySelector('#hire-term'),destination=document.querySelector('#hire-destination');
 let busy=false;
 const action=async fn=>{if(busy)return;busy=true;render();try{await fn();}finally{busy=false;render();}};
 function render(){
  const c=getCampaign();if(!c)return;
  const selected=destination.value,options=deploymentSectors(c);destination.replaceChildren(...options.map(s=>{const option=el('option',s.name);option.value=s.index;return option;}));if(options.some(s=>String(s.index)===selected))destination.value=selected;
  destination.disabled=busy;term.disabled=busy;
  document.querySelector('#hire-balance').textContent='Available: $'+c.money.toLocaleString()+' · '+campaignRoster(c).length+' / '+ROSTER_MAX+' active mercs';
  const candidates=campaignCandidates(c);list.replaceChildren();
  if(!options.length)list.append(el('p','No peaceful visited sector is available for arrival.'));
  else if(!candidates.length)list.append(el('p','All of today’s candidates have been hired. New candidates arrive at midnight.'));
  for(const candidate of candidates){
   const card=el('article',undefined,'recruit-card');card.dataset.candidate=candidate.key;
   const info=el('div'),button=el('button','Hire · $'+candidate.prices[term.value].price.toLocaleString()),reason=hiringReason(c,candidate,term.value,+destination.value);
   info.append(el('h3',candidate.name),el('p',candidate.species+' · '+candidate.archetype),el('p',describeKit(candidate,WEAPONS),'recruit-kit'));
   info.append(el('p',Object.values(candidate.prices).map(p=>p.label+' $'+p.price.toLocaleString()).join(' / '),'contract-prices'));
   button.disabled=busy||!!reason;button.title=reason||'Arrives immediately at '+options.find(s=>s.index===+destination.value)?.name;button.onclick=()=>action(()=>change({key:candidate.key,term:term.value,sector:+destination.value}));info.append(button);if(reason)info.append(el('small',reason));card.append(portrait(candidate),info);list.append(card);
  }
  const contracts=document.querySelector('#merc-contracts');contracts.replaceChildren();
  for(const u of campaignRoster(c).filter(u=>u.contract)){
   const row=el('article',undefined,'merc-contract'),hours=Math.ceil(contractMinutesLeft(u,c.clock.minutes)/60);row.append(el('strong',u.name),el('p',hours?'Contract: '+hours+' hours remaining':'Contract expired; leaves when safe.'));
   const price=contractPrices(u)[term.value],renew=el('button','Renew '+term.value+' · $'+price.price.toLocaleString());renew.disabled=busy||!!c.active||c.money<price.price;renew.onclick=()=>action(()=>change({id:u.campaignId,term:term.value}));row.append(renew);contracts.append(row);
  }
 }
 document.querySelector('#hire-close').onclick=()=>dialog.close();term.onchange=destination.onchange=render;
 return {
  show(){document.querySelector('#hire-message').textContent='';render();dialog.showModal();},
  refresh(){if(dialog.open)render();},
  memorial(){const root=document.querySelector('#fallen-mercs'),fallen=Object.values(getCampaign()?.characters||{}).map(r=>r.unit).filter(u=>u.team==='squad'&&isDeceased(u));root.replaceChildren();document.querySelector('#fallen-roster').hidden=!fallen.length;for(const u of fallen){const card=el('article',undefined,'fallen-card');card.append(portrait(u),el('strong',u.name));root.append(card);}}
 };
}

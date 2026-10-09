import {slate,fit,dailyRate,pricesFor,previewRecruit,contractPrices,payDay,ROSTER_MAX,DAY_MINUTES} from './core/recruits.js';
import {enlist} from './core/world.js';
import {onContract} from './core/happiness.js';
import {WEAPONS,refresh} from './core/engine.js';
import {syncWeapons} from './core/inventory.js';
import {initializeStats,migrateStats} from './character-stats.js';
import {sectorPeace,registerCampaignCharacter,reconcileCampaign} from './campaign-model.js';

export const campaignRoster=c=>Object.values(c.characters).filter(r=>r.location.kind!=='removed'&&onContract(r.unit)).map(r=>r.unit);
export function campaignCandidates(c){
 const day=Math.floor(c.clock.minutes/DAY_MINUTES),records=Object.values(c.characters).filter(r=>r.unit.team==='squad'),members=campaignRoster(c);
 const hired=new Set(records.map(r=>r.unit.hired?.key)),taken=new Set(records.filter(r=>r.unit.hired?.day!==day).map(r=>r.unit.name));
 return slate(c.seed,day,{taken}).filter(candidate=>!hired.has(candidate.key)).map(candidate=>{const compatibility=fit(candidate.archetype,members),rate=dailyRate(candidate,compatibility);return {...candidate,fit:compatibility,rate,prices:pricesFor(rate,candidate.archetype)};});
}
// Central arrival policy, ready for the later SAM/deployment rules. For now,
// replacements arrive only in peaceful, visited sectors with a local map.
export function deploymentSectors(c){
 return Object.entries(c.sectors).filter(([index,s])=>s.initialized&&c.assignments[index]&&s.owner!=='red-hats'&&sectorPeace(c,+index)).map(([index])=>({index:+index,name:c.assignments[index].map.name}));
}
function destinationGroup(c,index){return c.groups.find(g=>g.faction==='player'&&!g.disbanded&&g.travel.position===index&&!g.travel.route.length&&!g.waitMinutes);}
export function hiringReason(c,candidate,term,index){
 if(c.active)return 'Return from the local encounter before hiring.';
 if(!candidate)return 'That candidate is no longer available.';
 if(!deploymentSectors(c).some(s=>s.index===index))return 'Choose a peaceful visited sector for arrival.';
 if(campaignRoster(c).length>=ROSTER_MAX)return 'The roster holds '+ROSTER_MAX+' mercenaries.';
 if(!destinationGroup(c,index)&&c.groups.length>=64)return 'The campaign group limit has been reached.';
 const terms=candidate.prices[term];if(!terms)return 'Choose a day, a week or a month.';
 if(c.money<terms.price)return 'Need $'+terms.price.toLocaleString()+'.';
 return '';
}
export function hireCampaignMerc(c,key,term,index){
 const candidate=campaignCandidates(c).find(candidate=>candidate.key===key),reason=hiringReason(c,candidate,term,index);if(reason)throw Error(reason);
 const sector=c.sectors[index],s=sector.state,terms=candidate.prices[term];
 const u=enlist(s,candidate,{id:c.nextUnitId});if(!u)throw Error('No free ground to arrive on.');
 // Use the existing stat migration for the recruit's graded legacy profile,
 // rather than leaving every hire on the same generic modern stat profile.
 initializeStats(u,migrateStats(previewRecruit(candidate,WEAPONS)).stats);syncWeapons(u);
 registerCampaignCharacter(c,u,c.id+':hire:'+candidate.key,{kind:'sector',sector:index});
 u.hired={key:candidate.key,day:candidate.day,grade:candidate.grade,rate:candidate.rate,signed:c.clock.minutes};
 u.contract={term,from:c.clock.minutes,until:c.clock.minutes+terms.minutes,paid:terms.price,renewals:0,expired:false};
 c.money-=terms.price;
 let g=destinationGroup(c,index);if(!g){const number=c.nextGroup++;g={id:'group-'+number,name:'Group '+number,faction:'player',memberIds:[],waitMinutes:0,travel:{version:1,position:index,route:[],progress:0,restRequired:false}};c.groups.push(g);}
 g.memberIds.push(u.campaignId);c.selectedGroup=g.id;
 s.units=sector.population.map(id=>c.characters[id].unit);s.phase='explore';s.engaged=false;s.queue=[];s.effect=null;s.selected=u.id;delete s.defeat;refresh(s);reconcileCampaign(c);
 c.log.push({time:c.clock.minutes,text:u.name+' hired for a '+term+' ($'+terms.price.toLocaleString()+'), arriving at '+c.assignments[index].map.name+'.'});c.revision++;
 return u;
}
export function renewCampaignContract(c,id,term){
 const u=campaignRoster(c).find(u=>u.campaignId===id),terms=u&&contractPrices(u)?.[term];
 if(!u||!terms)throw Error('That mercenary has no renewable contract.');
 if(c.active)throw Error('Return from the local encounter before renewing.');
 if(c.money<terms.price)throw Error('Need $'+terms.price.toLocaleString()+'.');
 c.money-=terms.price;u.contract={...u.contract,term,until:Math.max(c.clock.minutes,u.contract.until)+terms.minutes,paid:u.contract.paid+terms.price,renewals:u.contract.renewals+1,expired:false};payDay(u);
 c.log.push({time:c.clock.minutes,text:u.name+' renewed for a '+term+' ($'+terms.price.toLocaleString()+').'});c.revision++;
}

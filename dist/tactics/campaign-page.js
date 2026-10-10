import {loadOpeningContent} from './campaign-opening.js';
import {createCampaign,openCampaignSector,orderCampaignTravel,campaignRoute,advanceCampaign,splitCampaignGroup,groupMembers,travelState} from './campaign-model.js';
import {captureCampaign} from './campaign-save.js';
import {CampaignSession,loadCampaignSession,getCampaignSave,putCampaignSave,listCampaignSaves,CAMPAIGN_SLOTS} from './campaign-store.js';
import {createSavePanel} from './save-panel.js';
import {formatClock} from './game-clock.js';
import {groupPace,travelPreview} from './overmap-travel.js';
import {drawSector,svg} from './overmap-symbols.js';
import {readSettings} from './settings-3d.js';
import {hireCampaignMerc,renewCampaignContract} from './campaign-hiring.js';
import {createCampaignRoster} from './campaign-roster.js';
const $=id=>document.getElementById(id),el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};let session,busy=false,proposed=null;
const say=text=>{$('campaign-message').textContent=text;$('hire-message').textContent=text;};
const roster=createCampaignRoster({getCampaign:()=>session?.campaign,change:request=>run(async()=>{await session.transition(c=>request.id?renewCampaignContract(c,request.id,request.term):hireCampaignMerc(c,request.key,request.term,request.sector));say(request.id?'Contract renewed and saved. Time is paused.':'Mercenary hired and arrival saved. Time is paused.');})});
$('hire-open').onclick=()=>roster.show();
const saves=createSavePanel({slots:CAMPAIGN_SLOTS,list:listCampaignSaves,title:'Campaign save / load',onSave:async id=>{if(!session)throw Error('Start a campaign first.');await session.save(id);},onLoad:async id=>{session=await loadCampaignSession(id);render();say('Campaign loaded. Time is paused.');}});
$('campaign-saves').onclick=()=>saves.show();
async function run(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){say(e.message);}finally{busy=false;render();}}
async function enter(index){await session.transition(c=>openCampaignSector(c,index));location.href='battle-3d.html?campaign=continue';}
function render(){
 const c=session?.campaign,g=c?.groups.find(g=>g.id===c.selectedGroup);$('clock').textContent=c?formatClock(c.clock)+' · $'+c.money.toLocaleString():'';
 $('groups').replaceChildren();$('group-detail').replaceChildren();$('incidents').replaceChildren();$('campaign-log').replaceChildren();
 for(const q of c?.groups.filter(g=>g.faction==='player'&&g.memberIds.length)||[]){const b=el('button',q.name+' · '+q.memberIds.length+' mercs');b.setAttribute('aria-pressed',String(q===g));b.disabled=busy;b.onclick=()=>{c.selectedGroup=q.id;render();};$('groups').append(b);}
 if(g){const names=groupMembers(c,g);$('group-detail').append(el('p',c.overmap.sectors[g.travel.position].name||'Sector '+g.travel.position));for(const u of names){const label=el('label',''),check=document.createElement('input');check.type='checkbox';check.value=u.campaignId;label.append(check,document.createTextNode(' '+u.name+' · '+u.hp+' HP · fatigue '+Math.round(u.social?.fatigue||0)+'%'));$('group-detail').append(label);}if(g.travel.route.length){const p=travelPreview(travelState(c,g));$('group-detail').append(el('p',g.entryBlocked?'Waiting for a clear sector entry. Travel will resume when space opens.':'Travelling · '+Math.ceil(p.travelMinutes+p.restMinutes+g.waitMinutes)+' minutes remaining'));}}
 $('enter-sector').disabled=busy||!g||!!c?.active||!!g.travel.route.length||!c?.assignments[g?.travel.position];$('enter-sector').onclick=()=>run(()=>enter(g.travel.position));
 $('split-group').disabled=busy||!g||g.memberIds.length<2||!!c?.active||!!g.travel.route.length;
 $('resume-battle').hidden=!c?.active;$('resume-battle').disabled=busy;$('resume-battle').onclick=()=>location.href='battle-3d.html?campaign=continue';
 for(const b of document.querySelectorAll('[data-minutes]'))b.disabled=busy||!c||!!c.active||c.incidents.some(i=>i.status==='pending');
 for(const i of c?.incidents.filter(i=>i.status!=='resolved')||[]){const row=el('p',formatClock({minutes:i.time})+' · Encounter at '+c.assignments[i.sector]?.map.name+' '),b=el('button',i.status==='active'?'Resume':'Enter encounter');b.disabled=busy||!!c.active&&c.active.sector!==i.sector;b.onclick=()=>run(()=>enter(i.sector));row.append(b);$('incidents').append(row);}
 for(const l of (c?.log||[]).slice(-8).reverse())$('campaign-log').append(el('li',formatClock({minutes:l.time})+' · '+l.text));
 $('new-campaign').disabled=busy;
 $('hire-open').disabled=busy||!c||!!c.active;roster.memorial();roster.refresh();
 if(!c){$('campaign-map').replaceChildren(el('p','Start a new campaign, or load a saved one.'));return;}
 const root=svg('svg',{viewBox:'-15 -15 3030 1530',role:'img','aria-label':'Overmap with two playable sectors'});
 c.overmap.sectors.forEach((s,index)=>{const tile=svg('g',{transform:`translate(${index%30*100} ${Math.floor(index/30)*100})`,'data-sector':index,class:c.assignments[index]?'assigned':'unassigned'});tile.append(drawSector(s,{overlay:'ownership'}));if(c.assignments[index]){tile.append(svg('rect',{x:3,y:3,width:94,height:94,class:'assigned-outline'}));tile.append(svg('title',{},[document.createTextNode(s.name)]));}tile.onclick=()=>chooseDestination(index);root.append(tile);});
 for(const q of c.groups.filter(q=>q.memberIds.length)){
  const center=i=>[i%30*100+50,Math.floor(i/30)*100+50],a=center(q.travel.position),route=q.travel.route,points=[a,...route.map(e=>center(e.to))],color=q.faction==='player'?'#dfaa39':'#a72823';
  if(route.length)root.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':9,'stroke-dasharray':'16 8','pointer-events':'none'}));
  let p=a;if(route.length){const b=center(route[0].to),duration=campaignDuration(q),t=q.travel.progress/duration;p=a.map((v,i)=>v+(b[i]-v)*t);}
  root.append(svg('circle',{cx:p[0],cy:p[1],r:q.faction==='player'?17:12,fill:color,stroke:'#fff3d0','stroke-width':4,'pointer-events':'none'}));
 }
 if(proposed){const points=[proposed.route[0].from,...proposed.route.map(e=>e.to)].map(i=>`${i%30*100+50},${Math.floor(i/30)*100+50}`);root.append(svg('polyline',{points:points.join(' '),fill:'none',stroke:'#26362d','stroke-width':12,'stroke-dasharray':'8 6','pointer-events':'none'}));}
 $('campaign-map').replaceChildren(root);
}
function campaignDuration(g){return groupPace(groupMembers(session.campaign,g),g.travel.route[0]?.road).minutes;}
function chooseDestination(index){if(busy||!session)return;try{const c=session.campaign,p=campaignRoute(c,c.selectedGroup,index);proposed={index,id:c.selectedGroup,route:p.route};$('travel-summary').textContent=c.assignments[index].map.name+' · '+Math.ceil(p.preview.travelMinutes+p.preview.restMinutes)+' minutes ('+Math.ceil(p.preview.restMinutes)+' resting).';$('travel-members').replaceChildren(...p.members.map(u=>el('li',u.name)));$('synchronize-row').hidden=!c.groups.some(g=>g.id!==c.selectedGroup&&g.travel.route.at(-1)?.to===index);$('synchronize').checked=false;render();$('travel-order').showModal();}catch(e){say(e.message);}}
$('travel-order').addEventListener('close',()=>{proposed=null;render();});
$('travel-cancel').onclick=()=>$('travel-order').close();$('travel-confirm').onclick=()=>run(async()=>{const p=proposed;await session.transition(c=>orderCampaignTravel(c,p.id,p.index,{synchronize:$('synchronize').checked}));$('travel-order').close();say('Travel orders saved. Advance time to move the group.');});
$('split-group').onclick=()=>run(async()=>{const ids=[...$('group-detail').querySelectorAll('input:checked')].map(e=>e.value);await session.transition(c=>splitCampaignGroup(c,c.selectedGroup,ids));say('Group split.');});
for(const b of document.querySelectorAll('[data-minutes]'))b.onclick=()=>run(async()=>{await session.transition(c=>advanceCampaign(c,+b.dataset.minutes));say(session.campaign.incidents.some(i=>i.status==='pending')?'Contact. Enter the encounter to resolve it.':'Time advanced and checkpoint saved.');});
$('new-campaign').onclick=()=>run(async()=>{const c=createCampaign(await loadOpeningContent(),{difficulty:readSettings().difficulty});await putCampaignSave('continue',captureCampaign(c));session=new CampaignSession(c);say('Campaign started. Enter the safehouse to equip and search supplies, or select the checkpoint to order travel.');});
try{const slot=new URLSearchParams(location.search).get('load')||'continue';if(await getCampaignSave(slot))session=await loadCampaignSession(slot);}catch(e){say(e.message);}render();
if(session&&new URLSearchParams(location.search).has('defeat'))say('Squad defeated. Time is paused. Other groups can continue, and new mercenaries can be hired with the remaining funds.');
window.campaignView={get state(){return session?.campaign;}};

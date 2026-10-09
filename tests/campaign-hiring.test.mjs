import test from 'node:test';
import assert from 'node:assert/strict';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {createCampaign,openCampaignSector,finishCampaignEncounter,splitCampaignGroup,advanceCampaign,orderCampaignTravel} from '../dist/tactics/campaign-model.js';
import {campaignCandidates,campaignRoster,deploymentSectors,hireCampaignMerc,renewCampaignContract} from '../dist/tactics/campaign-hiring.js';
import {refresh} from '../dist/tactics/core/engine.js';
import {captureCampaign,restoreCampaign,checkpointTransition} from '../dist/tactics/campaign-save.js';
const content=openingContent(),fresh=()=>createCampaign({...content,reinforcements:[],reinforcement:null},{id:'hiring-regression'});
function defeat(c){const s=openCampaignSector(c,70);for(const u of s.units.filter(u=>u.team==='squad')){u.hp=0;u.casualty='dead';u.ap=0;}refresh(s);return s;}

test('defeat checkpoints preserve deceased identities and can hire a new group without reviving the old squad',()=>{
 let c=fresh();const s=defeat(c),dead=s.units.filter(u=>u.team==='squad').map(u=>u.campaignId),time=c.clock.minutes,money=c.money;
 finishCampaignEncounter(c);assert.equal(c.active,null);assert.equal(c.selectedGroup,null);assert.equal(c.clock.minutes,time);assert.equal(campaignRoster(c).length,0);assert.match(c.log.at(-1).text,/squad has died/i);
 c=restoreCampaign(captureCampaign(c));assert.deepEqual(deploymentSectors(c).map(s=>s.index),[70]);const candidate=campaignCandidates(c)[0],u=hireCampaignMerc(c,candidate.key,'week',70);
 assert.equal(c.money,money-candidate.prices.week.price);assert.equal(c.clock.minutes,time);assert.equal(u.contract.until,time+10080);assert.equal(campaignRoster(c).length,1);assert(!dead.includes(u.campaignId));assert(u.stats);assert(u.hp>0);assert.equal(u.hp,u.maxHp);
 c=restoreCampaign(captureCampaign(c));for(const id of dead){assert.equal(c.characters[id].location.reason,'dead');assert.equal(c.characters[id].unit.hp,0);}
 const next=openCampaignSector(c,70);assert.equal(next.units.filter(u=>u.team==='squad').length,1);assert.equal(next.units.find(u=>u.id===next.selected).campaignId,u.campaignId);assert.notEqual(next.phase,'lost');
});
test('a lost group does not disband or move a different player group',()=>{
 const c=fresh(),ids=c.groups[0].memberIds.slice(0,2);splitCampaignGroup(c,'group-1',ids);orderCampaignTravel(c,'group-2',71);advanceCampaign(c,20);defeat(c);finishCampaignEncounter(c);
 assert.deepEqual(c.groups.find(g=>g.id==='group-2').memberIds,ids);assert.equal(c.selectedGroup,'group-2');assert.equal(c.characters[ids[0]].location.kind,'travel');restoreCampaign(captureCampaign(c));
});
test('insufficient funds, invalid arrivals and duplicate hires leave money and identity counters unchanged',()=>{
 const c=fresh(),candidate=campaignCandidates(c)[0];c.money=candidate.prices.day.price-1;let before=structuredClone(c);assert.throws(()=>hireCampaignMerc(c,candidate.key,'day',70),/Need/);assert.deepEqual(c,before);
 c.money=20000;before=structuredClone(c);assert.throws(()=>hireCampaignMerc(c,candidate.key,'day',71),/peaceful visited/);assert.deepEqual(c,before);
 const second=campaignCandidates(c)[1];hireCampaignMerc(c,candidate.key,'day',70);assert.equal(campaignCandidates(c).find(q=>q.key===second.key).name,second.name);before=structuredClone(c);assert.throws(()=>hireCampaignMerc(c,candidate.key,'day',70),/no longer/);assert.deepEqual(c,before);
});
test('failed defeat or hiring writes preserve the live campaign; retries commit a single charge',async()=>{
 const c=fresh();defeat(c);let before=structuredClone(c);const fail=async()=>{throw Error('Disk full');};await assert.rejects(checkpointTransition(c,finishCampaignEncounter,fail),/Disk full/);assert.deepEqual(c,before);
 const returned=await checkpointTransition(c,finishCampaignEncounter,async()=>{}),candidate=campaignCandidates(returned)[0];before=structuredClone(returned);await assert.rejects(checkpointTransition(returned,n=>hireCampaignMerc(n,candidate.key,'day',70),fail),/Disk full/);assert.deepEqual(returned,before);
 const hired=await checkpointTransition(returned,n=>hireCampaignMerc(n,candidate.key,'day',70),async()=>{});assert.equal(hired.money,returned.money-candidate.prices.day.price);assert.equal(campaignRoster(hired).length,1);restoreCampaign(captureCampaign(hired));
});
test('renewals extend the paid contract and strategic time honors its expiry',()=>{
 const c=fresh(),candidate=campaignCandidates(c)[0],u=hireCampaignMerc(c,candidate.key,'day',70),original=u.contract.until;renewCampaignContract(c,u.campaignId,'day');assert.equal(u.contract.until,original+1440);
 c.clock.minutes=u.contract.until-1;advanceCampaign(c,1);assert.equal(u.casualty,'quit');assert.equal(c.characters[u.campaignId].location.reason,'quit');assert(!campaignRoster(c).includes(u));restoreCampaign(captureCampaign(c));
});
test('captured mercs stay captured and never acquire deceased records on defeat',()=>{
 const c=fresh(),s=defeat(c),u=s.units[0];u.casualty='captured';finishCampaignEncounter(c);assert.equal(c.characters[u.campaignId].unit.casualty,'captured');assert.notEqual(c.characters[u.campaignId].location.kind,'removed');assert.match(c.log.at(-1).text,/captured/);restoreCampaign(captureCampaign(c));
});

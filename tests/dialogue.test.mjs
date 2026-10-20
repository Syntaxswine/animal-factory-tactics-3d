import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalJSON,dialogueHash,validateDialogue,dialogueDiagnostics,mergeDialogueDefinitions} from '../dist/tactics/dialogue-schema.js';
import {createDialogueState,getDialogueRecord,dialogueEntry,dialogueLine,flavourHash,checkChance,choicePreview,stageDialogue,percentile,percentileOutcome,validateDialogueState,pinDialogue} from '../dist/tactics/dialogue-state.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/dialogues/'+name+'.json',import.meta.url),'utf8'));
const bomb=read('yard_bomb_permission'),flat=read('yard_worker_flavour'),npc='char_nadia';
const speaker={id:'char_misha',archetype:'Creator',stats:{explosives:65}},offer=bomb.nodes.greeting.choices.find(c=>c.id==='offer');
const record=s=>getDialogueRecord(s,npc,bomb);
const preview=(s,id='offer',who=speaker,node='greeting')=>choicePreview(bomb,record(s),node,id,who,s.revision);
const choose=(s,id='offer',who=speaker,node='greeting')=>stageDialogue(s,bomb,npc,who,node,id,preview(s,id,who,node).token,480);
const inverseLCG=output=>Number(((BigInt(output)-1013904223n)*4276115653n)&0xffffffffn);
function rollState(roll){const s=createDialogueState(1);s.initialSeed=s.checkSeed=inverseLCG(roll-1);return s;}

test('definitions and canonical SHA-256 match an independent crypto oracle',()=>{
 for(const d of [bomb,flat,'abc',{z:'été',a:[true,false,3]},{}])assert.equal(dialogueHash(d),createHash('sha256').update(canonicalJSON(d)).digest('hex'));
 assert.equal(validateDialogue(bomb),bomb);assert.equal(validateDialogue(flat),flat);
 assert.equal(flavourHash([173,'npc_a','greeting',1,'start',0]),1155903867);
});
test('minimum and 20% boundaries are separate, including modifiers',()=>{
 for(const [skill,difficulty,boost,visible,chance]of [[39,50,0,false,39],[40,50,0,true,40],[41,50,0,true,41],[39,75,0,false,14],[40,75,0,false,15],[41,75,0,false,16],[44,75,0,false,19],[45,75,0,true,20],[46,75,0,true,21],[39,75,10,false,24],[40,75,10,true,25],[41,75,10,true,26]]){
  const p=checkChance({...offer.check,difficulty},{explosives:skill},{reassured:boost===10});assert.equal(p.chance,chance);assert.equal(p.eligible,visible);
 }
 assert.equal(checkChance({skill:'explosives',difficulty:100,modifiers:[{id:'bad',fact:{id:'a',is:true},add:-20}]},{explosives:1},{a:true}).chance,1);
 assert.equal(checkChance({skill:'explosives',difficulty:0},{explosives:100}).chance,99);
 assert.equal(checkChance({...offer.check,modifiers:[{id:'a',add:20},{id:'b',add:20}]},speaker.stats).modifier,20);
 for(const v of [undefined,NaN,0,101,1.5])assert.equal(checkChance(offer.check,{explosives:v}).valid,false);
});
test('all 100 rolls at every chance give exactly the displayed number of successes',()=>{
 for(let chance=1;chance<=99;chance++){
  const outcomes=Array.from({length:100},(_,i)=>percentileOutcome(chance,i+1));
  assert.equal(outcomes.filter(o=>o==='success').length,chance);assert.equal(outcomes[0],'success');assert.equal(outcomes[99],'failure');assert.equal(outcomes[chance-1],'success');assert.equal(outcomes[chance],'failure');
 }
});
test('actual commands resolve all 100 rolls at 20%, 50%, and 99%, including critical text',()=>{
 for(const chance of [20,50,99])for(let roll=1;roll<=100;roll++){
  const d=structuredClone(bomb);d.nodes.greeting.choices[2].check={attemptId:'permission',skill:'explosives',minimum:1,difficulty:50};
  const s=rollState(roll),r=getDialogueRecord(s,npc,d),who={...speaker,stats:{explosives:chance}},p=choicePreview(d,r,'greeting','offer',who,s.revision);
  const out=stageDialogue(s,d,npc,who,'greeting','offer',p.token,480);assert.equal(out.receipt.roll,roll);assert.equal(out.receipt.outcome,roll<=chance?'success':'failure');
  assert.equal(out.receipt.response,d.nodes.greeting.choices[2].rollText[roll]||d.nodes[out.nodeId].npc);validateDialogueState(out.next);
 }
 for(const chance of [1,19]){const s=createDialogueState(1);const d=structuredClone(bomb);d.nodes.greeting.choices[2].check={attemptId:'permission',skill:'explosives',minimum:1,difficulty:50};const who={...speaker,stats:{explosives:chance}},before=structuredClone(s),p=choicePreview(d,getDialogueRecord(s,npc,d),'greeting','offer',who,0);assert.equal(p.visible,false);assert.throws(()=>stageDialogue(s,d,npc,who,'greeting','offer',p.token),/changed/);assert.deepEqual(s,before);}
});
test('percentile accepts the correct interval and rejects the top 96 uint32 outputs',()=>{
 for(const n of [0,99,4294967199]){const result=percentile(inverseLCG(n));assert.equal(result.seed,n);assert.equal(result.roll,n%100+1);}
 for(let n=4294967200;n<=4294967295;n++){const result=percentile(inverseLCG(n));assert.notEqual(result.seed,n);assert.ok(result.seed<4294967200);assert.ok(result.roll>=1&&result.roll<=100);}
});
test('ordinary replies are pure; personality reassurance records once and improves only explicit checks',()=>{
 const s=rollState(47),before=structuredClone(s);assert.deepEqual(choose(s,'ask'),{nodeId:'facts'});assert.deepEqual(s,before);
 assert.equal(preview(s,'creator',{...speaker,archetype:'Ruler'}).visible,false);assert.equal(preview(s).check.chance,40);
 const reassured=choose(s,'creator').next;assert.equal(reassured.checkSeed,s.checkSeed);assert.equal(reassured.revision,1);assert.equal(record(reassured).facts.reassured,true);assert.equal(preview(reassured).check.chance,50);
 const repeated=choose(reassured,'creator');assert.equal(repeated.repeated,true);assert.equal(repeated.next,undefined);
 const success=choose(reassured);assert.equal(success.receipt.roll,47);assert.equal(success.receipt.outcome,'success');assert.equal(record(success.next).facts.permission,true);
 assert.equal(choose(s).receipt.outcome,'failure');assert.equal(choose(choose(rollState(51),'creator').next).receipt.outcome,'failure');validateDialogueState(success.next);
});
test('opening and inspecting never consumes rolls; choices cannot pool speakers or use stale previews',()=>{
 const s=createDialogueState(17),before=structuredClone(s);
 for(let i=0;i<100;i++){for(const [archetype,explosives]of [['Ruler',30],['Rebel',45],['Creator',65],['Caregiver',20]])preview(s,'offer',{id:archetype,archetype,stats:{explosives}});dialogueEntry(bomb,record(s));dialogueLine(flat,'greeting',getDialogueRecord(s,npc,flat),s.initialSeed,480);}
 assert.deepEqual(s,before);
 const p=preview(s);assert.throws(()=>stageDialogue(s,bomb,npc,{...speaker,stats:{explosives:66}},'greeting','offer',p.token),/changed/);assert.deepEqual(s,before);
});
test('same-day flat lines, pinning, rename, repeat, and new NPC instance semantics',()=>{
 const s=createDialogueState(17),r=getDialogueRecord(s,npc,flat),line=dialogueLine(flat,'greeting',r,s.initialSeed,480);assert.equal(line,dialogueLine(flat,'greeting',r,s.initialSeed,900));assert.equal(s.revision,0);
 const done=choose(rollState(100)).next,original=structuredClone(done),who={id:'other_merc',archetype:'Ruler',stats:{explosives:100}};
 assert.equal(choose(done,'offer',who).repeated,true);assert.deepEqual(done,original);assert.equal(dialogueEntry(bomb,record(done)),'refused');
 const other=getDialogueRecord(done,'char_copied_nadia',bomb);assert.equal(dialogueEntry(bomb,other),'greeting');assert.equal(other.facts.permission,false);
 const update=structuredClone(bomb);update.version=2;update.nodes.refused.npc='Changed author text';assert.equal(pinDialogue(done,update).version,1);assert.equal(record(done).receipts[0].response,bomb.nodes.greeting.choices[2].rollText[100]);
 validateDialogueState(done);
});
test('save replay rejects altered odds, seeds, effects, response text, duplicates and malformed definitions',()=>{
 const valid=choose(choose(rollState(1),'creator').next).next;validateDialogueState(valid);
 const key=Object.keys(valid.records)[0];for(const mutate of [s=>s.checkSeed++,s=>s.initialSeed++,s=>s.revision++,s=>s.records[key].facts.permission=false,s=>s.records[key].receipts[1].roll=50,s=>s.records[key].receipts[1].response='fake',s=>s.records[key].receipts[1].check.chance=99,s=>s.records[key].receipts.push(s.records[key].receipts[1]),s=>delete s.records[key].attempts.permission,s=>s.definitions[bomb.id].content.nodes.refused.npc='altered',s=>s.checkSeed=NaN,s=>s.revision=.5]){const bad=structuredClone(valid);mutate(bad);assert.throws(()=>validateDialogueState(bad));}
});
test('author validation catches invalid destinations, checks, effects, IDs and code; cycles remain legal',()=>{
 for(const mutate of [d=>d.nodes.greeting.choices[0].to='missing',d=>d.nodes.greeting.choices[0].set={bombDisarmed:'yes'},d=>d.nodes.greeting.choices[0].script='alert(1)',d=>d.nodes.greeting.choices[2].check.minimum=1.5,d=>d.nodes.greeting.choices[2].check.skill='charisma',d=>d.nodes.greeting.choices[2].check.modifiers.push(d.nodes.greeting.choices[2].check.modifiers[0]),d=>d.nodes.greeting.choices[1].requires.archetype='Nice',d=>d.nodes.greeting.choices[2].rollText['50']='extra',d=>d.nodes.facts.choices[0].id='ask',d=>d.entry.reverse()]){const bad=structuredClone(bomb);mutate(bad);assert.throws(()=>validateDialogue(bad));}
 const d=structuredClone(bomb);d.nodes.unused={npc:'Optional line'};assert.equal(dialogueDiagnostics(d).errors.length,0);assert.deepEqual(dialogueDiagnostics(d).warnings,['Unreachable node unused.']);
 const map={dialogueDefinitions:{[bomb.id]:bomb}},before=structuredClone(map);mergeDialogueDefinitions(map,{dialogueDefinitions:{[bomb.id]:structuredClone(bomb)}});assert.deepEqual(map,before);const changed=structuredClone(bomb);changed.version++;assert.throws(()=>mergeDialogueDefinitions(map,{dialogueDefinitions:{[bomb.id]:changed}}),/Conflicting/);assert.deepEqual(map,before);
});

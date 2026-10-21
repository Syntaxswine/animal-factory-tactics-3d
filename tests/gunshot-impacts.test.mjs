import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {attack,previewAttack} from '../dist/tactics/core/engine.js';
import {edgeKey} from '../dist/tactics/core/maps.js';
import {captureEncounter,restoreEncounter,validateSavedState} from '../dist/tactics/encounter-save.js';
import {fatalHeadDecision,prepareBodyImpact,beginGunshotAction,stampGunshotEvent,validBodyImpact,supportSnapshot,validFatalHead} from '../dist/tactics/gunshot-impacts.js';
import {BattleCombat,shotPhase} from '../dist/tactics/battle-combat.js';
import {BattleShotEffects,visibleShotSegments,TRACE_VERTICES} from '../dist/tactics/battle-shot-effects.js';
import {shotPoint,shotVisible,impactFrame,canPresentBodyImpact} from '../dist/tactics/shot-coordinates.js';
import {GunshotImpactDebug} from '../dist/tactics/gunshot-impact-debug.js';
import {DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {MAP_LEVELS} from '../dist/tactics/map-layers.js';
import {resolveImpactCase,impactScene,IMPACT_CASES} from '../tools/gunshot-impact-cases.mjs';

test('fatal head threshold is inclusive, post-resistance, per projectile and floored by maximum HP',()=>{
 for(const [hp,max,threshold] of [[45,45,90],[20,45,40],[1,45,22.5],[0,100,50]])for(const delta of [-.001,0,.001]){
  const d=fatalHeadDecision({zone:'head',damage:threshold+delta,hpAtActionStart:hp,maxHp:max,hpAfter:0});
  assert.equal(d.threshold,threshold);assert.equal(d.fatalHead,delta>=0);
 }
 for(const input of [{zone:'torso'},{zone:'legs'},{zone:'weapon'},{eligible:false},{alreadyFatal:true},{damage:0},{hpAfter:1}])assert.equal(fatalHeadDecision({zone:'head',damage:113,hpAtActionStart:45,maxHp:45,hpAfter:0,...input}).fatalHead,false);
});

test('real torso, leg and head attacks record pre-clamp injury and preserve ordinary hit rules',()=>{
 for(const [zone,damage] of [['torso',27],['legs',23],['head',41]]){
  const {state,target,impacts}=resolveImpactCase({weapon:'pistol',zone,hp:200}),r=impacts[0];
  assert.ok(validBodyImpact(r));assert.equal(r.zone,zone);assert.equal(r.injuryDamage,damage);assert.equal(target.hp,200-damage);assert.equal(r.fatalHead,false);
  assert.equal(target.legWound,zone==='legs'?true:undefined);assert.equal(state.effect.sequence[0].trajectories[0].unitId,r.victimId);
 }
 const {impacts}=resolveImpactCase({weapon:'sniper',zone:'head',hp:45});
 assert.equal(impacts[0].injuryDamage,113);assert.equal(impacts[0].hpBefore,45);assert.equal(impacts[0].hpAfter,0);assert.equal(impacts[0].fatalHead,true);
});

test('fatal head damage commits death for mercs on both difficulties; ordinary lethal hits retain recovery',()=>{
 for(const difficulty of ['easy','standard']){
  const fatal=resolveImpactCase({weapon:'sniper',zone:'head',hp:30,maxHp:45,targetTeam:'squad',difficulty});
  assert.equal(fatal.target.casualty,'dead');assert.equal(fatal.target.recoveryTurns,0);assert.equal(fatal.target.bleedTurns,0);assert.ok(validFatalHead(fatal.target));
  const ordinary=resolveImpactCase({weapon:'rifle',zone:'head',hp:30,maxHp:45,targetTeam:'squad',difficulty});
  assert.equal(ordinary.target.casualty,difficulty==='easy'?'stable':'bleeding');assert.equal(ordinary.target.fatalHead,undefined);
 }
 const wounded=resolveImpactCase({weapon:'pistol',zone:'head',hp:20,maxHp:45});assert.equal(wounded.impacts[0].fatalHead,true);
});

test('resistance is applied before qualification and neither torso overkill nor a critical roll bypasses it',()=>{
 const resisted=resolveImpactCase({weapon:'sniper',zone:'head',hp:52,maxHp:52,resistance:100});
 assert.equal(resisted.impacts[0].injuryDamage,103);assert.equal(resisted.impacts[0].threshold,104);assert.equal(resisted.impacts[0].fatalHead,false);
 const torso=resolveImpactCase({weapon:'sniper',zone:'torso',hp:30});assert.equal(torso.target.hp,0);assert.equal(torso.impacts[0].fatalHead,false);
 const critical=resolveImpactCase({weapon:'rifle',zone:'head',hp:45,seed:1844});assert.equal(critical.state.effect.sequence[0].shotRoll.critical,'success');assert.equal(critical.impacts[0].injuryDamage,72);assert.equal(critical.impacts[0].fatalHead,false);
});

test('intercepted selected head shots use the actual victim and region, with separate reply identities',()=>{
 const {state,target,impacts}=resolveImpactCase({weapon:'sniper',zone:'head',range:8,incidental:true,hp:200});
 assert.equal(target.hp,200);assert.equal(impacts[0].victimId,1);assert.equal(impacts[0].zone,'torso');assert.equal(impacts[0].fatalHead,false);
 assert.ok(impacts.some(r=>r.shooterId===1));assert.equal(new Set(impacts.map(r=>r.attackId)).size,2);
 assert.ok(impacts.every(validBodyImpact));assert.equal(new Set(impacts.map(r=>r.id)).size,impacts.length);
 assert.equal(state.effect.sequence[0].target,target.id);
});

test('bursts and dual pistols lock starting HP for the action; later rounds cannot lower the threshold',()=>{
 for(const options of [{weapon:'assault',burst:true,hp:60,zone:'head',minImpacts:2},{weapon:'pistol',burst:true,dual:true,hp:60,zone:'head',minImpacts:2}]){
  const {impacts}=resolveImpactCase(options);
  assert.equal(new Set(impacts.map(r=>r.attackId)).size,1);assert.ok(impacts.every(r=>r.hpAtActionStart===60&&r.threshold===120&&!r.fatalHead));
  assert.ok(impacts[1].hpBefore<60);assert.notEqual(impacts[0].dischargeId,impacts[1].dischargeId);
 }
});

test('shotgun receipts preserve each pellet and never pool shell damage or spray already-dead victims',()=>{
 const full=resolveImpactCase({weapon:'shotgun',range:2,hp:500,minImpacts:6});
 assert.equal(full.impacts.length,6);assert.equal(new Set(full.impacts.map(r=>r.dischargeId)).size,1);assert.deepEqual(full.impacts.map(r=>r.projectileIndex),[0,1,2,3,4,5]);
 assert.ok(full.impacts.every(r=>validBodyImpact(r)&&r.hpAtActionStart===500));
 const lethal=resolveImpactCase({weapon:'shotgun',range:2,hp:45,zone:'head'});
 assert.ok(lethal.impacts.length<6);assert.ok(lethal.impacts.every(r=>!r.fatalHead&&r.hpAtActionStart===45));
});

test('misses, blocked rays, resisted injury, flames, blasts and tank ruptures do not fabricate body receipts',()=>{
 const {state,shooter,target}=impactScene();state.edges[edgeKey('e',12,10)]='wall';
 // A direct target may be rejected when the obstacle is known; a ground shot
 // beyond it is legal and resolves the same obstructing physical ray.
 const ground={...target,id:'ground',name:'Terrain',team:'terrain',ground:true};
 state.seen.add('16,10');
 assert.ok(attack(state,shooter,ground,false,false,'torso',false,'full'));assert.equal(state.effect.sequence.flatMap(e=>e.bodyImpacts||[]).length,0);
 const action=beginGunshotAction(state),event={shooter:shooter.id,trajectories:[{kind:'unit',unitId:target.id,zone:'head',x:target.x,y:target.y,h:1.5,origin:{x:10,y:10,h:1.3},direction:{x:1,y:0,h:0}}]};stampGunshotEvent(event,action,shooter,state.units);
 assert.equal(prepareBodyImpact(event,action,event.trajectories[0],target,0),null);
 for(const kind of ['flamethrower','grenade','rpg']){
  const c=impactScene({weapon:kind,range:2,hp:200});assert.ok(attack(c.state,c.shooter,c.target));assert.ok(c.state.effect.sequence.every(e=>!e.bodyImpacts?.length));assert.ok(c.state.units.every(u=>!u.fatalHead));
 }
 const tank=impactScene({seed:2});tank.target.weapon='flamethrower';tank.target.ammo.flamethrower=4;assert.ok(attack(tank.state,tank.shooter,tank.target));
 assert.ok(tank.state.effect.sequence[0].explosions.some(e=>e.kind==='tank'));assert.equal(tank.state.effect.sequence[0].bodyImpacts.length,0);
});

test('previewing does not allocate event identities; saves retain the outcome and sequence without replay',()=>{
 const c=impactScene({weapon:'sniper',hp:45}),before=structuredClone(c.state);previewAttack(c.state,c.shooter,c.target,false,'head');assert.deepEqual(c.state,before);
 const reloaded=restoreEncounter(captureEncounter(c.state));assert.ok(attack(c.state,c.shooter,c.target,false,false,'head',false,'full'));assert.ok(attack(reloaded,reloaded.units[0],reloaded.units[4],false,false,'head',false,'full'));
 assert.deepEqual(c.state.effect,reloaded.effect);assert.equal(c.state.seed,reloaded.seed);
 const saved=restoreEncounter(captureEncounter(c.state));assert.equal(saved.effect,null);assert.deepEqual(saved.units[4].fatalHead,c.target.fatalHead);assert.equal(saved.gunshotSequence,c.state.gunshotSequence);
 for(const mutate of [s=>s.gunshotSequence=-1,s=>s.gunshotSequence=1.2,s=>s.units[4].fatalHead.version=2,s=>s.units[4].fatalHead.impactId='wrong',s=>s.units[4].hp=10,s=>s.units[4].casualty='stable']){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>validateSavedState(bad));}
});

test('recorded supports and stances survive later movement, falls and all six rendered layers',()=>{
 for(let z=0;z<MAP_LEVELS;z++)for(const stance of ['standing','kneeling','prone']){
  const u={id:1,z,stance,cliffSupport:{level:z,height:.8}},support=supportSnapshot(u),contact={x:2,y:4,h:support.baseHeight+.4,support};
  const state={units:[u],visible:new Set([z?`2,4,${z}`:'2,4'])},rendered=shotPoint(contact,state);
  assert.ok(Math.abs(rendered.y-(z*DIMENSIONS.floorSpacing+.8+.4*DIMENSIONS.standing/1.8))<1e-8);assert.ok(shotVisible(state,rendered));
  u.z=0;delete u.cliffSupport;assert.deepEqual(shotPoint(contact,state),rendered);
 }
 const tower={id:1,z:4,towerPost:{kind:'wooden-spotlight-tower'}},support=supportSnapshot(tower),r={contact:{x:2,y:4,h:support.baseHeight+1},incoming:{x:1,y:0,h:0},origin:{x:0,y:4,h:support.baseHeight+1},originSupport:support,victim:{support}};
 const frame=impactFrame(r);assert.ok(Math.abs(frame.contact.y-(4*2.12+6.36+1.65/1.8))<1e-8);assert.deepEqual(frame.incoming.toArray(),[1,0,0]);
});

test('bullets enter sight from unseen shooters and leave/reenter fog without disclosing the source or bridging gaps',()=>{
 const shooter={id:4,team:'guard',weapon:'rifle',hp:45,x:0,y:0,z:0},victim={id:0,team:'squad',hp:100,x:8,y:0,z:0};
 const state={units:[shooter,victim],detected:new Set(),visible:new Set(['3,0','4,0','7,0','8,0']),difficulty:'easy'};
 const event={shooter:4,target:0,ax:0,ay:0,bx:8,by:0,attackId:'shot:1',dischargeId:'shot:1/d:0',weapon:'rifle',trajectories:[{kind:'unit',unitId:0,x:8,y:0,h:1.2,origin:{x:0,y:0,h:1.3}}]};
 const combat=new BattleCombat();combat.observe(state,0);state.effect={sequence:[event]};const before=structuredClone(state);combat.observe(state,1);assert.ok(combat.busy);assert.equal(combat.active.shooterVisible,false);
 combat.advance(400);const scene=new T.Scene(),effects=new BattleShotEffects(scene);try{
  effects.update(combat.active,state,null);assert.ok(effects.trace.visible);assert.equal(effects.flash.visible,false);
  const p=effects.trace.geometry.attributes.position;for(let i=0;i<effects.trace.geometry.drawRange.count;i++){assert.ok(shotVisible(state,new T.Vector3(p.getX(i),p.getY(i),p.getZ(i))));assert.ok(p.getX(i)>2.5);}
  assert.equal(effects.impact.visible,true);assert.equal(state.detected.has(4),false);assert.deepEqual(state,before);
 }finally{effects.dispose();}
 const segments=visibleShotSegments(state,[new T.Vector3(0,1,0),new T.Vector3(8,1,0)]);assert.ok(segments.some(p=>p.x>6.5));for(let i=0;i<segments.length;i+=2)assert.ok(segments[i].distanceTo(segments[i+1])<=.151);
});

test('hidden impacts do not reveal undiscovered guards or replay when sight changes; cloned events are deduplicated',()=>{
 const c=resolveImpactCase({weapon:'pistol'}),event=c.state.effect.sequence[0],receipt=c.impacts[0];
 const active={event,knownUnitIds:[],phase:shotPhase(5,false)};c.state.visible=new Set(['16,10']);c.state.detected.clear();
 assert.equal(canPresentBodyImpact(receipt,active,c.state),false);active.knownUnitIds=[4];assert.equal(canPresentBodyImpact(receipt,active,c.state),true);
 c.state.visible.clear();assert.equal(canPresentBodyImpact(receipt,active,c.state),false);
 c.state.units[0].team='guard';const combat=new BattleCombat();combat.observe(c.state,0);assert.equal(combat.busy,false);
 c.state.visible.add('16,10');c.state.effect=structuredClone(c.state.effect);combat.observe(c.state,100);assert.equal(combat.busy,false);
 combat.clear();combat.observe(c.state,200);assert.ok(combat.busy);combat.advance(1000);c.state.effect=structuredClone(c.state.effect);combat.observe(c.state,1100);assert.equal(combat.busy,false);
});

test('fatal state stays hidden until the matching discharge and observers cannot change combat RNG or outcomes',()=>{
 const c=resolveImpactCase({weapon:'rifle',zone:'head',hp:20,maxHp:45,targetTeam:'squad'}),combat=new BattleCombat();
 combat.observe(c.before,0);combat.observe(c.state,10);assert.equal(combat.display(c.target).hp,20);assert.equal(combat.display(c.target).fatalHead,undefined);
 combat.advance(400);assert.deepEqual(combat.display(c.target).fatalHead,c.target.fatalHead);
 const before=structuredClone(c.state),scene=new T.Scene(),effects=new BattleShotEffects(scene),debug=new GunshotImpactDebug(scene,{enabled:true,document:null});
 try{for(const reduced of [false,true]){const observer=new BattleCombat();observer.observe(c.before,0,reduced);observer.observe(c.state,1,reduced);observer.advance(401);if(observer.active){effects.update(observer.active,c.state,null);debug.update(observer.active,c.state);}observer.clear();debug.update(null,c.state);}assert.deepEqual(c.state,before);}finally{effects.dispose();debug.dispose();}
});

test('a fatal stray head hit on an already stabilized merc waits for its own discharge',()=>{
 const c=impactScene({weapon:'sniper',range:4}),u=c.state.units[1];
 c.shooter.stance='prone';u.x=11;u.y=10;u.hp=0;u.casualty='stable';
 const combat=new BattleCombat();combat.observe(c.state,0);
 const ground={x:14,y:10,z:0,id:'ground',name:'Terrain',team:'terrain',ground:true,hp:1,weapon:'hands'};
 assert.ok(attack(c.state,c.shooter,ground,false,false,'torso',false,'full'));
 const event=c.state.effect.sequence[0],r=event.bodyImpacts.find(r=>r.victimId===u.id);
 assert.ok(r?.fatalHead);assert.equal(r.hpBefore,0);assert.equal(r.casualtyBefore,'stable');assert.ok(!event.downed.includes(u.id));
 // Use rifle timing to observe the pre-discharge hold independently of the
 // sniper's immediate discharge presentation.
 event.weapon='rifle';combat.observe(c.state,10);
 assert.equal(combat.display(u).fatalHead,undefined);assert.equal(combat.display(u).casualty,'stable');
 combat.advance(400);assert.deepEqual(combat.display(u).fatalHead,u.fatalHead);assert.equal(combat.display(u).casualty,'dead');
});

test('trace and diagnostics resources stay bounded over repeated fire/reset and dispose cleanly',()=>{
 const c=resolveImpactCase(),scene=new T.Scene(),effects=new BattleShotEffects(scene),debug=new GunshotImpactDebug(scene,{enabled:true,document:null}),geometry=effects.trace.geometry;
 c.state.visible=new Set(['10,10','11,10','12,10','13,10','14,10','15,10','16,10']);const active={event:c.state.effect.sequence[0],phase:shotPhase(5,false),knownUnitIds:[4]};
 try{for(let i=0;i<50;i++){effects.hide();effects.update(active,c.state,null);debug.update(active,c.state);assert.equal(effects.trace.geometry,geometry);assert.equal(geometry.attributes.position.count,TRACE_VERTICES);debug.update(null,c.state);}assert.equal(scene.children.length,5);}finally{effects.dispose();debug.dispose();}assert.equal(scene.children.length,0);
});

test('the versioned artist fixture contains real, valid receipts for every promised case',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('../dist/tactics/fixtures/gunshot-impacts.v1.json',import.meta.url)));
 assert.equal(f.version,1);assert.match(f.source.revision,/^[a-f0-9]{40}$/);assert.ok(Object.values(f.source.sourceSha256).every(h=>/^[a-f0-9]{64}$/.test(h)));
 assert.deepEqual(f.cases.map(c=>c.id),IMPACT_CASES.map(c=>c[0]));
 for(const c of f.cases){const receipts=c.actions.flatMap(a=>a.bodyImpacts);assert.equal(receipts.length,c.impactCount);assert.ok(receipts.every(validBodyImpact),c.id);}
});

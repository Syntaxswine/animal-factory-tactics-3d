import test from 'node:test';
import assert from 'node:assert/strict';
import {MapGeometryCache,trackMapGeometry,invalidateMapGeometry} from '../dist/tactics/map-geometry-cache.js';
import {buildWorld,traceWorld} from '../dist/tactics/hybrid-world.js';
import {blankMap,openDoorBetween,setTerrain,parseMap} from '../dist/tactics/core/maps.js';
import {createGame,cutFence,attackGround,WEAPONS} from '../dist/tactics/core/engine.js';
import {createEditor,beginStroke,endStroke,applyBrush,undo,redo} from '../dist/tactics/core/editor-model.js';
import {damageStructure,mergeScenery} from '../dist/tactics/structure-health.js';
import {performInteraction} from '../dist/tactics/field-actions.js';
import {settleStructureCollapse} from '../dist/tactics/structure-collapse.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {detonateGrenade} from '../dist/tactics/grenade-blast.js';
import {detonateBarrels} from '../dist/tactics/fuel-blast.js';
import {destroyStrategicSite} from '../dist/tactics/strategic-site-rules.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import * as T from '../dist/tactics/vendor/three.module.js';

const scene=()=>({map:Array.from({length:24},()=>Array(24).fill('yard')),upper:[{},{}],edges:{},props:[],stairs:[],climbs:[],canopies:[],units:[],loot:[],queue:[]});
const cache=()=>new MapGeometryCache(buildWorld);
// Compare the actual spatial index as well as visible/collision boxes against a
// fresh construction, rather than asserting only that an invalidation ran.
function fresh(c,s,before){const after=c.get(s);if(before)assert.notEqual(after,before);assert.deepEqual(after,buildWorld(s));return after;}
function live(weapon='rifle'){
 const m=blankMap('Cache regression');m.starts=[{x:10,y:10,weapon},{x:4,y:4},{x:4,y:6},{x:4,y:8}];m.edges['e:12:10']='wall-concrete';
 const s=createGame(92,m,false,'easy',{statSystem:true});startEncounterClock(s);s.phase='player';s.engaged=true;s.units[0].ap=18;return s;
}
function countScans(s){let scans=0;Object.defineProperty(s.map,'toJSON',{configurable:true,value(){scans++;return this.map(row=>[...row]);}});return ()=>scans;}

test('live frames skip terrain scans across movement, turns, HP, RNG and fresh presentation wrappers',()=>{
 const s=live(),scans=countScans(s),c=cache(),first=c.get(s),warm=scans();assert.ok(warm>0);
 for(let i=0;i<40;i++){
  s.revision++;s.seed++;s.units[0].hp--;s.units[0].x+=.01;s.clock.minutes++;
  assert.equal(c.get({...s,terrain:s.map,units:[...s.units],props:[...s.props]}),first);
 }
 assert.equal(scans(),warm,'steady frames must not walk the 240 x 240 terrain');
 c.clear();assert.notEqual(c.get(s),first);assert.ok(scans()>warm);
});

test('opening a live door invalidates geometry without relying on the general game revision',()=>{
 const s=scene();s.edges['e:12:10']='door-wood-closed';trackMapGeometry(s);const c=cache(),before=c.get(s),ray=w=>traceWorld(w,[12,1,10],[13,1,10]);assert.ok(ray(before));
 assert.equal(openDoorBetween(s,{x:12,y:10,z:0},{x:13,y:10,z:0}),true);
 assert.equal(ray(fresh(c,s,before)),null);
 const after=c.get(s);assert.equal(openDoorBetween(s,{x:12,y:10,z:0},{x:13,y:10,z:0}),false);assert.equal(c.get(s),after);
});

test('cutting a live fence refreshes its visible bars',()=>{
 const s=live();s.edges['e:10:10']='fence-chainlink';s.units[0].slots.push('wireCutters');s.seen.add('10,10');const c=cache(),before=c.get(s);
 assert.ok(cutFence(s,s.units[0],'e:10:10'));assert.equal(s.edges['e:10:10'],'fence-cut');fresh(c,s,before);
});

test('picking and forcing locked doors invalidate the same obstruction as walking through a door',()=>{
 for(const kind of ['pick','force']){
  const s=live(),u=s.units[0];s.edges['e:10:10']='door-steel-closed';s.edgeLocks['e:10:10']=50;u.stats.strength=u.stats.dexterity=100;u.pack.push({type:'tool',kind:'lockpicks',count:1});s.interactionSeed=1;
  const c=cache(),before=c.get(s);assert.ok(performInteraction(s,u,kind,'e:10:10'));assert.equal(s.edgeLocks['e:10:10'],undefined);
  assert.equal(traceWorld(fresh(c,s,before),[10,1,10],[11,1,10]),null);
 }
});

test('terrain setters invalidate both ground and upper floors on a tracked map',()=>{
 const s=scene();s.terrain=s.map;trackMapGeometry(s);const c=cache();let before=c.get(s);
 for(const [x,y,z,kind]of [[5,5,0,'water'],[5,5,1,'ground-wood-planks'],[5,5,1,'void']]){assert.ok(setTerrain(s,x,y,z,kind));before=fresh(c,s,before);}
});

test('damaged walls retain geometry until destroyed; actual bullets then clear the cached obstruction',()=>{
 const s=live(),c=cache(),before=c.get(s),u=s.units[0];damageStructure(s,{edge:'e:12:10'},199);assert.equal(c.get(s),before);
 s.seen.add('18,10');assert.ok(attackGround(s,u,{x:18,y:10,z:0}));assert.equal(s.edges['e:12:10'],undefined);
 const after=fresh(c,s,before);assert.equal(traceWorld(after,[12,1,10],[13,1,10]),null);
});

test('collapsed floors remove their slab, unsupported cargo, ladders and upper edges',()=>{
 const s=scene();s.upper[0]['12,10']='ground-wood-planks';s.props=[{kind:'crate-wood',x:12,y:10,z:1}];s.stairs=[{kind:'ladder',x:12,y:10,z:0}];s.edges['e:12:10:1']='wall-concrete';
 trackMapGeometry(s);const c=cache(),before=c.get(s),receipt=damageStructure(s,{x:12,y:10,z:1},75);settleStructureCollapse(s,[receipt]);
 const after=fresh(c,s,before);assert.equal(s.props.length,0);assert.equal(s.stairs.length,0);assert.equal(s.edges['e:12:10:1'],undefined);assert.equal(traceWorld(after,[12,3,10],[12,1,10]),null);
});

test('destroying a decorative fourth-level canopy removes its generated slabs',()=>{
 const s=scene();s.canopies=[{kind:'roof-corrugated-sloped',x:12,y:10,z:3}];trackMapGeometry(s);const c=cache(),before=c.get(s);
 assert.ok(before.boxes.some(b=>b.source.z===3));damageStructure(s,{x:12,y:10,z:3},200);
 assert.equal(fresh(c,s,before).boxes.some(b=>b.source.z===3),false);
});

test('grenades, rockets and barrel chains refresh nonstructural scenery too',()=>{
 for(const type of ['grenade','rocket','barrel']){
  const s=scene();s.map[10][12]='crate';s.edges['s:12:10']='fence-chainlink';if(type==='barrel')s.props=[{kind:'barrel-explosive',x:12,y:10,z:0},{kind:'barrel-explosive',x:14,y:10,z:0}];
  trackMapGeometry(s);const c=cache(),before=c.get(s);
  if(type==='grenade')detonateGrenade(s,{x:12,y:10,z:0,h:.8});
  else if(type==='rocket')detonate(s,{x:12,y:10,z:0,h:.8},WEAPONS.rpg);
  else assert.equal(detonateBarrels(s,[s.props[0]],{damage(){},ignite(){},burn(){}}).length,2);
  fresh(c,s,before);
 }
});

test('flame destruction and triggered strategic-site wrecks rebuild the visible world',()=>{
 const s=live('flamethrower');s.edges['e:12:10']='door-wood-closed';s.seen.add('20,10');const c=cache(),before=c.get(s);
 assert.ok(attackGround(s,s.units[0],{x:20,y:10,z:0}));assert.equal(s.edges['e:12:10'],undefined);fresh(c,s,before);
 s.props=[{kind:'site-radio',x:15,y:15,z:0}];const site=c.get(s);assert.ok(destroyStrategicSite(s,s.props[0]));fresh(c,s,site);
});

test('pending barrel presentation changes are noticed even with the same live terrain and revision',()=>{
 const s=trackMapGeometry(scene()),c=cache(),before=c.get(s),barrel={kind:'barrel-explosive',x:12,y:10,z:0};
 const view=()=>({...s,terrain:s.map,props:[...s.props,barrel]}),pending=c.get(view());assert.notEqual(pending,before);assert.equal(c.get(view()),pending);
 assert.notEqual(c.get(s),pending);assert.deepEqual(c.get(s),before);
});

test('grenade scenery stays intact during flight, then switches to the destroyed map at impact',()=>{
 const s=scene();s.upper[0]['12,10']='ground-wood-planks';s.stairs=[{x:12,y:10,z:0,kind:'ladder'}];s.units=[{id:0,x:10,y:10,z:0,team:'squad',hp:50,weapon:'grenade'}];s.detected=new Set();s.visible=new Set(['10,10']);trackMapGeometry(s);
 const c=cache(),intact=c.get(s),combat=new BattleCombat();combat.observe(s,0);
 const receipt=damageStructure(s,{x:12,y:10,z:1},75),collapsed=settleStructureCollapse(s,[receipt]);mergeScenery(receipt.before,collapsed.before);
 s.effect={sequence:[{shooter:0,ax:10,ay:10,az:0,grenade:{release:1.92,scenery:receipt.before},trajectories:[{fuse:4,x:12,y:10,z:0,h:.05}],explosions:[{kind:'grenade',x:12,y:10,z:0,h:.05,radius:5}],falls:[]}]};combat.observe(s,10);
 const fx=new BattleGrenades(new T.Scene());
 try{
  const view=()=>{const p=fx.scenery(s,combat);return {...p,terrain:p.map,props:[...p.props]};};
  assert.deepEqual(c.get(view()),intact);assert.notDeepEqual(c.get(s),intact);assert.deepEqual(c.get(view()),intact);
  combat.advance(5940);assert.deepEqual(c.get(view()),buildWorld(s));assert.notDeepEqual(c.get(view()),intact);
 }finally{fx.dispose();}
});

test('untracked in-place edits include foliage, environment, canopies, access and breach data',()=>{
 const s=scene(),c=cache();let before=c.get(s);
 for(const edit of [
  ()=>s.map[5][5]='water',()=>s.upper[0]['8,8']='floor',()=>s.edges['e:5:5']='wall-concrete',
  ()=>s.stairs.push({x:8,y:8,z:0,kind:'ladder'}),()=>s.climbs.push({x:10,y:10,z:0,dx:1,dy:0}),
  ()=>s.canopies.push({kind:'roof-corrugated-sloped',x:14,y:14,z:3}),
  ()=>s.foliage={'6,6':[20,false]},()=>s.environment={field:{seed:42}},
  ()=>s.breaches={edges:{'e:4:5':'wall-concrete'},upper:[{},{}]},
  ()=>s.breaches.edges['e:4:6']='wall-brick'
 ]){edit();before=fresh(c,s,before);}
});

test('replacing a tracked geometry field is detected without a revision bump',()=>{
 const s=trackMapGeometry(scene()),c=cache(),before=c.get(s);s.edges={'e:10:10':'wall-brick'};fresh(c,s,before);
 const upper=c.get(s);s.upper=[{'10,10':'floor'},{}];fresh(c,s,upper);
});

test('explicit edits to a tracked environment invalidate foliage placement',()=>{
 const s=scene();s.map[6][6]='ground-biome-temperate';s.foliage={'6,6':[80,true]};trackMapGeometry(s);const c=cache(),before=c.get(s);
 s.foliage['6,6']=[0,false];invalidateMapGeometry(s);fresh(c,s,before);
});

test('editor strokes, undo, redo and exported/reimported maps never inherit a live cache',()=>{
 const e=createEditor(blankMap('Cache editor')),c=cache(),before=c.get(e.map);
 beginStroke(e);assert.equal(applyBrush(e,'wall',20,20,'e:20:20',{edgeKind:'wall-brick'}),'');assert.ok(endStroke(e));const painted=fresh(c,e.map,before);
 assert.ok(undo(e));assert.deepEqual(c.get(e.map),before);assert.ok(redo(e));assert.deepEqual(c.get(e.map),painted);
 const imported=parseMap(JSON.stringify(e.map));assert.deepEqual(c.get(imported),painted);
 imported.edges['e:20:20']='window-brick';fresh(c,imported,painted);
});

test('encounter saves contain no cache data, restore independently and regain the fast path',()=>{
 const s=live(),c=cache();c.get(s);damageStructure(s,{edge:'e:12:10'},200);const destroyed=fresh(c,s),record=captureEncounter(s,1234),restored=restoreEncounter(record);
 assert.deepEqual(captureEncounter(restored,1234),record);assert.notEqual(restored.map,s.map);const scans=countScans(restored),world=c.get(restored),warm=scans();assert.deepEqual(world,destroyed);assert.notEqual(world,destroyed);
 assert.equal(c.get({...restored,props:[...restored.props]}),world);assert.equal(scans(),warm);
 const pristine=live();assert.notDeepEqual(c.get(pristine),world);assert.deepEqual(c.get(restored),world);
});

test('campaign restores and staged transitions rebind independent geometry caches',async()=>{
 const {openingContent}=await import('../dist/tactics/campaign-opening.js'),{createCampaign,openCampaignSector,activeState}=await import('../dist/tactics/campaign-model.js'),{captureCampaign,restoreCampaign,checkpointTransition}=await import('../dist/tactics/campaign-save.js');
 const campaign=createCampaign(openingContent(),{id:'geometry-cache-campaign'}),s=openCampaignSector(campaign,70),c=cache();c.get(s);
 const edge=Object.keys(s.edges)[0];assert.ok(edge);damageStructure(s,{edge},200);const destroyed=fresh(c,s);
 const restored=restoreCampaign(captureCampaign(campaign,0)),loaded=activeState(restored),scans=countScans(loaded);assert.deepEqual(c.get(loaded),destroyed);const warm=scans();c.get({...loaded,props:[...loaded.props]});assert.equal(scans(),warm);
 // The transition clones before executing its command and binds the clone.
 const next=await checkpointTransition(restored,()=>{},async()=>{}),staged=activeState(next),stageScans=countScans(staged);assert.notEqual(staged.map,loaded.map);const world=c.get(staged),stageWarm=stageScans();assert.deepEqual(world,destroyed);assert.equal(c.get(staged),world);assert.equal(stageScans(),stageWarm);
});

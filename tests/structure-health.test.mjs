import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {structureInfo,damageStructure,validStructureHealth,mergeScenery} from '../dist/tactics/structure-health.js';
import {planStructureBlast,commitStructureDamage} from '../dist/tactics/structure-damage.js';
import {settleStructureCollapse} from '../dist/tactics/structure-collapse.js';
import {flameStructureDamage} from '../dist/tactics/structure-flame.js';
import {blankMap,terrainAt,passable,openDoorBetween} from '../dist/tactics/core/maps.js';
import {createGame,attackGround,WEAPONS} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {grenadeWorld,sweepGrenade,GRENADE_FLOOR} from '../dist/tactics/grenade-geometry.js';
import {grenadeBlastField} from '../dist/tactics/grenade-blast-field.js';
import {BattleGrenades} from '../dist/tactics/battle-grenades.js';
import {BattleCombat} from '../dist/tactics/battle-combat.js';
import {flameShape} from '../dist/tactics/flame-cone.js';
import {applyFuelBlast} from '../dist/tactics/fuel-blast.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {inspectBattleTile} from '../dist/tactics/battle-context-menu.js';

const scene=()=>({map:Array.from({length:32},()=>Array(32).fill('yard')),upper:[{},{}],props:[],edges:{},edgeLocks:{},stairs:[],climbs:[],units:[],loot:[],queue:[]});
function live(weapon='rifle'){
 const m=blankMap('Structure damage');m.starts=[{x:10,y:10,weapon},{x:4,y:4},{x:4,y:6},{x:4,y:8}];m.edges['e:12:10']='wall-concrete';
 const s=createGame(92,m,true,'easy',{statSystem:true}),u=s.units[0];s.phase='player';s.engaged=true;u.ap=18;startEncounterClock(s);return {s,u};
}
test('materials select 75/100/200 HP without modifying authored maps or allocating pristine records',()=>{
 const s=scene();for(const [kind,hp]of [['wall-wood-trellis',75],['door-wood-closed',75],['wall-corrugated',100],['window-corrugated',100],['wall-brick',200],['wall-concrete',200],['door-steel-closed',200]]){s.edges['e:12:10']=kind;assert.equal(structureInfo(s,{edge:'e:12:10'}).hp,hp,kind);}
 for(const [kind,hp]of [['ground-wood-planks',75],['bridge',75],['floor',100],['ground-tiles',100],['ground-concrete',200]]){s.map[10][12]=kind;assert.equal(structureInfo(s,{x:12,y:10}).hp,hp,kind);}
 for(const kind of ['yard','ground-grass','ground-dirt','ground-gravel','water','void']){s.map[10][12]=kind;assert.equal(structureInfo(s,{x:12,y:10}),null,kind);}
 s.upper[0]['12,10']='floor';s.props=[{kind:'cliff-ledge',cliffMask:15,x:12,y:10,z:0}];assert.equal(structureInfo(s,{x:12,y:10,z:1}),null);assert.equal(s.structureHealth,undefined);
});
test('wall HP accumulates, destroys only at zero, and removes the locked boundary',()=>{
 const s=scene(),target={edge:'e:12:10'};s.edges[target.edge]='door-wood-closed';s.edgeLocks[target.edge]=50;
 assert.equal(damageStructure(s,target,40).hp,35);assert.equal(s.edges[target.edge],'door-wood-closed');assert.equal(damageStructure(s,target,34).hp,1);
 const r=damageStructure(s,target,1);assert.ok(r.destroyed);assert.equal(s.edges[target.edge],undefined);assert.equal(s.edgeLocks[target.edge],undefined);assert.equal(damageStructure(s,target,50),null);assert.ok(validStructureHealth(s));
});
test('opening a damaged wood door never repairs it or changes its material HP',()=>{
 const s=scene(),target={edge:'e:12:10'};s.edges[target.edge]='door-wood-closed';damageStructure(s,target,30);
 assert.ok(openDoorBetween(s,{x:12,y:10},{x:13,y:10}));assert.equal(structureInfo(s,target).hp,45);assert.equal(structureInfo(s,target).maxHp,75);assert.ok(validStructureHealth(s));damageStructure(s,target,20);assert.equal(structureInfo(s,target).hp,25);
});
test('ground floors become rubble and upper floors become holes in both pathfinding and projectile geometry',()=>{
 const s=scene(),p={x:12,y:10,z:1};s.upper[0]['12,10']='ground-wood-planks';s.map[10][12]='ground-concrete';
 const ray=()=>traceProjectile(s,null,{x:12,y:10,h:5},{x:0,y:0,h:-1},10);
 assert.equal(ray().h,3);assert.ok(passable(s,p));damageStructure(s,p,74);assert.equal(ray().h,3);
 damageStructure(s,p,1);assert.equal(terrainAt(s,12,10,1),'void');assert.ok(!passable(s,p));assert.equal(ray().h,0);
 damageStructure(s,{x:12,y:10,z:0},200);assert.equal(s.map[10][12],'ground-gravel');assert.equal(structureInfo(s,{x:12,y:10,z:0}),null);
});
test('blast exposure charges one window HP pool despite separate sill and lintel geometry',()=>{
 const s=scene();s.edges['e:12:10']='window-concrete';const plans=planStructureBlast(s,{x:12,y:10,h:1},5,()=>30);assert.equal(plans.length,1);commitStructureDamage(s,plans);assert.equal(structureInfo(s,{edge:'e:12:10'}).hp,170);
});
test('grenades accumulate wall damage and keep people and scenery behind the intact wall shielded',()=>{
 const s=scene();s.edges['e:12:10']='wall-concrete';s.edges['e:13:10']='wall-corrugated';s.units=[{id:5,x:13,y:10,z:0,hp:50}];
 for(let i=0;i<2;i++){const r=detonate(s,{x:12,y:10,h:.4,z:0},WEAPONS.grenade);assert.equal(r.hits.length,0);assert.equal(structureInfo(s,{edge:'e:13:10'}).hp,100);if(!i)assert.equal(structureInfo(s,{edge:'e:12:10'}).hp,88);else assert.equal(s.edges['e:12:10'],undefined);}
 assert.ok(detonate(s,{x:12,y:10,h:.4,z:0},WEAPONS.grenade).hits.length);
});
test('RPGs and launchers use persistent HP instead of the old one-hit wall threshold',()=>{
 for(const weapon of ['launcher','rpg']){const s=scene();s.edges['e:12:10']='wall-concrete';const r=detonate(s,{x:12.2,y:10,h:.4,z:0},WEAPONS[weapon]);assert.ok(r.structures.some(p=>p.id==='edge:e:12:10'));if(weapon==='launcher')assert.ok(structureInfo(s,{edge:'e:12:10'}).hp>0);else assert.equal(s.edges['e:12:10'],undefined);}
});
test('fences outside the new wall HP tiers still retain their existing explosive destruction',()=>{
 for(const weapon of ['grenade','rpg']){const s=scene();s.edges['e:12:10']='fence-chainlink';const r=detonate(s,{x:12,y:10,z:0,h:.4},WEAPONS[weapon]);assert.equal(s.edges['e:12:10'],undefined);assert.ok(r.blast.destroyed>0);}
});
test('a roof module has one HP pool, removes all its slabs, and preserves a pre-blast receipt',()=>{
 const s=scene();s.props=[{kind:'roof-climbable-corrugated-flat',x:12,y:10,z:1}];for(let x=12;x<14;x++)for(let y=10;y<12;y++)s.upper[0][`${x},${y}`]='floor';
 damageStructure(s,{x:13,y:11,z:1},40);assert.equal(structureInfo(s,{x:12,y:10,z:1}).hp,60);
 const r=damageStructure(s,{x:12,y:10,z:1},60);assert.equal(r.before.tiles.length,4);assert.equal(r.before.props.length,1);assert.equal(s.props.length,0);assert.equal(Object.keys(s.upper[0]).length,0);assert.ok(validStructureHealth(s));
});
test('builder level-four roof HP removes its canopy and all collision slabs together',()=>{
 const s=scene();s.canopies=[{kind:'roof-flat-parapet',x:12,y:10,z:3}];assert.equal(structureInfo(s,{x:13,y:11,z:3}).hp,200);
 assert.ok(sweepGrenade(grenadeWorld(s),{x:12,y:10,h:8},{x:12,y:10,h:5},0));const r=damageStructure(s,{x:13,y:11,z:3},200);assert.equal(s.canopies.length,0);assert.equal(r.before.canopies.length,1);assert.equal(sweepGrenade(grenadeWorld(s),{x:12,y:10,h:8},{x:12,y:10,h:5},0),null);
});
test('floor collapse drops living people, casualties and their loot, clears orders, and removes floating scenery and links',()=>{
 const s=scene();s.upper[1]['12,10']='ground-wood-planks';s.upper[0]['12,10']='floor';s.units=[{id:1,x:12,y:10,z:2,hp:50,ap:9,overwatch:{}},{id:2,x:13,y:10,z:2,hp:0,casualty:'stable'}];s.upper[1]['13,10']='floor';s.loot=[{x:13,y:10,z:2,body:2,items:[]}];s.queue=[{unit:1}];s.stairs=[{x:12,y:10,z:1,kind:'ladder'}];s.climbs=[{x:11,y:10,z:1,dx:1,dy:0}];s.props=[{kind:'crate-wood',x:13,y:10,z:2}];
 const receipts=[damageStructure(s,{x:12,y:10,z:2},75),damageStructure(s,{x:13,y:10,z:2},100)],r=settleStructureCollapse(s,receipts);
 assert.equal(s.units[0].z,1);assert.equal(s.units[0].hp,50);assert.equal(s.units[0].ap,9);assert.equal(s.units[0].overwatch,null);assert.equal(s.units[1].z,0);assert.equal(s.loot[0].z,0);assert.equal(r.falls.length,2);assert.equal(s.queue.length,0);assert.equal(s.stairs.length,0);assert.equal(s.climbs.length,0);assert.equal(s.props.length,0);assert.equal(r.before.props.length,1);assert.equal(settleStructureCollapse(s,receipts).falls.length,0);
});
test('falling occupants do not overlap someone below or change actors standing on unrelated platforms',()=>{
 const s=scene();s.upper[0]['12,10']='floor';s.units=[{id:1,x:12,y:10,z:1,hp:20},{id:2,x:12,y:10,z:0,hp:20},{id:3,x:12,y:10,z:1,hp:20,towerPost:{}},{id:4,x:12,y:10,z:1,hp:20,cliffSupport:{level:0,height:2}}];const r=damageStructure(s,{x:12,y:10,z:1},100);settleStructureCollapse(s,[r]);assert.equal(s.units[0].z,0);assert.notEqual(s.units[0].x,12);assert.equal(s.units[2].z,1);assert.equal(s.units[3].z,1);
});
test('direct flame burns wood once per spray; metal and stone keep their HP',()=>{
 const s=scene(),a={x:10,y:10,z:0};s.edges['e:12:10']='door-wood-closed';s.edges['e:13:10']='wall-wood-trellis';const shape=flameShape(s,a,{x:20,y:10},WEAPONS.flamethrower);
 const r=flameStructureDamage(s,shape,180);assert.equal(r.destroyed,1);assert.equal(s.edges['e:12:10'],undefined);assert.equal(s.edges['e:13:10'],'wall-wood-trellis');
 s.edges={'e:12:10':'wall-concrete'};assert.equal(flameStructureDamage(s,shape,180).receipts.length,0);
});
test('tank/barrel fuel blasts damage exposed walls without passing through them',()=>{
 const s=scene();s.edges={'e:12:10':'wall-concrete','e:13:10':'wall-corrugated'};const r=applyFuelBlast(s,{x:12,y:10,z:0},{damage(){},ignite(){},burn(){}});assert.ok(r.structures.length);assert.ok(structureInfo(s,{edge:'e:12:10'}).hp<200);assert.equal(structureInfo(s,{edge:'e:13:10'}).hp,100);
});
test('burning down a wood door does not expose a sheltered barrel during that same spray',()=>{
 const {s,u}=live('flamethrower');s.edges['e:12:10']='door-wood-closed';s.props=[{kind:'barrel-explosive',x:14,y:10,z:0}];assert.ok(attackGround(s,u,{x:20,y:10,z:0}));assert.equal(s.edges['e:12:10'],undefined);assert.equal(s.props.length,1);assert.equal(s.effect.explosions.length,0);
});
test('actual firearm shots damage the struck wall, pay ordinary resources and stop there even on the breaking shot',()=>{
 const {s,u}=live(),ammo=u.ammo.rifle,ap=u.ap;damageStructure(s,{edge:'e:12:10'},199);assert.ok(attackGround(s,u,{x:18,y:10,z:0}));assert.equal(u.ammo.rifle,ammo-1);assert.equal(u.ap,ap-WEAPONS.rifle.cost);assert.equal(s.edges['e:12:10'],undefined);assert.equal(s.effect.trajectories[0].kind,'wall');assert.equal(s.effect.sequence[0].structures[0].hp,0);
});
test('actual ground fire can break an upper floor and settle a body before a save',()=>{
 const {s,u}=live();s.edges={};u.z=1;s.upper[0]['10,10']='floor';s.upper[0]['12,10']='ground-wood-planks';damageStructure(s,{x:12,y:10,z:1},74);const other=s.units[1];Object.assign(other,{x:12,y:10,z:1,hp:0,casualty:'dead'});s.seen.add('12,10,1');
 assert.ok(attackGround(s,u,{x:12,y:10,z:1}));assert.equal(terrainAt(s,12,10,1),'void');assert.equal(other.z,0);assert.ok(s.effect.sequence[0].falls.some(p=>p.id===other.id));assert.equal(restoreEncounter(captureEncounter(s)).units[1].z,0);
});
test('damaged walls and floors round-trip saves, legacy saves start pristine, corrupt HP references reject',()=>{
 const {s}=live();s.upper[0]['12,10']='ground-wood-planks';damageStructure(s,{edge:'e:12:10'},33);damageStructure(s,{x:12,y:10,z:1},15);const saved=captureEncounter(s),copy=restoreEncounter(saved);assert.equal(structureInfo(copy,{edge:'e:12:10'}).hp,167);assert.equal(structureInfo(copy,{x:12,y:10,z:1}).hp,60);
 for(const edit of [v=>v.structureHealth['edge:e:12:10'].hp=-1,v=>v.structureHealth['edge:e:12:10'].hp=201,v=>v.structureHealth['edge:e:12:10'].hp=2.5,v=>v.structureHealth['edge:e:12:10'].kind='fake',v=>v.structureHealth['tile:999,999,0']={kind:'floor',hp:10},v=>v.edges={}]){const bad=structuredClone(saved);edit(bad.state);assert.throws(()=>restoreEncounter(bad),/damaged/);}
 delete saved.state.structureHealth;assert.equal(structureInfo(restoreEncounter(saved),{edge:'e:12:10'}).hp,200);
 const door=structuredClone(saved);door.state.edges['e:12:10']='doorway-concrete-open';door.state.structureHealth={'edge:e:12:10':{kind:'door-fake',hp:10}};assert.throws(()=>restoreEncounter(door),/damaged/);
});
test('the context menu reports real remaining HP only for discovered tiles',()=>{
 const {s}=live();damageStructure(s,{edge:'e:12:10'},50);const p={x:12,y:10,z:0};s.seen.add('12,10');assert.ok(inspectBattleTile(s,p).objects.includes('Wall concrete 150/200 HP'));s.seen.delete('12,10');assert.deepEqual(inspectBattleTile(s,p).structures,[]);
});
test('campaign checkpoints preserve damaged structures and holes independently of the map template',async()=>{
 const {openingContent}=await import('../dist/tactics/campaign-opening.js'),{createCampaign,openCampaignSector,activeState}=await import('../dist/tactics/campaign-model.js'),{captureCampaign,restoreCampaign}=await import('../dist/tactics/campaign-save.js');
 const c=createCampaign(openingContent(),{id:'structure-health-regression'}),s=openCampaignSector(c,70),edge=Object.keys(s.edges).find(k=>structureInfo(s,{edge:k}));assert.ok(edge);damageStructure(s,{edge},10);const hp=structureInfo(s,{edge}).hp;
 s.upper[0]['50,50']='ground-wood-planks';damageStructure(s,{x:50,y:50,z:1},75);
 const restored=activeState(restoreCampaign(captureCampaign(c)));assert.equal(structureInfo(restored,{edge}).hp,hp);assert.equal(terrainAt(restored,50,50,1),'void');assert.equal(restored.definition.edges[edge],s.definition.edges[edge]);
});
test('grenade presentation retains the old floor, access links and actor height until the blast fires',()=>{
 const s=scene();s.upper[0]['12,10']='ground-wood-planks';s.stairs=[{x:12,y:10,z:0,kind:'ladder'}];s.units=[{id:0,x:10,y:10,z:0,team:'squad',hp:50,weapon:'grenade'},{id:1,x:12,y:10,z:1,team:'squad',hp:50}];s.detected=new Set();s.visible=new Set(['10,10','12,10,1']);
 const c=new BattleCombat();c.observe(s,0);const receipt=damageStructure(s,{x:12,y:10,z:1},75),collapsed=settleStructureCollapse(s,[receipt]);mergeScenery(receipt.before,collapsed.before);
 const event={shooter:0,ax:10,ay:10,az:0,grenade:{release:1.92,scenery:receipt.before},trajectories:[{fuse:4,x:12,y:10,z:0,h:.05}],explosions:[{kind:'grenade',x:12,y:10,z:0,h:.05,radius:5}],falls:collapsed.falls};s.effect={sequence:[event]};c.observe(s,10);assert.equal(c.display(s.units[1]).z,1);
 const fx=new BattleGrenades(new T.Scene());try{assert.equal(fx.scenery(s,c).upper[0]['12,10'],'ground-wood-planks');assert.equal(fx.scenery(s,c).stairs.length,1);c.advance(5940);assert.equal(c.display(s.units[1]).z,0);assert.equal(fx.scenery(s,c).upper[0]['12,10'],undefined);c.clear();assert.equal(c.display(s.units[1]).z,0);}finally{fx.dispose();}
});
test('the painted grenade blast stays under a roof destroyed by that same blast',()=>{
 const s=scene();s.upper[0]['12,10']='ground-wood-planks';const receipt=damageStructure(s,{x:12,y:10,z:1},75),field=grenadeBlastField(s,{event:{grenade:{scenery:receipt.before},trajectories:[{x:12,y:10,z:0,h:.05}],explosions:[{kind:'grenade',x:12,y:10,z:0,h:.05,radius:5}]}});assert.ok(Math.abs(field.ceiling-(GRENADE_FLOOR-.12))<.001);
});

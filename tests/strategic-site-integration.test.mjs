import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,validateMap,parseMap,passable,neighbors} from '../dist/tactics/core/maps.js';
import {PROPS} from '../dist/tactics/core/environment.js';
import {createGame,attack,previewAttack,WEAPONS,refresh,move,stepMovement,movementNeighbors,pathTo} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {detonate} from '../dist/tactics/core/explosives.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';
import {SITE_PROPS,siteData,sitePoint,siteRayHit,siteId,siteControlPoint,siteBlocked,siteMoveAllowed,siteSupportAt,destroyStrategicSite,intactSite} from '../dist/tactics/strategic-site-rules.js';
import {flameStrategicSites,blastStrategicSites,strategicTarget} from '../dist/tactics/strategic-site-damage.js';
import {createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
import {StrategicSiteScene} from '../dist/tactics/strategic-site-scene.js';
import {flameShape} from '../dist/tactics/flame-cone.js';
import {applyFuelBlast,detonateBarrels} from '../dist/tactics/fuel-blast.js';
import {interactionPreview,nearbyInteractions,performInteraction} from '../dist/tactics/field-actions.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {validateBlock,placeBlock} from '../dist/tactics/core/blocks.js';
import {buildWorld,toWorld} from '../dist/tactics/hybrid-world.js';

const kinds=Object.keys(SITE_PROPS);
function mapFor(kind='site-radio',rotated=false){const map=blankMap('Strategic sites');map.props=[{kind,x:24,y:24,z:0,rotated}];return map;}
function fixture(kind='site-radio',weapon='flamethrower'){
 const map=mapFor(kind);map.starts[0]={x:18,y:29};
 const s=createGame(42,map,true,'easy',{statSystem:true}),u=s.units[0];startEncounterClock(s);u.weapon=weapon;u.ammo[weapon]=WEAPONS[weapon].mag;u.ap=30;u.heading=0;s.phase='player';s.rules.awareness=false;
 for(let y=10;y<45;y++)for(let x=10;x<45;x++)s.seen.add(`${x},${y}`);
 return {s,u,p:s.props[0]};
}
test('all six forms place, rotate, undo, save and travel through reusable blocks',()=>{
 for(const kind of kinds){const d=new EditingDocument().open(JSON.stringify(blankMap('Site editor'))),c={tool:'prop',start:{x:8,y:8,z:0},options:{propKind:kind,sabotage:true}};
  assert.deepEqual([PROPS[kind].w,PROPS[kind].h],[8,8]);assert.equal(d.apply(c).ok,true);assert.equal(d.map.props[0].sabotage,true);
  const selected=d.inspect(9,9,0,{mode:'prop'});d.siteSabotage(selected,false);assert.equal(d.map.props[0].sabotage,false);assert.ok(d.undo());assert.equal(d.map.props[0].sabotage,true);assert.ok(d.redo());
  assert.equal(d.rotate(d.inspect(9,9,0,{mode:'prop'})).ok,true);assert.equal(parseMap(d.export()).props[0].rotated,true);
  const block=validateBlock(d.capture(0,0)),placed=placeBlock(blankMap('Placed'),block,1,1);assert.equal(placed.props[0].kind,kind);assert.equal(placed.props[0].x,32);assert.equal(placed.props[0].sabotage,false);
  assert.equal(buildWorld(d.map).diagnostics.some(p=>p.kind===kind),false);
 }
});
test('sites reject unsupported, overlapping, upper-floor and overhead geometry',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap('Site restrictions'))),c={tool:'prop',start:{x:8,y:8,z:0},options:{propKind:'site-radio'}};
 assert.ok(d.apply(c).ok);assert.equal(d.apply({...c,options:{propKind:'crate-wood'}}).ok,false);
 for(const mutate of [m=>m.props[0].z=1,m=>m.upper[0]['25,25']='floor',m=>m.props[0].sabotage='execute code']){const m=mapFor();mutate(m);assert.ok(validateMap(m,{connectivity:false}).length);}
 assert.equal(d.preview({...c,start:{x:237,y:237,z:0}}).ok,false);
});
test('placement footprint is distinct from baked walkable cells, links, and boundary entries',()=>{
 for(const kind of kinds)for(const rotated of [false,true]){
  const m=mapFor(kind,rotated),p=m.props[0],d=siteData(p);let clear=0,blocked=0;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const q=sitePoint(p,[x,y]);if(d.clearance.rows[y][x]==='.'){assert.ok(passable(m,q));clear++;}else {assert.equal(passable(m,q),false);blocked++;}}
  assert.ok(clear>5&&blocked>5);
  for(const [x,y,u,v]of d.clearance.links){const a=sitePoint(p,[x,y]),b=sitePoint(p,[u,v]);assert.ok(neighbors(m,a).some(q=>q.x===b.x&&q.y===b.y),kind+' link');}
  for(const {cell:[x,y],edge}of d.clearance.entries){const a=sitePoint(p,[x,y]),delta={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]}[edge],b=sitePoint(p,[x+delta[0],y+delta[1]]);assert.ok(siteMoveAllowed(m,a,b));assert.ok(siteMoveAllowed(m,b,a));}
  const a=sitePoint(p,[3,0]),b=sitePoint(p,[4,1]);assert.equal(siteMoveAllowed(m,a,b),false,'no unchecked diagonal sweeps');
 }
});
test('baked projectile triangles match rendered surfaces in both orientations for all six models',()=>{
 const atlas=new T.Texture(),library=createStrategicSiteLibrary(atlas);let seed=74,hits=0,gaps=0;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try{for(const kind of kinds)for(const rotated of [false,true]){
  const p={kind,x:24,y:24,z:0,rotated},rule=SITE_PROPS[kind],{root}=library.build(rule.strategicSite,{state:rule.state});root.position.set(27.5,0,27.5);root.rotation.y=rotated?-Math.PI/2:0;root.updateMatrixWorld(true);
  for(let n=0;n<100;n++){
   const origin={x:20+rand()*16,y:20+rand()*16,h:.3+rand()*10},goal={x:24+rand()*7,y:24+rand()*7,h:.3+rand()*4},v={x:goal.x-origin.x,y:goal.y-origin.y,h:goal.h-origin.h},len=Math.hypot(v.x,v.y,v.h),d={x:v.x/len,y:v.y/len,h:v.h/len};
   const ray=new T.Raycaster(new T.Vector3(origin.x,origin.h,origin.y),new T.Vector3(d.x,d.h,d.y),1e-7,30),a=ray.intersectObject(root,true)[0],b=siteRayHit([p],origin,d,30);
   assert.equal(!!b,!!a,kind+' collision parity');if(a){assert.ok(Math.abs(a.distance-b.distance)<.001,kind+' collision distance');hits++;}else gaps++;
  }
 }}finally{library.dispose();atlas.dispose();}
 assert.ok(hits>100&&gaps>100);
});
test('hut walls stop shots and terrain sight while open paths remain transparent',()=>{
 const m=mapFor(),s={...m,map:m.terrain,units:[]},p=s.props[0];
 const shot=traceProjectile(s,null,{x:20,y:29,h:1.3},{x:1,y:0,h:0},20);assert.equal(shot.propId,siteId(p));
 assert.equal(traceProjectile(s,null,{x:20,y:24,h:1.3},{x:1,y:0,h:0},16).kind,'range');
 const observer={x:20,y:29,z:0,heading:0,cone:360};assert.equal(terrainVisibility(s,[observer]).has('27,29'),false);
 const clear={...s,props:[]};assert.equal(terrainVisibility(clear,[observer]).has('27,29'),true);
});
test('characters walk onto the real slab height and return to ground height on exit',()=>{
 const {s,u,p}=fixture();Object.assign(u,{x:24,y:23});s.phase='explore';refresh(s);assert.equal(siteSupportAt(s,u),null);
 assert.ok(move(s,u,24,24));assert.ok(stepMovement(s));assert.equal(u.cliffSupport.height,.24);assert.equal(toWorld(u)[1],.24);
 s.queue=[];assert.ok(move(s,u,24,23));assert.ok(stepMovement(s));assert.equal(u.cliffSupport,undefined);
});
test('each intact site has a visible flame contact and a persistent, idempotent wreck',()=>{
 for(const kind of ['site-radio','site-radar','site-sam']){const {s,u,p}=fixture(kind);const point={...strategicTarget(p),ground:true};if(kind==='site-sam'){u.x=20;u.y=30;}
  const shape=flameShape(s,u,point,WEAPONS.flamethrower),r=flameStrategicSites(s,shape);assert.equal(r.length,1,kind);assert.equal(s.props[0].kind,kind+'-destroyed');assert.equal(s.props.length,1);assert.equal(flameStrategicSites(s,shape).length,0);assert.equal(destroyStrategicSite(s,p),null);
 }
});
test('the live flamethrower attack charges once and replaces the target without a character hit',()=>{
 const {s,u,p}=fixture(),ammo=u.ammo.flamethrower,ap=u.ap,target=strategicTarget(p);assert.equal(previewAttack(s,u,target).ok,true);assert.ok(attack(s,u,target));assert.equal(s.props[0].kind,'site-radio-destroyed');assert.equal(u.ammo.flamethrower,ammo-1);assert.equal(u.ap,ap-WEAPONS.flamethrower.cost);assert.equal(attack(s,u,target),false);
});
test('grenades, launchers and rockets use the same persistent destruction path',()=>{
 for(const kind of ['site-radio','site-radar','site-sam'])for(const weapon of ['grenade','launcher','rpg']){
  const m=mapFor(kind),s={...m,map:m.terrain,units:[],log:[]},p=s.props[0];const end=kind==='site-sam'?sitePoint(p,[3,3,1]):sitePoint(p,[0,5,1]);
  const result=detonate(s,{...end,propId:siteId(p)},WEAPONS[weapon]);assert.equal(s.props[0].kind,kind+'-destroyed');assert.equal(result.sites.length,1);assert.ok(result.blast.destroyed>=1);
 }
 const {s,u,p}=fixture('site-radio','rpg'),ammo=u.ammo.rpg;assert.ok(attack(s,u,strategicTarget(p)));assert.equal(s.props[0].kind,'site-radio-destroyed');assert.equal(u.ammo.rpg,ammo-1);
});
test('walls shield sites from fire and blasts; reserved empty space is not equipment',()=>{
 const {s,u,p}=fixture();for(let y=20;y<37;y++)s.edges[`e:22:${y}`]='wall-concrete';
 assert.equal(flameStrategicSites(s,flameShape(s,u,strategicTarget(p),WEAPONS.flamethrower)).length,0);
 assert.equal(blastStrategicSites(s,{x:21,y:29,h:1},5).length,0);
 assert.equal(intactSite(s.props[0]),true);assert.equal(blastStrategicSites(s,{x:27,y:24,h:.24,propId:siteId(p)},.1).length,0);
});
test('ordinary firearms cannot directly destroy a strategic site or spend AP on that action',()=>{
 const {s,u,p}=fixture('site-radio','rifle'),before=[u.ap,u.ammo.rifle];assert.match(previewAttack(s,u,strategicTarget(p)).reason,/flamethrower or explosive/);assert.equal(attack(s,u,strategicTarget(p)),false);assert.deepEqual([u.ap,u.ammo.rifle],before);assert.equal(intactSite(s.props[0]),true);assert.equal(destroyStrategicSite(s,p,{cause:'bullet'}),null);
});
test('fuel-tank blasts and chained explosive barrels also leave wrecks',()=>{
 const hooks={damage:()=>{},ignite:()=>{},burn:()=>{}};
 for(const barrel of [false,true]){const m=mapFor(),s={...m,map:m.terrain,units:[],log:[]};
  if(barrel){const b={kind:'barrel-explosive',x:22,y:29,z:0};s.props.push(b);assert.equal(detonateBarrels(s,[b],hooks).length,1);}else applyFuelBlast(s,{x:22,y:29,z:0},hooks);
  assert.equal(s.props.length,1);assert.equal(s.props[0].kind,'site-radio-destroyed');
 }
});
test('sabotage is opt-in, nearby, charged once, and uses the same wreck in all three structures',()=>{
 for(const kind of ['site-radio','site-radar','site-sam']){const {s,u,p}=fixture(kind),q=siteControlPoint(p);
  let approach=null;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a={x:q.x+dx,y:q.y+dy,z:0};if(passable(s,a))approach=a;}assert.ok(approach,kind);
  Object.assign(u,approach);refresh(s);s.phase='player';u.ap=30;
  assert.equal(interactionPreview(s,u,'sabotage',p).ok,false);p.sabotage=true;assert.equal(nearbyInteractions(s,u).filter(e=>e.kind==='sabotage').length,1);
  u.ap=5;assert.equal(performInteraction(s,u,'sabotage',p),false);u.ap=30;const stamina=u.stamina;
  assert.equal(performInteraction(s,u,'sabotage',p),true);assert.equal(u.ap,24);assert.equal(u.stamina,stamina-3);assert.equal(s.props[0].kind,kind+'-destroyed');assert.equal(performInteraction(s,u,'sabotage',p),false);
 }
 const {s,u,p}=fixture();p.sabotage=true;Object.assign(u,{x:30,y:24});s.phase='explore';refresh(s);const minutes=s.clock.minutes;assert.ok(performInteraction(s,u,'sabotage',p));assert.equal(s.clock.minutes,minutes+1);
});
test('loading an intact or destroyed site preserves its state and validates sabotage settings',()=>{
 const {s,p}=fixture();p.sabotage=true;assert.equal(restoreEncounter(captureEncounter(s)).props[0].sabotage,true);
 destroyStrategicSite(s,p);const loaded=restoreEncounter(captureEncounter(s));assert.equal(loaded.props[0].kind,'site-radio-destroyed');assert.equal(loaded.effect,null);assert.equal(destroyStrategicSite(loaded,p),null);
 loaded.props[0].sabotage='eval';assert.throws(()=>captureEncounter(loaded),/damaged|incomplete/);
});
test('collapse preserves units, AP and map anchors and permits egress from fallen debris',()=>{
 const {s,u,p}=fixture(),after={...p,kind:p.kind+'-destroyed'},d=siteData(p);let candidate;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){const a={x:p.x+x,y:p.y+y,z:0};if(d.clearance.rows[y][x]==='.'&&siteBlocked(after,a)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>!siteBlocked(after,{...a,x:a.x+dx,y:a.y+dy})))candidate=a;}
 assert.ok(candidate);Object.assign(u,candidate);refresh(s);const before={x:u.x,y:u.y,hp:u.hp,ap:u.ap};destroyStrategicSite(s,p);assert.deepEqual({x:u.x,y:u.y,hp:u.hp,ap:u.ap},before);assert.ok(movementNeighbors(s,u).length>0);assert.equal(s.props[0].x,p.x);assert.equal(s.props[0].y,p.y);
});
test('survivors deep in new wreckage have an AP-costed exit; other units cannot enter it',()=>{
 for(const kind of ['site-radio','site-radar','site-sam']){const {s,u,p}=fixture(kind),d=siteData(p);destroyStrategicSite(s,p);const wreck=s.props[0];
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const q=sitePoint(p,[x,y]);if(d.clearance.rows[y][x]!=='.'||!siteBlocked(wreck,q))continue;Object.assign(u,{x:q.x,y:q.y,z:0});
   assert.equal(passable(s,q),false);const route=pathTo(s,u,24,23);assert.ok(route?.length,kind+' egress '+x+','+y);assert.ok(route.every(step=>step.cost>0));
   const other=s.units[1];assert.equal(pathTo(s,other,q.x,q.y),null);
  }
 }
});
test('editor and game share model scale, fog visibility, wreck switching and disposal',async()=>{
 const scene=new T.Scene(),sites=new StrategicSiteScene(scene,{loadAsync:async()=>new T.Texture()}),m=mapFor();
 try{sites.rebuild({...m,difficulty:'easy'});await sites.ready;sites.rebuild({...m,difficulty:'easy'});assert.equal(sites.items.size,1);let root=[...sites.items.values()][0].root;assert.deepEqual(root.position.toArray(),[27.5,0,27.5]);
  sites.rebuild({...m,seen:new Set()});assert.equal(sites.items.size,0);sites.rebuild({...m,seen:new Set(['24,24'])});assert.equal(sites.items.size,1);destroyStrategicSite(m,m.props[0]);sites.rebuild({...m,difficulty:'easy'});root=[...sites.items.values()][0].root;assert.equal(root.userData.state,'destroyed');assert.equal(root.userData.slabHeight,.24);
 }finally{sites.dispose();}assert.equal(scene.children.length,0);
});

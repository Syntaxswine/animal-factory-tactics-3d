import {blankMap,setTerrain} from '../dist/tactics/core/maps.js';
import {createGame,attack,equip} from '../dist/tactics/core/engine.js';
import {receive} from '../dist/tactics/core/inventory.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {BASE_STATS} from '../dist/tactics/character-stats.js';

// Controlled encounters, resolved by the real attack command. No synthetic
// receipts, forced hit outcomes, weapon damage changes or extra combat rolls.
export function impactScene({seed=42,weapon='pistol',hp=200,maxHp=hp,range=6,z=0,incidental=false,difficulty='easy',targetTeam='guard'}={}){
 const map=blankMap('Gunshot impact contract');
 map.starts=[{x:10,y:10,z,weapon},{x:incidental?13:10,y:incidental?10:13,z},{x:10,y:15,z},{x:12,y:15,z}];
 map.guards=[{x:10+range,y:10,z,species:'pig-foreman',weapon:'pistol'}];
 map.exits=[{x:12,y:13,z}];
 if(z)for(let y=9;y<=16;y++)for(let x=9;x<=11+range;x++)setTerrain(map,x,y,z,'floor');
 const state=createGame(seed,map,false,difficulty),shooter=state.units[0],target=state.units[4];
 state.rules.awareness=false;state.phase='player';state.engaged=true;shooter.ap=100;shooter.accuracy=100;shooter.heading=0;
 state.seen.add(z?`${target.x},${target.y},${z}`:`${target.x},${target.y}`);
 target.hp=hp;target.maxHp=maxHp;if(targetTeam==='squad'){target.team='squad';shooter.team='guard';state.selected=1;state.phase='enemy';}
 startEncounterClock(state);return {state,shooter,target};
}
export function resolveImpactCase(options={}){
 for(let seed=options.seed??1;seed<(options.seed??1)+200;seed++){
  const scene=impactScene({...options,seed}),{state,shooter,target}=scene;
  if(options.dual){receive(shooter,{type:'weapon',kind:'pistol',rounds:8,condition:100});equip(state,shooter,'pistol-offhand');equip(state,shooter,'pistol');shooter.ap=100;}
  if(options.resistance)target.stats={...BASE_STATS,endurance:options.resistance};
  const before=structuredClone(state);
  if(!attack(state,shooter,target,!!options.burst,options.targetTeam==='squad',options.zone||'torso',false,'full'))throw Error('Fixture attack was rejected');
  const impacts=state.effect.sequence.flatMap(e=>e.bodyImpacts||[]);
  if(impacts.length>=(options.minImpacts||1)&&(!options.fatal||impacts.some(r=>r.fatalHead)))return {...scene,before,impacts};
 }
 throw Error('Could not resolve fixture case');
}
export const IMPACT_CASES=[
 ['torso',{weapon:'pistol',hp:200}],
 ['legs',{weapon:'pistol',zone:'legs',hp:200}],
 ['nonfatal-head',{weapon:'pistol',zone:'head',hp:200}],
 ['ordinary-lethal-head',{weapon:'rifle',zone:'head',hp:45}],
 ['fatal-head',{weapon:'sniper',zone:'head',hp:45,fatal:true}],
 ['wounded-fatal-head',{weapon:'pistol',zone:'head',hp:20,maxHp:45,fatal:true}],
 ['incidental-victim',{weapon:'sniper',zone:'head',range:8,incidental:true,hp:200}],
 ['burst',{weapon:'assault',burst:true,hp:500,minImpacts:3}],
 ['shotgun',{weapon:'shotgun',hp:500,range:2,minImpacts:6}],
 ['dual-pistols',{weapon:'pistol',dual:true,burst:true,hp:500,minImpacts:2}],
 ['layer-six',{weapon:'pistol',z:5,hp:200}]
];

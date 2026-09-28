import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,attack,previewAttack,reload,WEAPONS} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {weaponJams,heldWeaponItem} from '../dist/tactics/loot-policy.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
function fixture(){const map=blankMap();map.starts[0]={x:10,y:10};map.guards=[{x:14,y:10,species:'pig-foreman',weapon:'pistol'}];const s=createGame(42,map,true,'easy'),a=s.units[0],b=s.units[4];a.heading=0;a.ap=100;a.accuracy=100;b.hp=10000;s.phase='player';heldWeaponItem(a).condition=9;startEncounterClock(s);return {s,a,b};}
test('strictly below ten percent rolls 20 percent per round; healthy and non-firearm weapons do not roll',()=>{
 const {s,a}=fixture();heldWeaponItem(a).condition=10;s.jamSeed=2000;assert.equal(weaponJams(s,a,a.weapon,WEAPONS[a.weapon]),false);assert.equal(s.jamSeed,2000);
 heldWeaponItem(a).condition=9;let jams=0;for(let i=0;i<10000;i++){delete heldWeaponItem(a).jammed;if(weaponJams(s,a,a.weapon,WEAPONS[a.weapon]))jams++;}assert.ok(Math.abs(jams/10000-.2)<.02);
 const seed=s.jamSeed;delete heldWeaponItem(a).jammed;for(const kind of ['hands','grenade','rpg','flamethrower'])assert.equal(weaponJams(s,a,a.weapon,WEAPONS[kind]),false);assert.equal(s.jamSeed,seed);
});
test('first-round jam spends firing AP, no ammo or shot effect, and clears for 3 AP without ammo',()=>{
 const {s,a,b}=fixture();s.jamSeed=2000;const before=a.ammo[a.weapon],cost=previewAttack(s,a,b).cost;assert.ok(attack(s,a,b));assert.equal(a.ap,100-cost);assert.equal(a.ammo[a.weapon],before);assert.equal(heldWeaponItem(a).jammed,true);assert.equal(s.effect,null);assert.match(previewAttack(s,a,b).reason,/jammed/);
 a.pack=a.pack.filter(i=>i.type!=='ammo');a.ap=2;assert.equal(reload(s,a),false);a.ap=3;assert.ok(reload(s,a));assert.equal(a.ap,0);assert.equal(heldWeaponItem(a).jammed,undefined);assert.equal(a.ammo[a.weapon],before);
});
test('a burst stops when its second round jams and preserves jam through save/load',()=>{
 const {s,a,b}=fixture();let seed=0;
 for(;seed<10000;seed++){let n=(Math.imul(seed,1664525)+1013904223)>>>0;const first=n/4294967296;n=(Math.imul(n,1664525)+1013904223)>>>0;if(first>=.2&&n/4294967296<.2)break;}
 s.jamSeed=seed;const before=a.ammo[a.weapon];assert.ok(attack(s,a,b,true));assert.equal(a.ammo[a.weapon],before-1);assert.equal(s.effect.sequence.length,1);assert.equal(heldWeaponItem(a).jammed,true);
 const restored=restoreEncounter(captureEncounter(s));assert.equal(heldWeaponItem(restored.units[0]).jammed,true);assert.equal(restored.jamSeed,s.jamSeed);assert.ok(reload(restored,restored.units[0]));
});
test('enemy reload clears jams even with a full magazine and no reserve ammunition',()=>{
 const {s,b}=fixture();s.phase='enemy';b.ap=3;heldWeaponItem(b).jammed=true;b.pack=b.pack.filter(i=>i.type!=='ammo');assert.ok(reload(s,b,true));assert.equal(heldWeaponItem(b).jammed,undefined);assert.equal(b.ap,0);
});

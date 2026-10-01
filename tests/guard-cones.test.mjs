import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../dist/tactics/core/engine.js';
import {blankMap} from '../dist/tactics/core/maps.js';
import {guardCone,visibleConeGuards} from '../dist/tactics/guard-cones.js';
function fixture(){const m=blankMap();m.guards=[{x:10,y:10,z:0,species:'pig-foreman',weapon:'pistol',heading:0}];const s=createGame(1,m);const u=s.units[4];u.cone=90;u.heading=0;return {s,u};}
test('guard cone follows facing and stops at walls without changing state',()=>{const {s,u}=fixture();const before=structuredClone(s),open=guardCone(s,u);assert.deepEqual(s,before);assert.ok(open.slice(1).every(p=>p.x>=u.x));for(let y=0;y<100;y++)s.edges['e:12:'+y]='wall';const blocked=guardCone(s,u);assert.ok(blocked.slice(1).every(p=>p.x<=13));u.heading=180;assert.ok(guardCone(s,u).slice(1).every(p=>p.x<=u.x));});
test('cones never reveal hidden, dead or other-floor guards',()=>{const {s,u}=fixture();s.detected=new Set();assert.deepEqual(visibleConeGuards(s,0),[]);s.detected.add(u.id);assert.deepEqual(visibleConeGuards(s,0),[u]);assert.deepEqual(visibleConeGuards(s,1),[]);u.hp=0;assert.deepEqual(visibleConeGuards(s,0),[]);});

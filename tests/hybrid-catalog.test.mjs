import test from 'node:test';import assert from 'node:assert/strict';
import {PROPS} from '../dist/tactics/environment.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {environmentGeometries} from '../dist/tactics/environment-geometry.js';
import {propParts} from '../dist/tactics/hybrid-props.js';
import {blankMap} from '../dist/tactics/maps.js';
import {buildWorld,traceWorld,DIMENSIONS} from '../dist/tactics/hybrid-world.js';
import {createWorld,currentMap,travel} from '../dist/tactics/world.js';
import {squad,guards,refresh} from '../dist/tactics/engine.js';
test('catalog silhouettes are finite, distinguish open containers and retain structure openings',()=>{
 for(const [kind,rule]of Object.entries(PROPS)){if(rule.groundLayer)continue;let parts;if(kind.startsWith('ramp-')||kind.startsWith('rampbank-')){const map={terrain:[['yard']],props:[{kind,x:0,y:0,z:0}],edges:{}},world=buildWorld(map);parts=environmentVisuals(world,map).filter(p=>p.kind==='ramp'||p.kind==='ramp-bank');assert.equal(parts.length,kind.startsWith('ramp-')?2:1,kind);const geometries=environmentGeometries();try{for(const p of parts)assert(geometries[p.shape],kind);}finally{Object.values(geometries).forEach(g=>g.dispose());}assert(world.boxes.filter(b=>b.source.prop).every(b=>!b.blocksShot&&!b.blocksSight));}else parts=propParts(kind,rule.w,rule.h,rule.tall?2:.8);assert.ok(parts.length,kind);for(const p of parts){assert.ok(p.center.every(Number.isFinite),kind);assert.ok(p.size.every(n=>Number.isFinite(n)&&n>0),kind);}}
 assert.ok(propParts('wooden-crate-open',1,1,.8).some(p=>p.name==='lid'));
 assert.equal(propParts('wooden-crate-closed',1,1,.8).some(p=>p.name==='lid'),false);
 const m=blankMap();m.props=[{x:8,y:8,z:0,kind:'table-steel'}];const w=buildWorld(m);
 assert.equal(traceWorld(w,[7,.3,8],[9,.3,8]),null,'space between table legs is open');
 assert.ok(traceWorld(w,[7,.75,8],[9,.75,8]),'table top stops a shot');
 m.stairs=[{x:5,y:5,z:0,kind:'ladder'}];m.upper[0]['5,5']='floor';const ladder=buildWorld(m);assert.ok(ladder.boxes.some(b=>b.id.includes(':rung:')));assert.ok(!ladder.boxes.some(b=>b.id.includes(':tread:')));
 m.props=[{x:8,y:8,z:1,kind:'roof-flat-parapet'}];m.upper[0]['8,8']='floor';const roof=buildWorld(m);assert.ok(traceWorld(roof,[7,DIMENSIONS.floorSpacing+.2,8],[8,DIMENSIONS.floorSpacing+.2,8]));
});
test('campaign travel and return retain hybrid geometry and persistent squad state',()=>{
 const w=createWorld(blankMap(),'standard',{geometryMode:'hybrid'}),first=currentMap(w);first.units[0].hp=61;
 const gather=s=>{for(const g of guards(s)){g.x=220;g.alert=false;}squad(s).forEach((u,i)=>{u.x=3+i%2;u.y=4+Math.floor(i/2);});refresh(s);};
 gather(first);assert.ok(travel(w,'yard').ok);assert.equal(currentMap(w).geometryMode,'hybrid');assert.equal(currentMap(w).units[0].hp,61);
 gather(currentMap(w));assert.ok(travel(w,'factory').ok);assert.equal(currentMap(w),first);assert.equal(first.geometryMode,'hybrid');assert.equal(first.units[0].hp,61);
});

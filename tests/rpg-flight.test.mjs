import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createRPGFlight,sampleRPGFlight,rpgSmokeSamples,createRPGProjectile,RPG_SMOKE_COUNT,RPG_SMOKE_LIFE} from '../dist/tactics/rpg-flight.js';
import {createRPGFlightEffects} from '../dist/tactics/rpg-flight-effects.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const camera=new T.PerspectiveCamera();camera.position.set(4,8,12);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);

test('native-height flights preserve endpoints and use distance-based timing in every direction',()=>{
 const origin=new T.Vector3(2,6.36,7);
 for(const delta of [[16,0,0],[-16,0,0],[0,0,-28],[0,10,0],[0,-4,0],[8,2,5],[0,0,0]]){
  const end=origin.clone().add(new T.Vector3(...delta)),f=createRPGFlight(origin,end);near(f.duration,origin.distanceTo(end)/32);
  assert.deepEqual(sampleRPGFlight(f,-1).position,origin);assert.ok(sampleRPGFlight(f,f.duration).position.distanceTo(end)<1e-8);
  assert.equal(sampleRPGFlight(f,f.duration).flying,false);assert.equal(sampleRPGFlight(f,f.duration).arrived,true);near(sampleRPGFlight(f,f.duration).blastAge,0);
  if(f.distance){assert.equal(sampleRPGFlight(f,f.duration-1e-6).flying,true);assert.ok(sampleRPGFlight(f,f.duration-1e-6).blastAge<0);near(sampleRPGFlight(f,f.duration/2).progress,.5);}
  else assert.deepEqual(rpgSmokeSamples(f,0),[]);
 }
 const f=createRPGFlight(origin,[5,7,8]);origin.y=100;near(f.origin.y,6.36);
});
test('bad endpoints, speeds and times cannot introduce NaN or infinite geometry',()=>{
 for(const end of [[NaN,1,2],[0,Infinity,2],[1e308,1e308,1e308]])assert.throws(()=>createRPGFlight([0,1,0],end));
 for(const speed of [0,-1,NaN,Infinity,1e-320])assert.throws(()=>createRPGFlight([0,1,0],[16,1,0],{speed}));
 const f=createRPGFlight([0,1,0],[8,1,0]);for(const t of [NaN,Infinity,-Infinity]){assert.throws(()=>sampleRPGFlight(f,t));assert.throws(()=>rpgSmokeSamples(f,t));}
});
test('painted smoke stays at its emission point while the round travels, then rises and dissipates',()=>{
 const f=createRPGFlight([0,1,0],[28,1,0]);const first=rpgSmokeSamples(f,.2).find(p=>p.id===10),later=rpgSmokeSamples(f,.4).find(p=>p.id===10);
 near(first.position.x,later.position.x);near(later.position.y-first.position.y,.05);
 assert.ok(later.opacity<first.opacity);assert.ok(later.width>first.width);assert.ok(first.position.x<sampleRPGFlight(f,.2).position.x);
 assert.ok(rpgSmokeSamples(f,f.duration+.1).length>0);assert.deepEqual(rpgSmokeSamples(f,f.duration+RPG_SMOKE_LIFE),[]);assert.deepEqual(rpgSmokeSamples(f,-.01),[]);
 // The earliest smoke belongs behind the booster, not on the warhead nose.
 near(rpgSmokeSamples(f,0)[0].position.x,-.62);
});
test('direct seeks, rewinds and dropped frames produce the same bounded wake at any speed',()=>{
 for(const speed of [8,32,1000]){
  const f=createRPGFlight([0,6.36,0],[80,8,12],{speed}),t=f.duration*.72,expected=rpgSmokeSamples(f,t);
  for(const other of [f.duration+.5,0,t+.01,-1])rpgSmokeSamples(f,other);
  assert.deepEqual(rpgSmokeSamples(f,t),expected);assert.ok(expected.length<=RPG_SMOKE_COUNT);
  for(const p of expected){assert.ok([...p.position,p.width,p.height,p.opacity,p.rotation].every(Number.isFinite));assert.ok(p.age>=0&&p.age<RPG_SMOKE_LIFE);assert.ok(p.opacity>0&&p.opacity<=1);}
 }
});
test('flight round has a compact low-poly silhouette and releases its owned buffers once',()=>{
 const p=createRPGProjectile();assert.ok(p.triangles<200);p.mesh.geometry.computeBoundingBox();const b=p.mesh.geometry.boundingBox;
 assert.ok(b.max.x-b.min.x>=.6&&b.max.x-b.min.x<.7);assert.ok(b.max.y-b.min.y>.12);assert.ok(b.max.z-b.min.z>.12);
 assert.ok([...p.mesh.geometry.attributes.position.array,...p.mesh.geometry.attributes.normal.array].every(Number.isFinite));
 let geometry=0,material=0;p.mesh.geometry.addEventListener('dispose',()=>geometry++);p.mesh.material.addEventListener('dispose',()=>material++);p.dispose();p.dispose();assert.equal(geometry,1);assert.equal(material,1);
});
test('effect aligns nose and fins to the actual flight including vertical and head-on views',()=>{
 const scene=new T.Scene(),fx=createRPGFlightEffects(scene);
 try{for(const delta of [[16,0,0],[-16,0,0],[0,16,0],[0,-16,0],[0,0,16],[4,8,12]]){
  const f=createRPGFlight([0,0,0],delta);fx.update(f.duration/2,{flight:f,camera});
  const axis=new T.Vector3(1,0,0).applyQuaternion(fx.projectile.root.quaternion);near(axis.dot(f.direction),1);
  assert.ok(fx.projectile.root.position.distanceTo(sampleRPGFlight(f,f.duration/2).position)<1e-8);
  for(const m of fx.group.children)assert.ok([...m.position,...m.quaternion,...m.scale].every(Number.isFinite));
 }}finally{fx.dispose();}
});
test('reduced motion, hiding, toggling the trail and rewinding clear all stale draw state',()=>{
 const scene=new T.Scene(),fx=createRPGFlightEffects(scene),f=createRPGFlight([0,1,0],[16,1,0]),draw=options=>fx.update(.25,{flight:f,camera,...options});
 try{draw();assert.ok(fx.smoke.some(m=>m.visible));assert.equal(fx.projectile.root.visible,true);
  draw({smokeEnabled:false});assert.equal(fx.smoke.some(m=>m.visible),false);assert.equal(fx.projectile.root.visible,true);
  for(const options of [{reduced:true},{visible:false}]){draw(options);assert.equal(fx.group.visible,false);assert.equal(fx.projectile.root.visible,false);assert.equal(fx.smoke.some(m=>m.visible),false);}
  draw();fx.update(-.1,{flight:f,camera});assert.equal(fx.projectile.root.visible,false);assert.equal(fx.smoke.some(m=>m.visible),false);
  fx.update(f.duration,{flight:f,camera});assert.equal(fx.projectile.root.visible,false);assert.equal(fx.exhaust.visible,false);assert.ok(fx.smoke.some(m=>m.visible));
  fx.update(3,{flight:f,camera});assert.equal(fx.group.children.some(m=>m.visible),false);
 }finally{fx.dispose();}
});
test('effect disposal is idempotent and does not dispose borrowed painted atlases',()=>{
 const scene=new T.Scene(),fx=createRPGFlightEffects(scene),texture=new T.Texture();let atlasDisposals=0,geometryDisposals=0,materialDisposals=0;
 texture.addEventListener('dispose',()=>atlasDisposals++);fx.setTextures({smoke:texture,flame:texture});
 fx.smoke[0].geometry.addEventListener('dispose',()=>geometryDisposals++);fx.smoke[0].material.addEventListener('dispose',()=>materialDisposals++);
 fx.dispose();fx.dispose();assert.equal(scene.children.length,0);assert.equal(atlasDisposals,0);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);texture.dispose();
});

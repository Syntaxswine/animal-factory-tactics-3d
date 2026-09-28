import test from 'node:test';
import assert from 'node:assert/strict';
import {WINDOW_TYPES,WINDOW_PANE,SHATTER_DURATION,SHATTER_FADE_START,fracturePane,shardPose,createWindowShatter} from '../dist/tactics/window-shatter.js';
import {DIMENSIONS as D} from '../dist/tactics/hybrid-world.js';
import {EDGES} from '../dist/tactics/environment.js';

const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const bounds=effect=>effect.diagnostics().bounds;

test('shattering covers every canonical wall-window type without changing the aperture',()=>{
 assert.deepEqual([...WINDOW_TYPES].sort(),Object.entries(EDGES).filter(([,r])=>r.window).map(([k])=>k).sort());
 assert.ok(WINDOW_PANE.width<=1);
 assert.ok(WINDOW_PANE.bottom>D.windowBottom&&WINDOW_PANE.top<D.windowTop);
 near(D.wall,2);near(D.wallThickness,.16);
});

test('fractures partition the entire pane, with no reversed, missing, or duplicate triangles',()=>{
 for(const seed of [0,1,17,421,4294967295]){
  const pieces=fracturePane(seed),edges=new Map();let area=0;
  for(const piece of pieces){
   const v=piece.local.map(p=>p.map((n,i)=>n+piece.center[i]));
   const signed=(v[1][0]-v[0][0])*(v[2][1]-v[0][1])-(v[1][1]-v[0][1])*(v[2][0]-v[0][0]);
   assert.ok(signed>0);area+=signed/2;
   for(let i=0;i<3;i++){
    const a=v[i],b=v[(i+1)%3];
    for(const point of [a,b]){assert.ok(Math.abs(point[0])<=WINDOW_PANE.width/2+1e-9);assert.ok(point[1]>=WINDOW_PANE.bottom-1e-9&&point[1]<=WINDOW_PANE.top+1e-9);near(point[2],0);}
    const key=[a,b].map(p=>p.map(n=>n.toFixed(8)).join(',')).sort().join('|');
    edges.set(key,(edges.get(key)||0)+1);
   }
  }
  near(area,WINDOW_PANE.width*(WINDOW_PANE.top-WINDOW_PANE.bottom));
  assert.equal([...edges.values()].filter(n=>n===1).length,24);
  assert.ok([...edges.values()].every(n=>n===1||n===2));
 }
});

test('seeded fracture is deterministic and different seeds produce different cracks',()=>{
 assert.deepEqual(fracturePane(19),fracturePane(19));
 assert.notDeepEqual(fracturePane(19),fracturePane(20));
});

test('impact replaces the intact pane and reflection with the complete shard mesh',()=>{
 const effect=createWindowShatter(),[shards,pane,shine]=effect.group.children;
 assert.equal(shards.visible,false);assert.equal(pane.visible,true);assert.equal(shine.visible,true);
 effect.sample(0);assert.equal(shards.visible,true);assert.equal(pane.visible,false);assert.equal(shine.visible,false);
 for(let i=2;i<bounds(effect).length;i+=3)near(bounds(effect)[i],0);
 effect.dispose();
});

test('all variants and burst directions clear the wall before falling or rotating',()=>{
 for(const kind of WINDOW_TYPES)for(const direction of [-1,1]){
  const effect=createWindowShatter({kind,direction});
  for(let tick=0;tick<=220;tick++){
   effect.sample(tick/100);const positions=bounds(effect);
   for(let i=0;i<positions.length;i+=3){
    const [x,y,z]=positions.slice(i,i+3);
    assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
    assert.ok(y>=.00299,`${kind} shard below ground at ${tick/100}`);
    assert.ok(direction*z>=-1e-7,`${kind} shard moved against burst direction`);
    assert.ok(Math.abs(z)>=D.wallThickness/2-1e-6||(y>=D.windowBottom&&y<=D.windowTop),`${kind} shard intersects wall at ${tick/100}: ${x},${y},${z}`);
   }
  }
  effect.dispose();
 }
});

test('every shard lands flat on the ground and the entire opening is clear',()=>{
 for(const kind of WINDOW_TYPES)for(const direction of [-1,1])for(const seed of [0,17,201]){
  const effect=createWindowShatter({kind,direction,seed});effect.sample(SHATTER_DURATION);
  assert.equal(effect.diagnostics().settled,true);
  const positions=bounds(effect);
  for(let i=0;i<positions.length;i+=9){
   near(positions[i+1],.008);near(positions[i+4],.008);near(positions[i+7],.008);
   for(const j of [2,5,8])assert.ok(direction*positions[i+j]>D.wallThickness/2);
  }
  effect.dispose();
 }
});

test('tumbling and ground contact preserve rigid shard edges rather than flattening individual vertices',()=>{
 for(const direction of [-1,1]){
  const effect=createWindowShatter({direction});
  for(let tick=10;tick<=120;tick+=3){
   effect.sample(tick/100);const positions=bounds(effect);
   effect.pieces.forEach((piece,index)=>{
    for(const [a,b]of [[0,1],[1,2],[2,0]]){
     const original=Math.hypot(...piece.local[a].map((n,i)=>n-piece.local[b][i]));
     const actual=Math.hypot(...[0,1,2].map(axis=>positions[index*9+a*3+axis]-positions[index*9+b*3+axis]));
     near(actual,original,5e-7);
    }
   });
  }
  effect.dispose();
 }
});

test('opposite burst directions mirror depth while preserving fracture, height, and timing',()=>{
 const pieces=fracturePane(53);
 for(const piece of pieces)for(const t of [0,.04,.1,.25,.6,1,SHATTER_DURATION]){
  const a=shardPose(piece,t,1),b=shardPose(piece,t,-1);
  near(a.position[0],b.position[0]);near(a.position[1],b.position[1]);near(a.position[2],-b.position[2]);
  assert.equal(a.settled,b.settled);
 }
});

test('rewind and replay exactly restore geometry with no accumulated drift',()=>{
 const effect=createWindowShatter();effect.sample(.41);const first=bounds(effect);
 effect.sample(SHATTER_DURATION);effect.sample(.12);effect.sample(.41);assert.deepEqual(bounds(effect),first);
 effect.sample(-1);assert.equal(effect.diagnostics().intact,true);assert.equal(effect.group.children[0].visible,false);
 effect.sample(.41);assert.deepEqual(bounds(effect),first);effect.dispose();
});

test('late sampling remains settled without shards sinking or continuing to drift',()=>{
 const effect=createWindowShatter();effect.sample(SHATTER_DURATION);const settled=bounds(effect);
 effect.sample(1000);assert.deepEqual(bounds(effect),settled);assert.equal(effect.diagnostics().settled,true);effect.dispose();
});

test('glass stays fully visible during flight and only fades after every shard has landed',()=>{
 for(const kind of WINDOW_TYPES)for(const direction of [-1,1])for(const seed of [0,17,201,4294967295]){
  const effect=createWindowShatter({kind,direction,seed}),shards=effect.group.children[0];
  effect.sample(0);const fullOpacity=shards.material.opacity;
  for(let i=0;i<=130;i++){
   const time=SHATTER_FADE_START*i/130;effect.sample(time);
   near(shards.material.opacity,fullOpacity);assert.equal(shards.visible,true);
  }
  assert.equal(effect.diagnostics().settled,true,`${kind}: fading began before glass finished landing`);
  let opacity=fullOpacity;
  for(let i=1;i<20;i++){
   const time=SHATTER_FADE_START+(SHATTER_DURATION-SHATTER_FADE_START)*i/20;effect.sample(time);
   assert.equal(effect.diagnostics().settled,true);assert.equal(shards.visible,true);
   assert.ok(shards.material.opacity<opacity&&shards.material.opacity>0);
   opacity=shards.material.opacity;
  }
  effect.dispose();
 }
});

test('cleanup hides all glass and reflections at completion and on late sampling',()=>{
 for(const kind of WINDOW_TYPES)for(const direction of [-1,1]){
  const effect=createWindowShatter({kind,direction});
  for(const time of [SHATTER_DURATION,SHATTER_DURATION+1,1000]){
   effect.sample(time);assert.equal(effect.diagnostics().cleared,true);
   assert.ok(effect.group.children.every(mesh=>!mesh.visible));
   near(effect.group.children[0].material.opacity,0);
  }
  effect.dispose();
 }
});

test('rewinding after cleanup restores shard opacity and visibility, or the complete intact pane',()=>{
 for(const kind of WINDOW_TYPES)for(const direction of [-1,1]){
  const effect=createWindowShatter({kind,direction}),[shards,pane,shine]=effect.group.children;
  effect.sample(.4);const visibleOpacity=shards.material.opacity,geometry=bounds(effect);
  const fadeMidpoint=(SHATTER_FADE_START+SHATTER_DURATION)/2;
  effect.sample(fadeMidpoint);const fadedOpacity=shards.material.opacity;
  effect.sample(1000);assert.equal(shards.visible,false);
  effect.sample(fadeMidpoint);near(shards.material.opacity,fadedOpacity);assert.equal(shards.visible,true);
  effect.sample(.4);near(shards.material.opacity,visibleOpacity);assert.deepEqual(bounds(effect),geometry);
  assert.equal(shards.visible,true);assert.equal(pane.visible,false);assert.equal(shine.visible,false);assert.equal(effect.diagnostics().cleared,false);
  effect.sample(-1);near(shards.material.opacity,visibleOpacity);
  assert.equal(shards.visible,false);assert.equal(pane.visible,true);assert.equal(shine.visible,true);
  effect.sample(0);near(shards.material.opacity,visibleOpacity);assert.equal(shards.visible,true);
  effect.dispose();
 }
});

test('invalid window types and nonfinite sampling time fail before corrupting geometry',()=>{
 assert.throws(()=>createWindowShatter({kind:'window-missing'}),/Unsupported window/);
 const effect=createWindowShatter();effect.sample(.3);const before=bounds(effect);
 for(const time of [NaN,Infinity,-Infinity,undefined,'1'])assert.throws(()=>effect.sample(time),/finite/);
 assert.deepEqual(bounds(effect),before);effect.dispose();
});

test('dispose releases every owned geometry and material exactly once and detaches the effect',()=>{
 const effect=createWindowShatter(),parent=effect.group.clone(false);parent.add(effect.group);
 let released=0;const resources=[];
 effect.group.traverse(o=>{if(o.geometry)resources.push(o.geometry);if(o.material)resources.push(o.material);});
 assert.equal(resources.length,6);for(const r of resources)r.addEventListener('dispose',()=>released++);
 effect.dispose();assert.equal(released,6);assert.equal(effect.group.parent,null);
 effect.dispose();assert.equal(released,6);assert.throws(()=>effect.sample(.3),/disposed/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createHedgePlan,hedgeFixture,HEDGE_FORMS} from '../dist/tactics/hedge-layout.js';
import {createPaintedHedges} from '../dist/tactics/painted-hedges.js';
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const fixtures=['pair','gate','joins','mixed','long'];
function using(cells,fn,options){const model=createPaintedHedges(cells,{},options);try{return fn(model);}finally{model.dispose();}}
function hits(model,origin,direction,layer='core'){
 model.root.updateMatrixWorld(true);return new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction).normalize()).intersectObjects(model.root.children.filter(m=>m.userData.layer===layer));
}

test('invalid cells, duplicate placement and invalid seeds fail before building geometry',()=>{
 for(const cells of [[{x:.5,z:0}],[{x:0,z:Infinity}],[{x:0,z:0,base:NaN}],...['fence','toString','__proto__'].map(kind=>[{x:0,z:0,kind}]),[{x:0,z:0},{x:0,z:0}]])assert.throws(()=>createHedgePlan(cells));
 assert.throws(()=>createHedgePlan([],{seed:1.5}));using([],m=>{assert.equal(m.root.children.length,0);assert.equal(m.contract.bounds,null);});
});

test('a short hedge screens a kneeling eye but leaves a standing shot above it; a tall hedge screens standing height',()=>{
 const row=kind=>Array.from({length:7},(_,x)=>({x:x-3,z:0,kind}));
 using(row('short'),m=>{for(const x of [-2.5,0,2.5]){assert.ok(hits(m,[x,.825,2],[0,0,-1]).length);assert.equal(hits(m,[x,1.19,2],[0,0,-1]).length,0);}});
 using(row('tall'),m=>{for(const x of [-2.5,0,2.5]){assert.ok(hits(m,[x,1.65,2],[0,0,-1]).length);assert.equal(hits(m,[x,2.6,2],[0,0,-1]).length,0);}});
 assert.ok(HEDGE_FORMS.short.height<1.155);assert.ok(HEDGE_FORMS.tall.height>1.65);
});

test('joined corners, crosses, ends and height changes stay inside occupied tiles, including negative coordinates',()=>{
 for(const id of fixtures)for(const rotation of [0,1,2,3])using(hedgeFixture(id).map(c=>({...c,...[{x:c.x,z:c.z},{x:-c.z,z:c.x},{x:-c.x,z:-c.z},{x:c.z,z:-c.x}][rotation]})),m=>{
  for(const mesh of m.root.children){const p=mesh.geometry.attributes.position;
   for(let i=0;i<p.count;i++)assert.ok(m.plan.contains(p.getX(i),p.getZ(i),0,-1e-5),`${id}/${rotation} ${mesh.name} at ${p.getX(i)},${p.getZ(i)}`);
   for(let i=0;i<p.count;i+=3)for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[0,.5,.5],[.5,0,.5]]){
    const x=weights.reduce((s,w,j)=>s+w*p.getX(i+j),0),z=weights.reduce((s,w,j)=>s+w*p.getZ(i+j),0);assert.ok(m.plan.contains(x,z,0,-1e-5),`${id} triangle spans a clear tile`);
   }
  }
 });
});

test('one complete tile through the gap is free of cores, wooden stems and leaf cards',()=>{
 for(const kind of ['short','tall'])using(hedgeFixture('gate',kind),m=>{
  for(const layer of ['core','wood','leaves'])for(const x of [-.499,-.25,0,.25,.499])for(const y of [.05,.4,.8,1.2,1.65,2.2])assert.equal(hits(m,[x,y,1],[0,0,-1],layer).length,0,`${kind} ${layer} gap at ${x},${y}`);
 });
});

test('continuous joins do not add internal end caps, including the 16-tile chunk boundary',()=>{
 using(hedgeFixture('long'),m=>{
  for(let x=-14.5;x<16;x++){
   near(m.plan.surface(x-1e-7,0),m.plan.surface(x+1e-7,0));
   for(const z of [-.2,0,.2])assert.ok(hits(m,[x,3,z],[0,-1,0]).length,`missing top at ${x},${z}`);
  }
  assert.equal(hits(m,[-14.5,1,0],[1,0,0]).filter(h=>h.distance<29.5).length,0,'No hidden caps along the center of a continuous row');
  assert.ok(m.stats().chunks<=3);assert.ok(m.stats().meshes<=m.stats().chunks*3);
 });
});

test('all sixteen neighbor combinations keep connected crowns continuous at both heights',()=>{
 const neighbors=[[1,0],[0,1],[-1,0],[0,-1]];
 for(const kind of ['short','tall'])for(let mask=0;mask<16;mask++){
  const cells=[{x:0,z:0,kind},...neighbors.filter((_,i)=>mask&(1<<i)).map(([x,z])=>({x,z,kind}))];
  using(cells,m=>{for(const [dx,dz]of neighbors){
   const connected=mask&(1<<neighbors.findIndex(([x,z])=>x===dx&&z===dz));
   const h=hits(m,[dx*.5,3,dz*.5],[0,-1,0]);assert.equal(h.length>0,!!connected,`${kind}/${mask} join ${dx},${dz}`);
   if(connected)near(m.plan.surface(dx*.499999,dz*.499999),m.plan.surface(dx*.500001,dz*.500001));
  }});
 }
});

test('side surfaces face outward, with finite attributes and consistent normals',()=>{
 for(const id of fixtures)using(hedgeFixture(id),m=>{
  for(const mesh of m.root.children){const {position:p,normal:n,uv,color}=mesh.geometry.attributes;for(const a of [p,n,uv,color])assert.ok([...a.array].every(Number.isFinite));
   for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2),face=b.sub(a).cross(c.sub(a)),normal=new T.Vector3().fromBufferAttribute(n,i).add(new T.Vector3().fromBufferAttribute(n,i+1)).add(new T.Vector3().fromBufferAttribute(n,i+2));assert.ok(face.dot(normal)>=-1e-7,`${id} ${mesh.name} inverted triangle ${i/3}`);}
  }
 });
});

test('wood descriptors are the same tapered five-sided beams used in the render, not solid leaf walls',()=>{
 using(hedgeFixture('gate'),m=>{
  const p=[];for(const mesh of m.root.children.filter(m=>m.userData.layer==='wood')){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)p.push(new T.Vector3().fromBufferAttribute(a,i));}
  for(const beam of m.contract.wood){
   const a=new T.Vector3(...beam.a),b=new T.Vector3(...beam.b),axis=b.clone().sub(a).normalize();
   const cap=pointsAt=>p.filter(v=>Math.abs(v.clone().sub(pointsAt).dot(axis))<1e-5&&v.distanceTo(pointsAt)<beam.radius+1e-5);
   assert.ok(cap(a).length>=5);assert.ok(cap(b).length>=5);near(Math.max(...cap(a).map(v=>v.distanceTo(a))),beam.radius);near(Math.max(...cap(b).map(v=>v.distanceTo(b))),beam.tipRadius);
  }
  assert.ok(hits(m,[2,1.5,2],[0,0,-1],'core').length);assert.equal(hits(m,[2,1.5,2],[0,0,-1],'wood').length,0);
 });
});

test('height changes stay continuous and raised runs remain on their authored ground level',()=>{
 const p=createHedgePlan(hedgeFixture('mixed'));for(let x=-4.5;x<4.5;x+=.025)assert.ok(Math.abs(p.surface(x,0)-p.surface(x+.025,0))<.05,'height jump '+x);
 using([{x:0,z:0,base:2,kind:'tall'},{x:1,z:0,base:2,kind:'tall'}],m=>{assert.ok(m.contract.bounds.min[1]>=2);assert.ok(m.contract.bounds.max[1]>3.7);assert.ok(hits(m,[.5,3.6,2],[0,0,-1]).length);});
 const split=createHedgePlan([{x:0,z:0,base:0},{x:1,z:0,base:2}]);assert.equal(split.edges.filter(e=>e.a!==e.b).length,0);
});

test('seed and placement order are stable, while a different seed changes the planting',()=>{
 const cells=hedgeFixture('joins'),a=createPaintedHedges(cells),b=createPaintedHedges([...cells].reverse()),c=createPaintedHedges(cells,{}, {seed:318});
 try{assert.deepEqual(a.contract,b.contract);assert.deepEqual(a.root.children.map(m=>Array.from(m.geometry.attributes.position.array)),b.root.children.map(m=>Array.from(m.geometry.attributes.position.array)));assert.notDeepEqual(a.contract.wood,c.contract.wood);}finally{for(const m of [a,b,c])m.dispose();}
});

test('merged geometry stays modest, and grey/detail switches restore the same painted objects',()=>{
 using(hedgeFixture('long'),m=>{assert.ok(m.stats().triangles<350*m.stats().cells);const ids=m.root.children.map(o=>o.geometry.uuid);m.setGrey(true);for(const o of m.root.children){if(o.userData.layer==='leaves')assert.equal(o.visible,false);else assert.equal(o.material.map,null);}m.setGrey(false);m.setDetail(false);m.setDetail(true);assert.deepEqual(m.root.children.map(o=>o.geometry.uuid),ids);for(const o of m.root.children)assert.equal(o.material,o.userData.paint);});
});

test('disposing a hedge releases its resources once and preserves caller-owned shared paint',()=>{
 const screen=new T.Texture(),fringe=new T.Texture(),model=createPaintedHedges(hedgeFixture('pair'),{screen,fringe});let textureDisposals=0;for(const t of [screen,fringe])t.addEventListener('dispose',()=>textureDisposals++);
 const resources=new Set(model.root.children.flatMap(m=>[m.geometry,m.material])),counts=new Map();for(const r of resources){counts.set(r,0);r.addEventListener('dispose',()=>counts.set(r,counts.get(r)+1));}
 model.dispose();model.dispose();assert.equal(model.root.children.length,0);for(const n of counts.values())assert.equal(n,1);assert.equal(textureDisposals,0);screen.dispose();fringe.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {STRATEGIC_SITES,createStrategicSiteLibrary} from '../dist/tactics/strategic-sites.js';
import {SITE_CLEARANCE_PROFILES,analyzeSiteClearance} from '../dist/tactics/strategic-site-clearance.js';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
const fixture=fn=>{const atlas=new THREE.Texture(),library=createStrategicSiteLibrary(atlas);try{fn(library,atlas);}finally{library.dispose();atlas.dispose();}};
const cell=(map,x,z)=>map.cells.find(c=>c.x===x&&c.z===z);

test('all permanent concrete vertices and anchors stay fixed across destruction',()=>fixture(l=>{
 const vertices=root=>{
  root.updateMatrixWorld(true);const result=[];
  for(const assembly of root.children){
   if(assembly.name==='scattered-fragments')continue;
   assembly.traverse(m=>{if(m.isMesh&&(assembly.name==='hardstanding'||m.material.name==='site-concrete')){
    const p=m.geometry.attributes.position;
    for(let i=0;i<p.count;i++)result.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld).toArray().map(n=>Math.round(n*1e6)).join(','));
   }});
  }return result.sort();
 };
 for(const s of STRATEGIC_SITES){
  const a=l.build(s.id).root,b=l.build(s.id,{state:'destroyed'}).root;
  assert.deepEqual(a.userData.foundations,b.userData.foundations,s.id+' fixed anchors drift');
  assert.deepEqual(vertices(a),vertices(b),s.id+' concrete geometry drifts');
 }
}));

test('hut doors clear the native horse height and retain reachable front approaches',()=>fixture(l=>{
 for(const id of ['radio','radar'])for(const state of ['intact','destroyed']){
  const h=l.build(id,{state}).root.getObjectByName('service-hut'),door=h.userData.door;
  assert(door.height>=1.85&&door.width>=1.10,'Undersized service doorway');
  assert(door.height>1.65+.15,'Native horse needs visible headroom');
  for(const profile of ['horse','wide'])assert.equal(cell(l.clearance(id,{state,profile}),1,7).reachable,true,id+' service door approach is blocked');
 }
}));

test('neutral bodies fit the documented envelopes without scaling any character',()=>{
 for(const species of ANIMAL_MOTION_CATALOG){
  const data=JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+species.file,import.meta.url)));
  const texture=new THREE.Texture(),model=species.create(data,texture);
  try{
   model.pose('neutral');model.root.updateMatrixWorld(true);
   const profile=SITE_CLEARANCE_PROFILES[species.id==='horse'?'horse':'wide'];
   assert.deepEqual(model.root.scale.toArray(),[1,1,1]);
   for(const mesh of model.parts){
    const indices=mesh.geometry.index?.array??Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i);
    for(const i of new Set(indices)){
     const p=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     assert(Math.hypot(p.x,p.z)<=profile.halfWidth+.0001,species.id+' extends beyond standing envelope during rotation');
     assert(p.y<=profile.height,species.id+' exceeds standing headroom');
    }
   }
  }finally{model.dispose();if(species.id!=='hen')model.skeleton?.dispose();texture.dispose();}
 }
});

test('each state has usable routes, blocked equipment and conservative wide-body masks',()=>fixture(l=>{
 for(const s of STRATEGIC_SITES)for(const state of ['intact','destroyed']){
  const horse=l.clearance(s.id,{state}),wide=l.clearance(s.id,{state,profile:'wide'});
  for(const map of [horse,wide]){
   assert.equal(map.cells.length,64);assert.equal(map.rows.length,8);assert(map.rows.every(r=>r.length===8));
   assert(map.cells.filter(c=>c.reachable).length>=12,'Site needs usable space around equipment');
   assert(map.cells.some(c=>!c.passable),'Equipment must block some cells');assert(map.entries.length>0);
   for(const link of map.links){assert.equal(Math.abs(link.from[0]-link.to[0])+Math.abs(link.from[1]-link.to[1]),1);assert(cell(map,...link.from).passable&&cell(map,...link.to).passable);}
   const linked=new Set(map.entries.map(e=>e.cell.join(',')));let changed=true;
   while(changed){changed=false;for(const link of map.links)for(const [a,b]of [[link.from,link.to],[link.to,link.from]])if(linked.has(a.join(','))&&!linked.has(b.join(','))){linked.add(b.join(','));changed=true;}}
   for(const c of map.cells){assert.equal(c.reachable,linked.has([c.x,c.z].join(',')));assert.equal(map.rows[c.z][c.x],c.reachable?'.':c.passable?'o':'#');}
  }
  for(const c of wide.cells)if(c.reachable)assert(cell(horse,c.x,c.z).reachable,'A wider body cannot gain a route');
  if(s.id==='sam')assert.equal(cell(horse,3,3).passable,false,'Launcher base must be solid');
  else assert.equal(cell(horse,1,5).passable,false,'Service hut must be solid');
 }
}));

test('passage masks are local to the asset and cached results cannot be mutated',()=>fixture(l=>{
 for(const s of STRATEGIC_SITES)for(const state of ['intact','destroyed']){
  const expected=l.clearance(s.id,{state}),root=l.build(s.id,{state}).root;
  for(let q=0;q<4;q++){root.rotation.y=q*Math.PI/2;root.position.set(13,4,-7);assert.deepEqual(analyzeSiteClearance(root),expected,s.id+' mask changes after placement');}
  const copy=l.clearance(s.id,{state});copy.cells[0].reachable=false;copy.rows[0]='XXXXXXXX';copy.links.length=0;copy.profile.halfWidth=10;
  assert.deepEqual(l.clearance(s.id,{state}),expected);
 }
 assert.throws(()=>l.clearance('radio',{profile:'small'}),/Unknown/);assert.throws(()=>l.clearance('other'),/Unknown/);l.dispose();assert.throws(()=>l.clearance('radio'),/disposed/);
}));

const mock=fn=>{
 const root=new THREE.Group();root.userData.slabHeight=.24;const geometries=[],material=new THREE.MeshBasicMaterial();
 const box=(name,p,size)=>{const g=new THREE.BoxGeometry(...size);geometries.push(g);const m=new THREE.Mesh(g,material);m.name=name;m.position.set(...p);root.add(m);return m;};
 try{fn(root,box);}finally{for(const g of geometries)g.dispose();material.dispose();}
};
test('overhead structures and low cable covers leave room, body-height obstacles do not',()=>mock((root,box)=>{
 box('hardstanding',[0,.12,0],[8,.24,8]);const beam=box('overhead',[0,2.5,0],[6,.1,6]);box('low-cable',[0,.28,0],[.06,.04,7]);
 let map=analyzeSiteClearance(root);assert(map.cells.every(c=>c.reachable));
 beam.position.y=1;map=analyzeSiteClearance(root);assert.equal(cell(map,3,3).passable,false);
}));
test('clear endpoints do not imply a clear path or a valid boundary entry',()=>mock((root,box)=>{
 box('thin-fence',[0,1,-.5],[.04,2,1]);box('boundary-fence',[-4,1,-2.5],[.04,2,1]);
 const map=analyzeSiteClearance(root);
 assert(cell(map,3,3).passable&&cell(map,4,3).passable);
 assert(!map.links.some(l=>l.from.join(',')==='3,3'&&l.to.join(',')==='4,3'),'Sweep must reject the fence between two clear centers');
 assert(cell(map,0,1).passable);assert(!map.entries.some(e=>e.cell.join(',')==='0,1'&&e.edge==='west'),'Boundary sweep must reject outside obstruction');
}));
test('an enclosed clear pocket is not presented as a usable route',()=>mock((root,box)=>{
 for(const x of [1,2])box('enclosure',[x,1,1.5],[.04,2,1.04]);for(const z of [1,2])box('enclosure',[1.5,1,z],[1.04,2,.04]);
 const map=analyzeSiteClearance(root),inside=cell(map,5,5);assert(inside.passable);assert(!inside.reachable);assert.equal(map.rows[5][5],'o');
}));

test('published masks, foundations and connections match the library',()=>fixture(l=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/environment/strategic-sites/manifest.json',import.meta.url)));
 assert.equal(manifest.version,2);assert.equal(manifest.clearance.status,'proposed-standing-clearance');
 for(const entry of manifest.assets){
  assert.deepEqual(entry.foundations,l.build(entry.siteId,{state:entry.state}).root.userData.foundations);
  for(const profile of ['horse','wide']){const map=l.clearance(entry.siteId,{state:entry.state,profile}),record=entry.clearance[profile];assert.deepEqual(record.rows,map.rows);assert.deepEqual(record.links,map.links.map(k=>[...k.from,...k.to]));assert.deepEqual(record.entries,map.entries);}
 }
}));

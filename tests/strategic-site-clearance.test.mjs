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
    const vertices=new Map([...new Set(indices)].map(i=>[i,mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld)]));
    for(const p of vertices.values())assert(p.y<=profile.height,species.id+' exceeds standing headroom');
    // A triangle can cross a height boundary without having a vertex inside
    // that band. Check edge/height intersections as well as authored vertices.
    for(let i=0;i<indices.length;i+=3){
     const triangle=[0,1,2].map(j=>vertices.get(indices[i+j]));
     for(const b of profile.bands){
      const section=triangle.filter(v=>v.y>=b.minY&&v.y<=b.maxY);
      for(let e=0;e<3;e++){const a=triangle[e],c=triangle[(e+1)%3];for(const y of [b.minY,b.maxY])if((a.y<y&&c.y>y)||(c.y<y&&a.y>y))section.push(a.clone().lerp(c,(y-a.y)/(c.y-a.y)));}
      for(const p of section)assert(Math.hypot(p.x,p.z)+.0199<=b.radius,species.id+' triangle exceeds padded circular band at '+b.minY);
     }
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
  for(let q=0;q<4;q++){
   root.rotation.y=q*Math.PI/2;root.position.set(13,4,-7);const actual=analyzeSiteClearance(root);
   assert.deepEqual(actual.rows,expected.rows,s.id+' mask changes after placement');assert.deepEqual(actual.links,expected.links);assert.deepEqual(actual.entries,expected.entries);
   actual.cells.forEach((c,i)=>{const target=expected.cells[i];assert.equal(c.reason,target.reason);if(c.contact)c.contact.point.forEach((v,k)=>assert(Math.abs(v-target.contact.point[k])<1e-5));});
  }
  const copy=l.clearance(s.id,{state});copy.cells[0].reachable=false;copy.rows[0]='XXXXXXXX';copy.links.length=0;copy.profile.bands[0].radius=10;
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

test('rounded envelopes keep empty diagonal corners and low-obstacle margins open',()=>mock((root,box)=>{
 const corner=box('corner',[.93,1.1,.93],[.04,.1,.04]);
 assert(cell(analyzeSiteClearance(root),4,4).reachable,'Empty square corner must not block a circular body');
 root.remove(corner);const post=box('low-post',[.92,.40,.5],[.04,.10,.20]);
 assert(cell(analyzeSiteClearance(root),4,4).reachable,'Tail or shoulder width must not be used at ankle height');
 post.position.y=1.1;assert(!cell(analyzeSiteClearance(root),4,4).passable,'Same obstacle at shoulder height must still block');
}));
test('swept circle does not inherit square corners and does catch barriers between centers',()=>mock((root,box)=>{
 box('outside-capsule',[.82,.4,-.16],[.025,.06,.025]);
 const map=analyzeSiteClearance(root);
 assert(map.links.some(l=>l.from.join(',')==='3,3'&&l.to.join(',')==='4,3'),'Empty diagonal space past the endpoint must not block a sweep');
 box('between-centers',[0,1,-.5],[.03,1,.4]);
 assert(!analyzeSiteClearance(root).links.some(l=>l.from.join(',')==='3,3'&&l.to.join(',')==='4,3'));
}));
test('roster tail clearance can block a high fitting that clears the horse',()=>mock((root,box)=>{
 box('high-fitting',[1.10,1.65,.5],[.03,.10,.1]);
 assert(cell(analyzeSiteClearance(root),4,4).reachable);
 const c=cell(analyzeSiteClearance(root,'wide'),4,4);assert(!c.passable);assert(c.contact.band[0]>=1.25);
}));
test('empty SAM perimeter tiles reopen without admitting players inside the launcher or wreckage',()=>fixture(l=>{
 for(const state of ['intact','destroyed']){
  const map=l.clearance('sam',{state,profile:'wide'});
  for(const [column,row]of [[2,2],[3,2],[6,2],[7,4],[7,5],[1,6],[1,8],[2,8]])assert(cell(map,column-1,row-1).reachable,'Open concrete at C'+column+'R'+row+' '+state);
  assert(!cell(map,3,3).passable);assert(!cell(map,4,4).passable);
 }
 const wreck=l.clearance('sam',{state:'destroyed',profile:'wide'});assert(!cell(wreck,1,3).passable,'Fallen missile still blocks its actual occupied cell');
}));
test('reported contact markers lie on real geometry within the colliding height band',()=>fixture(l=>{
 for(const s of STRATEGIC_SITES)for(const state of ['intact','destroyed']){
  const root=l.build(s.id,{state}).root,faces=new Map();root.updateMatrixWorld(true);
  for(const assembly of root.children){const triangles=faces.get(assembly.name)||[];assembly.traverse(m=>{if(m.isMesh){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i+=3)triangles.push(new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j).applyMatrix4(m.matrixWorld))));}});faces.set(assembly.name,triangles);}
  for(const profile of ['horse','wide'])for(const c of l.clearance(s.id,{state,profile}).cells){
   if(!c.contact)continue;const hit=c.contact,p=new THREE.Vector3(...hit.point);assert(hit.point.every(Number.isFinite));
   assert(p.y>=.24+Math.max(.08,hit.band[0])-1e-6&&p.y<=.24+hit.band[1]+1e-6);
   assert(Math.hypot(p.x-c.center[0],p.z-c.center[1])<=hit.radius+1e-6);
   assert(faces.get(hit.part).some(t=>t.closestPointToPoint(p,new THREE.Vector3()).distanceToSquared(p)<1e-10),'Contact marker must touch the actual '+hit.part);
  }
 }
}));
test('published masks, foundations and connections match the library',()=>fixture(l=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../dist/assets/environment/strategic-sites/manifest.json',import.meta.url)));
 assert.equal(manifest.version,3);assert.equal(manifest.clearance.status,'proposed-standing-clearance');assert.equal(manifest.clearance.shape,'circular-height-bands');
 for(const entry of manifest.assets){
  assert.deepEqual(entry.foundations,l.build(entry.siteId,{state:entry.state}).root.userData.foundations);
  for(const profile of ['horse','wide']){const map=l.clearance(entry.siteId,{state:entry.state,profile}),record=entry.clearance[profile];assert.deepEqual(record.rows,map.rows);assert.deepEqual(record.links,map.links.map(k=>[...k.from,...k.to]));assert.deepEqual(record.entries,map.entries);}
 }
}));

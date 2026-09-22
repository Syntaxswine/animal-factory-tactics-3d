import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/tactics/vendor/three.module.js';
import {CARGO_FORMS,CARGO_SKINS,createCargoLibrary,DRUM_RADIUS} from '../dist/tactics/painted-cargo.js';
const atlas=new THREE.Texture();
test('all 48 cargo combinations fit their declared tile footprint and stay grounded',()=>{
 const library=createCargoLibrary(atlas,atlas);let count=0;
 for(const form of CARGO_FORMS)for(const [skin,def]of Object.entries(CARGO_SKINS))if(def.family===form.family){
  const model=library.build(form.id,skin),b=model.bounds,[w,d]=form.tiles;count++;
  assert(b.min.x>=-w/2&&b.max.x<=w/2&&b.min.z>=-d/2&&b.max.z<=d/2,`${form.id} exceeds ${w}×${d}: ${JSON.stringify(b)}`);
  assert(b.min.y>=-.005&&b.min.y<=.003,`${form.id} ground contact ${b.min.y}`);
  model.root.traverse(o=>{if(o.isMesh)assert([...o.geometry.attributes.position.array,...o.geometry.attributes.normal.array].every(Number.isFinite));});
 }
 assert.equal(count,48);library.dispose();
});
test('horizontal drum piles have two aligned supporting drums; vertical stacks have full supporting lids',()=>{
 const library=createCargoLibrary(atlas,atlas);
 for(const form of CARGO_FORMS.filter(f=>f.family==='barrel')){
  const {items}=library.build(form.id,'blue');
  for(const p of items){const [x,y,z]=p.center;if(p.horizontal&&y>DRUM_RADIUS+.001){const supports=items.filter(q=>q.horizontal&&q.center[1]<y&&Math.abs(q.center[2]-z)<.001&&Math.abs(Math.hypot(x-q.center[0],y-q.center[1])-2*DRUM_RADIUS)<1e-8);assert.equal(supports.length,2,form.id);}
   if(!p.horizontal&&y>.401)assert(items.some(q=>!q.horizontal&&q!==p&&Math.abs(q.center[0]-x)<1e-9&&Math.abs(q.center[2]-z)<1e-9&&Math.abs(y-q.center[1]-.8)<1e-8),form.id);
  }
 }
 library.dispose();
});
test('switching forms reuses library resources and rejects mismatched skins',()=>{
 const library=createCargoLibrary(atlas,atlas),cycle=()=>{for(const f of CARGO_FORMS)for(const [skin,s]of Object.entries(CARGO_SKINS))if(s.family===f.family)library.build(f.id,skin);};cycle();const retained=library.stats();cycle();assert.deepEqual(library.stats(),retained);assert.throws(()=>library.build('crate-long','blue'));
 library.dispose();assert.deepEqual(library.stats(),{geometries:0,materials:0,textures:0});assert.throws(()=>library.build('crate-long','timber'));library.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {naturalArchLayout,ARCH_ELEVATION_PLAN} from '../dist/tactics/natural-arch-data.js';
import {naturalArchGeometry,naturalArchUnderside,createNaturalArchLibrary} from '../dist/tactics/natural-rock-arches.js';
import {checkNaturalArchActors} from '../tools/check-natural-arch-actors.mjs';
const near=(a,b)=>Math.abs(a-b)<2e-5;
for(const kind of ['large','small'])for(const detail of ['author','runtime'])test(kind+' '+detail+' is a closed, painted, outward-facing volume with exact upper contacts',()=>{
 const g=naturalArchGeometry(kind,{detail}),s=naturalArchLayout(kind),p=g.attributes.position,uv=g.attributes.uv,edges=new Map(),key=v=>v.join(','),ray=new T.Raycaster(),mesh=new T.Mesh(g,new T.MeshBasicMaterial());
 assert.ok(g.userData.triangles<=(detail==='author'?3300:1100),'Mesh stays within the author/runtime budget');assert.ok(near(g.boundingBox.min.x,-s.width/2)&&near(g.boundingBox.max.x,s.width/2));
 for(let i=0;i<p.count;i+=3){const a=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),cross=new T.Vector3(...a[1]).sub(new T.Vector3(...a[0])).cross(new T.Vector3(...a[2]).sub(new T.Vector3(...a[0])));assert.ok(cross.length()>1e-8,'No zero-area face');for(let j=0;j<3;j++){const u=key(a[j]),v=key(a[(j+1)%3]),k=[u,v].sort().join('|'),prior=edges.get(k)||{count:0,balance:0};prior.count++;prior.balance+=u<v?1:-1;edges.set(k,prior);}}
 assert.ok([...edges.values()].every(e=>e.count===2&&e.balance===0),'Every spatial edge has two oppositely wound faces, including the eroded caps');
 for(let i=0;i<uv.count;i++)assert.ok(uv.getX(i)>.006&&uv.getX(i)<.994&&uv.getY(i)>.006&&uv.getY(i)<.994,'UVs stay inside atlas padding');
 for(let x=-s.width/2+.01;x<s.width/2;x+=.25)for(let z=-.99;z<1;z+=.33){ray.set(new T.Vector3(x,s.height+2,z),new T.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit&&near(hit.point.y,s.height),'Entire two-tile route lies on the building floor plane');}
 let min=Infinity;for(let x=-s.opening/2+.01;x<s.opening/2;x+=.1)for(let z=-1.94;z<1.95;z+=.2){const h=naturalArchUnderside(g,x,z);if(Math.abs(z)<=1.1)assert.ok(h!==null,'The protected core has a continuous finished underside');if(h!==null)min=Math.min(min,h);}assert.ok(min>=1.90,'Actual underside clearance holds near eroded lips and shoulders, not just tile centres');
 assert.equal(s.connections.length,2);for(const c of s.connections){assert.equal(c.width,2);assert.ok(near(c.center[1],s.height));}mesh.material.dispose();g.dispose();
});
test('The large arch reserves eight open columns around an independently placed six-tile road',()=>{const s=naturalArchLayout('large');assert.equal(s.width,12);assert.equal(s.opening,8);assert.equal(s.road.width,6);assert.equal(s.road.sideClearance,1);assert.equal(s.road.separate,true);assert.equal(s.passage.length,32);assert.equal(s.groundBlocked.length,16);assert.equal(s.walkable.length,24);assert.equal(s.height,6.36);assert.equal(naturalArchLayout('small').height,2.12);assert.equal(ARCH_ELEVATION_PLAN.totalLayers,5);});
test('Actual grounded models and fitted hats clear every passage column at five headings',()=>{const rows=checkNaturalArchActors();assert.equal(rows.length,26);assert.ok(rows.every(r=>r.collisions===0),JSON.stringify(rows.filter(r=>r.collisions)));assert.ok(Math.max(...rows.map(r=>r.height))>1.77,'Includes tall donkey ears');assert.ok(Math.min(...rows.map(r=>r.minMargin))>.12);});
test('The library shares geometry, owns only its materials and safely releases repeated instances',()=>{const atlas=new T.Texture(),library=createNaturalArchLibrary(atlas),a=library.build('large'),b=library.build('large');assert.equal(a.mesh.geometry,b.mesh.geometry);library.setStyle({grey:true,wire:true});assert.ok(a.mesh.material.wireframe);a.remove();library.dispose();library.dispose();assert.throws(()=>library.build('small'),/disposed/);atlas.dispose();});

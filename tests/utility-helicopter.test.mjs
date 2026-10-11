import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {createUtilityHelicopter,HELICOPTER_DIMENSIONS as D,helicopterPaintRect} from '../dist/tactics/utility-helicopter.js';
import {createCanvasTruck} from '../dist/tactics/canvas-truck.js';
const vec=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const box=o=>{o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o,true);};
const near=(a,b,tolerance=.00001)=>assert.ok(Math.abs(a-b)<tolerance,a+' != '+b);
function withModel(state,fn){const atlas=new T.Texture(),model=createUtilityHelicopter(atlas,{state});try{fn(model,atlas);}finally{model.dispose();atlas.dispose();}}

test('native aircraft scale is based on the existing truck, with recognizable cabin and rotor proportions',()=>withModel('intact',a=>{
 const truck=createCanvasTruck(JSON.parse(fs.readFileSync(new URL('../dist/tactics/canvas-truck-10k-data.json',import.meta.url),'utf8')));
 try{
  const truckSize=box(truck.root).getSize(vec()),b=a.diagnostics().bodyBounds,bodyLength=b.max[0]-b.min[0];
  near(bodyLength,D.bodyLength);assert.ok(bodyLength/truckSize.x>1.75&&bodyLength/truckSize.x<1.95);
  const cabin=box(a.root.getObjectByName('Fuselage shell')).getSize(vec());near(cabin.z,D.cabinWidth);assert.ok(cabin.z/truckSize.z>.65&&cabin.z/truckSize.z<1.05);
  assert.deepEqual(a.root.scale.toArray(),[1,1,1]);assert.deepEqual(truck.root.scale.toArray(),[1,1,1]);near(box(a.root).max.y,D.height,.015);
  const main=a.root.getObjectByName('Main rotor assembly'),rotor=box(main);assert.ok(rotor.min.y>3);near(a.diagnostics().rotorClearance.worldBottomY,rotor.min.y);
  assert.equal(main.children.filter(p=>p.name.startsWith('Main rotor blade')).length,2);
  for(const p of main.children.filter(p=>p.name.startsWith('Main rotor tip')))assert.ok(p.position.length()>4.5&&p.position.length()<D.rotorDiameter/2);
 }finally{truck.dispose();}
}));

test('both forms remain low polygon, use only finite geometry and sample their own inset atlas cells',()=>{
 for(const state of ['intact','crashed'])withModel(state,(a,atlas)=>{
  const d=a.diagnostics();assert.ok(d.triangles<3000);assert.equal(d.gameplayIntegrated,false);assert.ok(box(a.root).min.y>=-1e-6);
  for(const p of a.parts){
   assert.equal(p.material.map,atlas);const [u,v,w,h]=helicopterPaintRect(p.userData.paint),uv=p.geometry.attributes.uv;
   for(const name of ['position','normal','uv'])assert.ok([...p.geometry.attributes[name].array].every(Number.isFinite),p.name+' '+name);
   for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>=u-1e-6&&uv.getX(i)<=u+w+1e-6,p.name);assert.ok(uv.getY(i)>=v-1e-6&&uv.getY(i)<=v+h+1e-6,p.name);}
  }
 });
 assert.throws(()=>helicopterPaintRect('unknown'));assert.throws(()=>createUtilityHelicopter(new T.Texture(),{state:'flying'}));
});

test('crash retains the aircraft components while opening glazing and showing a physical tail break',()=>{
 withModel('intact',intact=>withModel('crashed',wreck=>{
  for(const name of ['Fuselage shell','Tapered tail boom','Single turbine cowling','Tail fin','Tail rotor','Cabin deck'])assert.ok(intact.root.getObjectByName(name)&&wreck.root.getObjectByName(name),name);
  assert.ok(intact.parts.some(p=>p.name.startsWith('Windscreen upper')));assert.ok(!wreck.parts.some(p=>p.name.startsWith('Windscreen upper')));
  assert.ok(wreck.root.getObjectByName('Detached cabin door'));assert.equal(wreck.parts.filter(p=>p.name.startsWith('Torn tail lip')).length,8);
  const intactHeight=box(intact.root.getObjectByName('Cabin assembly')).getSize(vec()).y,wreckHeight=box(wreck.root.getObjectByName('Cabin assembly')).getSize(vec()).y;assert.ok(wreckHeight<intactHeight*.85);
  const tail=wreck.root.getObjectByName('Tail assembly');assert.ok(Math.abs(tail.rotation.x)>.6);
 }));
});

test('actual wreck vertices provide ground contacts for separate components and rotor tips',()=>withModel('crashed',a=>{
 const names=['Cabin assembly','Tail assembly','Detached cabin door',...a.parts.filter(p=>p.userData.role==='debris'||p.name.startsWith('Buckled skid')||/^Folded main rotor .* 1$/.test(p.name)).map(p=>p.name)];
 for(const name of names){const b=box(a.root.getObjectByName(name));assert.ok(b.min.y>=-1e-6&&b.min.y<=.016,name+' lowest vertex '+b.min.y);}
 const tail=a.root.getObjectByName('Tail assembly'),lip=new T.Box3();for(const p of tail.children.filter(p=>p.name.startsWith('Torn tail lip')))lip.union(box(p));
 const stabilizer=box(tail.getObjectByName('Tailplane lower 1'));assert.ok(lip.min.y<.022&&stabilizer.min.y<.022,'detached tail must rest on broken root AND stabilizer, not balance on one point');
 // Measure transformed vertices directly as an independent check against
 // accidental grounding on rotated bounding-box corners.
 for(const p of a.parts){const pos=p.geometry.attributes.position;for(let i=0;i<pos.count;i++){const q=vec().fromBufferAttribute(pos,i).applyMatrix4(p.matrixWorld);assert.ok(q.y>=-1e-6,p.name+' penetrates floor');}}
}));

test('intact side windows stay in front of the hull; missing wreck glazing exposes the cabin',()=>{
 withModel('intact',a=>{
  const cabin=a.root.getObjectByName('Cabin assembly');
  for(const s of [-1,1])for(const x of [.48,.72,1.04,1.26]){
   const origin=cabin.localToWorld(vec(x,1.34,s*2)),direction=vec(0,0,-s),hits=new T.Raycaster(origin,direction).intersectObjects(a.parts);
   assert.ok(hits.length);assert.ok(hits[0].object.name.includes('Pilot side'),x+' '+s+' '+hits[0]?.object.name);
  }
 });
 withModel('crashed',a=>{
  const cabin=a.root.getObjectByName('Cabin assembly'),origin=cabin.localToWorld(vec(.62,1.48,2)),direction=vec(0,0,-1).transformDirection(cabin.matrixWorld),hits=new T.Raycaster(origin,direction).intersectObjects(a.parts);
  assert.ok(hits.length);assert.notEqual(hits[0].object.name,'Fuselage shell');assert.ok(hits[0].distance>1.35,'solid exterior still covers missing right pilot pane');
 });
});

test('rotating and translating the asset preserves its native dimensions and grounded local origin',()=>withModel('crashed',a=>{
 const initial=box(a.root).getSize(vec());a.root.rotation.y=Math.PI/2;a.root.position.set(11,2,-4);const b=box(a.root),after=b.getSize(vec());near(after.x,initial.z);near(after.z,initial.x);near(after.y,initial.y);near(b.min.y,2);assert.deepEqual(a.root.scale.toArray(),[1,1,1]);
}));

test('grey toggles reuse geometry; disposal is idempotent and leaves borrowed atlas ownership intact',()=>withModel('intact',(a,atlas)=>{
 let td=0;atlas.addEventListener('dispose',()=>td++);const geos=new Set(a.parts.map(p=>p.geometry)),mats=new Set(a.parts.map(p=>p.material)),counts=new Map();
 for(const g of geos){counts.set(g,0);g.addEventListener('dispose',()=>counts.set(g,counts.get(g)+1));}
 a.setGrey(true);const grey=a.parts[0].material;assert.ok(a.parts.every(p=>p.material===grey&&p.material.map===null));mats.add(grey);
 for(const m of mats){counts.set(m,0);m.addEventListener('dispose',()=>counts.set(m,counts.get(m)+1));}
 for(let i=0;i<10;i++){a.setGrey(true);a.setGrey(false);}assert.ok(a.parts.every(p=>p.material.map===atlas));assert.deepEqual(new Set(a.parts.map(p=>p.geometry)),geos);
 const parent=new T.Group();parent.add(a.root);a.dispose();a.dispose();assert.equal(a.root.parent,null);assert.ok([...counts.values()].every(n=>n===1));assert.equal(td,0);assert.throws(()=>a.setGrey(true),/disposed/);
}));

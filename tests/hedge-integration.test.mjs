import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/tactics/vendor/three.module.js';
import {blankMap,parseMap,passable,canStep,validateMap} from '../dist/tactics/core/maps.js';
import {createGame,zoneVisible,refresh} from '../dist/tactics/core/engine.js';
import {traceProjectile} from '../dist/tactics/core/projectiles.js';
import {terrainVisibility} from '../dist/tactics/core/visibility.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
import {extractBlock,placeBlock,validateBlock} from '../dist/tactics/core/blocks.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {synchronizeFoliage,traceFoliage} from '../dist/tactics/foliage-obstacles.js';
import {buildWorld,traceWorld} from '../dist/tactics/hybrid-world.js';
import {environmentVisuals} from '../dist/tactics/environment-visuals.js';
import {createPaintedHedges} from '../dist/tactics/painted-hedges.js';
import {hedgeGroups,isHedge} from '../dist/tactics/hedge-data.js';
import {HedgeScene} from '../dist/tactics/hedge-scene.js';
import {hedgeFixtureMap} from '../dist/tactics/hedge-fixture.js';

const row=(kind='tall',level=0)=>{const m=blankMap('Hedge test');for(let y=8;y<=19;y++){if(y===15)continue;if(level)m.upper[level-1]['10,'+y]='ground-grass';m.props.push({kind:'hedge-'+kind,x:10,y,z:level,hedgeSeed:173,hedgeVersion:1});}return m;};
const ray=(m,h=1.5,y=12,purpose='sight')=>traceFoliage(synchronizeFoliage(m),[8,h,y],[12,h,y],purpose,'world');

test('short and tall hedges block their cells, leave a gate, and do not allow a diagonal corner shortcut',()=>{
 for(const kind of ['short','tall']){const m=row(kind);assert.equal(passable(m,{x:10,y:12}),false);assert.equal(passable(m,{x:10,y:15}),true);assert.equal(canStep(m,{x:9,y:14},{x:10,y:15}),false);assert.equal(canStep(m,{x:9,y:15},{x:10,y:15}),true);assert.equal(canStep(m,{x:9,y:12},{x:10,y:12}),false);assert.equal(canStep(m,{x:9,y:14},{x:11,y:15}),false);}
});
test('tall hedges screen live detection, target zones and terrain fog; the gap is clear',()=>{
 const s=createGame(3,row(),false),a={...s.units[0],x:9,y:12,z:0,cone:360,heading:0},target={x:11,y:12,z:0,hp:100};s.units=[a];
 for(const stance of ['standing','kneeling','prone'])for(const zone of ['head','torso','legs'])assert.equal(zoneVisible(s,a,{...target,stance},zone),false,stance+'/'+zone);
 assert.equal(terrainVisibility(s,[a]).has('11,12'),false);
 assert.equal(zoneVisible(s,{...a,y:15},{...target,y:15},'torso'),true);
 assert.equal(traceProjectile(s,a,{x:9,y:12,h:1.6},{x:1,y:0,h:0},2,{purpose:'sight'}).kind,'cover');
 assert.equal(traceProjectile(s,a,{x:9,y:12,h:1.6},{x:1,y:0,h:0},2).kind,'range','leaves conceal but do not silently become bulletproof');
});
test('finite heights: short hedges screen low rays, tall hedges screen standing rays, elevated views clear both',()=>{
 const short=row('short'),tall=row();assert.ok(ray(short,.6));assert.equal(ray(short,1.5),null);assert.ok(ray(tall,1.5));assert.equal(ray(tall,2.7),null);
 for(const m of [short,tall])for(const y of [14.501,15,15.499])assert.equal(ray(m,.6,y),null,'full omitted tile is open');
 assert.equal(traceFoliage(synchronizeFoliage(tall),[10,.5,12],[10.1,.5,12],'sight','world')?.t,0,'an origin inside the hedge is blocked too');
});
test('shared mesh and pure collision agree at caps, joins, mixed heights and across chunk boundaries',()=>{
 const m=row();for(let x=11;x<19;x++)m.props.push({kind:x<14?'hedge-short':'hedge-tall',x,y:17,z:0});
 const group=hedgeGroups(m)[0],model=createPaintedHedges(group.cells),scene=synchronizeFoliage(m);model.root.updateMatrixWorld(true);
 try{for(const purpose of ['sight','shot'])for(const h of [.19,.57,.83,1.19,1.65,2.45])for(let y=7.7;y<19.5;y+=.37)for(const reverse of [false,true]){
  const start=reverse?[20,h,y]:[8,h,y],end=reverse?[8,h,y]:[20,h,y],direction=new T.Vector3(...end).sub(new T.Vector3(...start)),length=direction.length(),r=new T.Raycaster(new T.Vector3(...start),direction.normalize(),0,length),layers=purpose==='sight'?['core','wood']:['wood'];
  const hit=r.intersectObjects(model.root.children.filter(o=>layers.includes(o.userData.layer)))[0],actual=traceFoliage(scene,start,end,purpose,'world');
  assert.equal(!!actual,!!hit,`${purpose} ${h}/${y}/${reverse}`);if(hit)assert.ok(Math.abs(actual.t*length-hit.distance)<1e-4);
 }}finally{model.dispose();}
});
test('upper floors and full cliff ledges use the matching simulation and presentation heights',()=>{
 for(const level of [1,2]){const m=row('tall',level);assert.ok(ray(m,level*2.12+1.4));assert.equal(ray(m,1.5),null);const scene=synchronizeFoliage(m);assert.ok(traceFoliage(scene,[8,level*3+1.5,12],[12,level*3+1.5,12],'sight'));}
 const m=row('tall',1);m.props.push({kind:'cliff-ledge',x:10,y:12,z:0,cliffMask:15});const cell=synchronizeFoliage(m).worldBoxes.find(b=>b.id==='hedge:10,12,1:leaves');assert.ok(cell.min[1]>=2&&cell.min[1]<2.2);
 // Same x/y on a different floor is a separate run, not a duplicate plan cell.
 m.props.push({kind:'hedge-short',x:10,y:13,z:0});assert.ok(ray(m,.6,13));assert.ok(ray(m,3.5,13));
});
test('editor drag, preview, undo, erase, map/block imports and encounter saves preserve hedge metadata',()=>{
 const d=new EditingDocument().open(JSON.stringify(blankMap())),command={tool:'prop',start:{x:12,y:12,z:0},end:{x:16,y:12,z:0},options:{propKind:'hedge-tall',hedgeSeed:718}};
 const preview=d.preview(command);assert.ok(preview.ok,preview.error);assert.equal(preview.cells.length,5);assert.equal(d.map.props.length,0);assert.equal(preview.hedgePreview,true);
 assert.ok(d.apply(command).ok);const saved=d.export();assert.equal(d.map.props.length,5);assert.equal(d.map.props[0].hedgeSeed,718);assert.equal(d.map.props[0].hedgeVersion,1);
 assert.ok(d.undo());assert.equal(d.map.props.length,0);assert.ok(d.redo());assert.equal(d.export(),saved);assert.deepEqual(parseMap(saved),d.map);
 assert.ok(d.rotate({type:'prop',data:d.map.props[0]}).ok);assert.equal(d.map.props.at(-1).hedgeSeed,718);
 const block=extractBlock(d.map);assert.equal(validateBlock(block),block);const placed=placeBlock(blankMap(),block,2,2);assert.ok(placed.props.some(p=>p.x===60&&p.y===60&&p.hedgeSeed===718));
 const s=createGame(3,d.map,false);startEncounterClock(s);assert.deepEqual(restoreEncounter(captureEncounter(s)).props,s.props);
 assert.ok(d.apply({...command,options:{propKind:'hedge-short'}}).ok);assert.equal(d.map.props.length,5);assert.ok(d.map.props.every(p=>p.kind==='hedge-short'&&p.hedgeSeed===718),'repainting joins retains the planting seed');
 assert.ok(d.apply({tool:'erase-prop',start:{x:13,y:12,z:0},end:{x:15,y:12,z:0}}).ok);assert.equal(d.map.props.length,2);
 for(const patch of [{hedgeVersion:2},{hedgeSeed:NaN},{hedgeSeed:-1},{hedgeSeed:'173'}]){const bad=structuredClone(d.map);Object.assign(bad.props[0],patch);assert.throws(()=>parseMap(JSON.stringify(bad)),/hedge/i);}
});
test('edits and removal refresh cached sight, while unrelated live state changes reuse it',()=>{
 const s=createGame(1,row(),false),before=synchronizeFoliage(s);s.units[0].ap--;s.seed++;assert.equal(synchronizeFoliage(s),before);
 s.props=s.props.filter(p=>p.y!==12);refresh(s);assert.notEqual(synchronizeFoliage(s),before);assert.equal(ray(s),null);
 const world=buildWorld(s);assert.equal(traceWorld(world,[8,1.5,12],[12,1.5,12],{filter:b=>b.blocksSight!==false}),null);
 assert.ok(!environmentVisuals(world,s).some(b=>b.material?.startsWith('hedge-')),'no generic box is drawn over the painted hedge');
});
test('render batches retain geometry across camera/fog changes and rebuild only edited chunks and join neighbors',()=>{
 const m=row();for(let x=30;x<48;x++)m.props.push({kind:'hedge-tall',x,y:12,z:0});
 const scene=new HedgeScene(new T.Group(),{});scene.ready=true;
 try{
  scene.rebuild(m,null,3,{editor:true});const builds=scene.builds,old=new Map([...scene.items].map(([k,v])=>[k,v.model]));
  const camera=new T.OrthographicCamera();camera.position.set(30,20,30);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  scene.rebuild(m,new Set(['10,12']),3);scene.update(camera,new T.Vector3(),8,[]);assert.equal(scene.builds,builds);
  for(const [k,item]of scene.items){assert.equal(item.model,old.get(k));for(const mesh of item.model.root.children)assert.equal(mesh.castShadow,false);}
  const layer=scene.layers.get(0);assert.equal(layer.texture.image.data[12*240+10],255);assert.equal(layer.texture.image.data[13*240+10],0);
  m.props=m.props.filter(p=>!(p.x===31&&p.y===12));scene.rebuild(m,null,3,{editor:true});assert.equal(scene.items.get('0:0,0').model,old.get('0:0,0'));assert.notEqual(scene.items.get('0:1,0').model,old.get('0:1,0'));assert.notEqual(scene.items.get('0:2,0').model,old.get('0:2,0'));
  const count=scene.cutaway.depthMaterials.size;for(let i=0;i<4;i++){m.props.find(p=>p.x===30).hedgeSeed=i;scene.rebuild(m,null,3,{editor:true});}assert.equal(scene.cutaway.depthMaterials.size,count);
 }finally{scene.dispose();}assert.equal(scene.items.size,0);assert.equal(scene.cutaway.depthMaterials.size,0);
});
test('review map is valid and uses real editor/game props on both floors',()=>{
 const m=hedgeFixtureMap();assert.deepEqual(validateMap(m),[]);assert.ok(m.props.some(p=>isHedge(p)&&p.z===1));assert.deepEqual(parseMap(JSON.stringify(m)),m);
});

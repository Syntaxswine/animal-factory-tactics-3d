import test from 'node:test';
import assert from 'node:assert/strict';
import {ENVIRONMENT_IDS,environmentSelection,generateEnvironments,environmentMix,environmentSummary,environmentErrors,environmentCoverageErrors,localEnvironmentProfile,localEnvironmentMix,localEnvironmentErrors} from '../dist/tactics/environment-regions.js';
import {EnvironmentPaint,environmentPixels} from '../dist/tactics/environment-paint.js';
import {environmentPreviewMap,environmentPreviewKey} from '../dist/tactics/environment-preview.js';
import {blank,SketchDocument,validate,tutorialCells,placeTutorial} from '../dist/tactics/overmap-model.js';
import {generateWorld} from '../dist/tactics/overmap-generator.js';
import {blankMap,parseMap} from '../dist/tactics/core/maps.js';
import {createGame} from '../dist/tactics/core/engine.js';
import {startEncounterClock} from '../dist/tactics/encounter-clock.js';
import {captureEncounter,restoreEncounter} from '../dist/tactics/encounter-save.js';
import {createCampaign,activeState,openCampaignSector} from '../dist/tactics/campaign-model.js';
import {openingContent} from '../dist/tactics/campaign-opening.js';
import {captureCampaign,restoreCampaign} from '../dist/tactics/campaign-save.js';

test('all counts are approximately equally likely; every family can be the only family',()=>{
 const counts=[0,0,0,0,0],singles=new Set();
 for(let seed=0;seed<10000;seed++){
  const families=environmentSelection(seed);counts[families.length-1]++;
  assert.equal(new Set(families).size,families.length);
  if(families.length===1)singles.add(families[0]);
 }
 for(const count of counts)assert.ok(count>1800&&count<2200,String(count));
 assert.deepEqual([...singles].sort(),[...ENVIRONMENT_IDS].sort());
});
test('regions are reproducible, include exactly the chosen families, and have uneven coverage',()=>{
 const map=blank(),sizes=new Set(),repeated=new Set();
 for(let seed=0;seed<100;seed++){
  const f=generateEnvironments(map,seed);assert.deepEqual(f,generateEnvironments(map,seed));
  assert.deepEqual(environmentErrors(f),[]);assert.deepEqual(environmentCoverageErrors(f),[],String(seed));
  assert.deepEqual([...new Set(f.regions.map(p=>p.family))].sort(),[...f.families].sort());
  const report=environmentSummary(f);assert.ok(Math.abs(report.reduce((n,p)=>n+p.percent,0)-100)<1e-7);
  if(f.families.length>1){sizes.add(Math.round(report[0].percent));if(f.regions.length>f.families.length)repeated.add(seed);}
 }
 assert.ok(sizes.size>20);assert.ok(repeated.size>20);
});
test('local edge samples, corners, and painted texture edges agree across sectors',()=>{
 const f=generateEnvironments(blank(),1);
 for(const index of [31,132,223,354]){
  const a=localEnvironmentProfile(f,index),east=localEnvironmentProfile(f,index+1),south=localEnvironmentProfile(f,index+30);
  for(let n=0;n<=240;n+=3){assert.deepEqual(localEnvironmentMix(a,240,n),localEnvironmentMix(east,0,n));assert.deepEqual(localEnvironmentMix(a,n,240),localEnvironmentMix(south,n,0));}
  for(const kind of ['ground','foliage']){
   const p=environmentPixels(a,kind),q=environmentPixels(east,kind),s=environmentPixels(south,kind),w=p.width;
   for(let n=0;n<w;n++){assert.deepEqual(p.data.slice((n*w+w-1)*4,(n*w+w)*4),q.data.slice(n*w*4,(n*w+1)*4));assert.deepEqual(p.data.slice(((w-1)*w+n)*4,((w-1)*w+n+1)*4),s.data.slice(n*4,n*4+4));}
  }
 }
});
test('single-family regions include the tutorial and do not create another default family',()=>{
 const one=ENVIRONMENT_IDS.map(f=>{let seed=0;while(environmentSelection(seed).length!==1||environmentSelection(seed)[0]!==f)seed++;return seed;});
 for(const seed of one){const world=generateWorld(seed),p=world.tutorialPlacement;
  for(const c of tutorialCells(p.x,p.y,p.rotation))assert.deepEqual(environmentMix(world.environments,c.x+.5,c.y+.5),[{family:world.environments.families[0],weight:1}]);
 }
});
test('sketch save, import, tutorial relocation and undo preserve world-space environments',()=>{
 const a=generateWorld(1),b=generateWorld(5),doc=new SketchDocument(a);doc.replace(b);doc.undo();assert.deepEqual(doc.map,a);doc.redo();assert.deepEqual(doc.map,b);
 assert.deepEqual(validate(JSON.parse(JSON.stringify(a))).environments,a.environments);
 assert.deepEqual(placeTutorial(a,4,4,90).environments,a.environments);
 const legacy=structuredClone(a);delete legacy.environments;assert.doesNotThrow(()=>validate(legacy));
 for(const patch of [f=>f.version=2,f=>f.seed=-1,f=>f.families.push('lava'),f=>f.regions[0].scale=0,f=>f.regions[0].x=Infinity,f=>f.regions=[],f=>f.families=['snow','snow']]){
  const bad=structuredClone(a);patch(bad.environments);assert.throws(()=>doc.replace(bad),/environment/);assert.deepEqual(doc.map,b);
 }
});
test('local profiles survive map parsing and encounter saves without changing terrain or foliage rules',()=>{
 const map=environmentPreviewMap(generateEnvironments(blank(),1),70),before=structuredClone(map),loaded=parseMap(JSON.stringify(map));
 assert.deepEqual(loaded,before);assert.ok(Object.values(map.foliage).every(v=>v[0]===65));assert.ok(Object.values(map.foliage).some(v=>v[1]));assert.ok(Object.values(map.foliage).some(v=>!v[1]));
 const state=createGame(7,loaded,false,'easy',{awareness:true,statSystem:true});assert.deepEqual(state.environment,map.environment);
 startEncounterClock(state);const saved=restoreEncounter(structuredClone(captureEncounter(state)));assert.deepEqual(saved.environment,map.environment);assert.deepEqual(saved.map,map.terrain);assert.deepEqual(saved.foliage,map.foliage);
 for(const profile of [null,{...map.environment,origin:[30,1]},{...map.environment,origin:[1.5,2]},{...map.environment,field:undefined}]){
  const bad={...map,environment:profile};assert.ok(localEnvironmentErrors(bad).length);assert.throws(()=>parseMap(JSON.stringify(bad)),/environment/i);
 }
 const older=blankMap('Old ground');assert.doesNotThrow(()=>parseMap(JSON.stringify(older)));assert.equal(older.environment,undefined);
});
test('new campaigns attach environmental appearance without changing authored maps or saved campaigns',()=>{
 const content=openingContent(),before=structuredClone(content.assignments),campaign=createCampaign(content,{id:'environment-test'});
 assert.deepEqual(content.assignments,before);
 for(const [index,a]of Object.entries(campaign.assignments)){assert.deepEqual(a.map.terrain,before[index].map.terrain);assert.deepEqual(a.map.props,before[index].map.props);assert.deepEqual(a.map.starts,before[index].map.starts);assert.deepEqual(a.map.environment.origin,[+index%30,Math.floor(+index/30)]);}
 const restored=restoreCampaign(structuredClone(captureCampaign(campaign)));assert.deepEqual(restored.assignments,campaign.assignments);
 openCampaignSector(restored,content.start);assert.deepEqual(activeState(restored).environment,restored.assignments[content.start].map.environment);
 const bad=structuredClone(captureCampaign(campaign));bad.data.overmap.environments.regions[0].family='missing';assert.throws(()=>restoreCampaign(bad),/damaged/);
 delete content.overmap.environments;const old=createCampaign(content,{id:'legacy-environment-test'});assert.equal(old.assignments[content.start].map.environment,undefined);assert.doesNotThrow(()=>restoreCampaign(captureCampaign(old)));
});
test('palette switches update cached uniforms and release replaced textures',()=>{
 const paint=new EnvironmentPaint(),a=environmentPreviewMap(generateEnvironments(blank(),5),31),b=environmentPreviewMap(generateEnvironments(blank(),1),31);
 paint.setMap(a);const first=paint.ground.value;let disposed=false;first.addEventListener('dispose',()=>disposed=true);
 paint.setMap(a);assert.equal(paint.ground.value,first);paint.setMap(b);assert.equal(disposed,true);assert.notEqual(paint.ground.value,first);assert.equal(paint.enabled.value,1);
 paint.setMap({});assert.equal(paint.enabled.value,0);assert.equal(paint.ground.value,null);paint.dispose();
});
test('preview identities distinguish sectors and seeds and reject mismatched or invalid input',()=>{
 const a=generateEnvironments(blank(),1),b=generateEnvironments(blank(),5);
 assert.notEqual(environmentPreviewKey(a,31),environmentPreviewKey(a,32));assert.notEqual(environmentPreviewKey(a,31),environmentPreviewKey(b,31));
 assert.throws(()=>environmentPreviewMap(a,450),/sector/);assert.throws(()=>environmentPreviewMap({...a,version:2},31),/environment/);
});

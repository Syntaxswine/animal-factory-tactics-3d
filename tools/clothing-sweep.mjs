// The clothing census (clothing-census.mjs) through the game's own motions on one character, built as the battle renderer
// builds it: create(), the battle posture's permanent edits, locomotion, the census read on that rest pose. Each finding
// is filed by its part pair and where it lies on the body at rest (neck, arm, torso, legs), so two runs (another checkout
// with --root, say main before a change) can be compared pair by pair. Most of what any run finds is the poses' own
// (a carried rifle's forearm against the bib, cloth folding at a kneel); a comparison shows what a change moved.
//   node tools/clothing-sweep.mjs <species> [stance,walk,aim,throw,fire,mantle,descent,ladder,draw] [--focus neck|arms] [--root <checkout>] [--out <file.json>]
//   node tools/clothing-sweep.mjs --compare <before.json> <after.json> [motion|all] [neck|arm|torso|legs]
import fs from 'node:fs';import {pathToFileURL,fileURLToPath} from 'node:url';
const args=process.argv.slice(2),opt=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
if(args[0]==='--compare'){
 // each part pair (and region), before and after: frames with a finding and the deepest ("inf": past the census's reach)
 const [A,B]=args.slice(1,3).map(f=>JSON.parse(fs.readFileSync(f,'utf8'))),[M,R]=args.slice(3),mm=x=>x===null||x===undefined?'  inf':(x*1000).toFixed(1).padStart(5),depth=v=>v===null?1:v||0;
 for(const m of Object.keys(B.motions)){if(M&&M!=='all'&&m!==M)continue;const a=A.motions[m]||{pairs:{},frames:0},b=B.motions[m];console.log(`== ${m}: frames ${a.frames} / ${b.frames}; with findings ${a.bad} -> ${b.bad}`);
  const rows=[...new Set([...Object.keys(a.pairs||{}),...Object.keys(b.pairs||{})])].filter(k=>!R||k.endsWith('@'+R)).map(k=>({k,x:a.pairs[k],y:b.pairs[k]})).sort((p,q)=>Math.max(depth(q.x?.max),depth(q.y?.max))-Math.max(depth(p.x?.max),depth(p.y?.max)));
  for(const {k,x,y} of rows)console.log(`  ${String(x?.frames||0).padStart(3)} fr ${x?mm(x.max):'    -'} mm -> ${String(y?.frames||0).padStart(3)} fr ${y?mm(y.max):'    -'} mm  ${k}`);}
 process.exit(0);}
const species=args[0],motions=(args[1]&&!args[1].startsWith('--')?args[1]:'stance,walk,aim,throw,fire,mantle,descent,ladder,draw').split(',');
const FOCUS=opt('--focus')||'all',OUT=opt('--out'),ROOT=opt('--root')?opt('--root').replace(/[\\/]*$/,'/'):fileURLToPath(new URL('../',import.meta.url)),imp=f=>import(pathToFileURL(ROOT+f).href);
const T=await imp('dist/tactics/vendor/three.module.js'),{ANIMAL_MOTION_CATALOG}=await imp('dist/tactics/animal-motion-catalog.js');
const {createBattlePosture}=await imp('dist/tactics/battle-posture.js'),{createWorkerLocomotion}=await imp('dist/tactics/worker-locomotion.js'),{createRifleFiring}=await imp('dist/tactics/rifle-firing.js'),{createWeaponModel}=await imp('dist/tactics/weapon-models.js');
const {createGrenadeThrow,GRENADE_THROW}=await imp('dist/tactics/grenade-throw-motion.js'),{createGrenadeModel}=await imp('dist/tactics/grenade-model.js'),{createPaintedFireMotion}=await imp('dist/tactics/painted-fire-motion.js');
const {createRoofMantle}=await imp('dist/tactics/roof-mantle.js'),{createLedgeDescent}=await imp('dist/tactics/ledge-descent.js'),{createLadderMotion,LADDER_PRESETS,WIDE_LADDER_EXIT}=await imp('dist/tactics/ladder-motion.js'),{createEquipmentDraw}=await imp('dist/tactics/equipment-draw.js');
const {census}=await import(new URL('./clothing-census.mjs',import.meta.url));
const p=ANIMAL_MOTION_CATALOG.find(q=>q.id===species);if(!p||p.unarmed)throw Error('Not a catalog mammal: '+species);
function build(weapon='rifle'){const w=p.create(JSON.parse(fs.readFileSync(ROOT+'dist/tactics/'+p.file,'utf8'))),posture=createBattlePosture(w,p),loc=createWorkerLocomotion(w,p);let gun=null;if(weapon){gun=createWeaponModel(weapon);w.equipWeapon(gun);}
 w.pose('neutral');w.root.updateMatrixWorld(true);
 // where a rest point is on the body: an arm (within 7 cm of its bones), the neck (above the shoulders, inside them), the
 // legs (below the hips) or the torso; --focus neck or arms reads only that much of the body
 const at=n=>w.bones.find(b=>b.name===n).getWorldPosition(new T.Vector3()),seg=(q,a,b)=>{const ab=b.clone().sub(a),t=Math.max(0,Math.min(1,q.clone().sub(a).dot(ab)/ab.lengthSq()));return q.distanceTo(a.clone().addScaledVector(ab,t));};
 const sh=(at('upperArm-1').y+at('upperArm1').y)/2,sz=Math.min(Math.abs(at('upperArm-1').z),Math.abs(at('upperArm1').z)),hy=at('hips').y,arms=[-1,1].map(k=>[at('upperArm'+k),at('forearm'+k),at('hand'+k),at('fingers'+k)]);
 const armDist=r=>{const q=new T.Vector3(...r);return Math.min(...arms.map(([u,f,h,g])=>Math.min(seg(q,u,f),seg(q,f,h),seg(q,h,g))));};
 const now=census(w,{focus:FOCUS==='neck'?r=>r[1]>sh-.08&&Math.abs(r[2])<sz-.02:FOCUS==='arms'?r=>armDist(r)<.14:null});
 const region=r=>armDist(r)<.07?'arm':r[1]>sh-.03&&Math.abs(r[2])<sz-.03?'neck':r[1]<hy-.06?'legs':'torso';
 return {w,posture,loc,gun,now,region,dispose(){loc.dispose?.();gun?.dispose?.();w.skeleton?.dispose?.();w.dispose();}};}
const report={species,root:ROOT,focus:FOCUS,motions:{}};
function measure(rec,label,b){rec.frames++;const r=b.now();if(!r.found.length)return;rec.bad++;
 for(const f of r.found){const k=(f.kind==='self'?f.part+' through itself':f.part+' into '+f.into)+' @'+b.region(f.rest),e=rec.pairs[k]??={frames:new Set(),max:0,at:null};e.frames.add(label);if(f.depth>e.max){e.max=f.depth;e.at=label;}if(f.depth>rec.max){rec.max=f.depth;rec.at=label;rec.what=k;}}}
function run(name,weapon,drive){const rec={frames:0,bad:0,max:0,at:null,what:null,pairs:{},error:null},t0=performance.now();let b;
 try{b=build(weapon);drive(b,label=>measure(rec,label,b));}catch(e){rec.error=String(e.stack||e).split('\n').slice(0,3).join(' | ');}finally{try{b?.dispose();}catch{}}
 for(const e of Object.values(rec.pairs))e.frames=e.frames.size;rec.seconds=+((performance.now()-t0)/1000).toFixed(1);report.motions[name]=rec;
 console.log(`${species} ${name}: ${rec.frames} frames, ${rec.bad} with findings, deepest ${(rec.max*1000).toFixed(1)} mm${rec.what?' ('+rec.what+' at '+rec.at+')':''}${rec.error?' ERROR '+rec.error:''} [${rec.seconds} s]`);}
const stand=(b,pose,extra={})=>{const sample={pose,heading:0,distance:0,blend:0,...extra};b.loc.apply({...sample,blend:pose.prone||pose.down?0:sample.blend});b.posture.apply(sample);if(Object.values(pose).some(v=>v>0))b.posture.ground();};
const DRIVES={
 stance:['rifle',(b,m)=>{for(const [l,pose] of [['stand',{}],['kneel',{kneel:1}],['prone',{prone:1}],['down',{down:1,stable:1}],['dead',{dead:1}]]){stand(b,pose);m(l);}
  for(const [l,k] of [['kneel','kneel'],['prone','prone']])for(const f of [.25,.5,.75]){stand(b,{[k]:f});m(l+' '+f);}}],
 walk:['rifle',(b,m)=>{for(let d=0;d<=2.0001;d+=.05){stand(b,{},{distance:d,blend:1});m('d '+d.toFixed(2));}}],
 aim:['rifle',(b,m)=>{const f=createRifleFiring(b.w,p,b.posture);
  for(const [l,pose] of [['stand',{}],['kneel',{kneel:1}],['prone',{prone:1}]])for(const bearing of [-60,-30,0,30,60])for(const h of [.48,2.5,-1]){if(pose.prone&&h!==.48)continue;const a=bearing*Math.PI/180,target=new T.Vector3(8*Math.cos(a),h,8*Math.sin(a));
   for(const recoil of [0,1]){if(f.apply({aim:1,recoil,target,sample:{pose,heading:0,distance:0,blend:0}})?.supported===false)continue;m(`${l} ${bearing}/${h} r${recoil}`);}}}],
 throw:[null,(b,m)=>{const g=createGrenadeModel(),mo=createGrenadeThrow(b.w,g,{animal:p.id});try{for(let i=0;i<=Math.round(GRENADE_THROW.duration*30);i++){mo.at(i/30);m('t '+(i/30).toFixed(2));}}finally{mo.dispose();g.dispose?.();}}],
 fire:['flamethrower',(b,m)=>{const mo=createPaintedFireMotion(b.w,p);try{for(let t=0;t<=2.15001;t+=.05){mo.fire(t);m('t '+t.toFixed(2));}}finally{mo.dispose();}}],
 mantle:['rifle',(b,m)=>{const mo=createRoofMantle(b.w,p);try{for(let i=0;i<=100;i++){mo.apply(i/100);m('u '+(i/100).toFixed(2));}}finally{mo.dispose();}}],
 descent:['rifle',(b,m)=>{const mo=createLedgeDescent(b.w,p);try{for(let i=0;i<=60;i++){mo.apply(i/60);m('u '+(i/60).toFixed(3));}}finally{mo.dispose();}}],
 ladder:['rifle',(b,m)=>{const mo=createLadderMotion(b.w,p,{...LADDER_PRESETS.floor,...(p.id.startsWith('pig')?{exitWidth:WIDE_LADDER_EXIT}:{})});try{for(let i=0;i<=100;i++){mo.apply(i/100);m('u '+(i/100).toFixed(2));}}finally{mo.dispose();}}],
 draw:['rifle',(b,m)=>{const mo=createEquipmentDraw(b.w,p);try{for(let i=0;i<=20;i++){mo.apply(i/20);m('u '+(i/20).toFixed(2));}}finally{mo.dispose();}}]};
for(const name of motions){if(!DRIVES[name])throw Error('Unknown motion '+name+': one of '+Object.keys(DRIVES).join(', '));run(name,...DRIVES[name]);}
if(OUT)fs.writeFileSync(OUT,JSON.stringify(report,null,1));

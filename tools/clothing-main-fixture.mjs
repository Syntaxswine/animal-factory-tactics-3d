// What the characters do that the layer fit (horse-light-model.js, docs/tactics/CLOTHING-SKINNING.md) must leave as main
// had it, read from any checkout: per mammal, a hash of every skin weight as the parts' names give them (the fitted
// vertices read from userData.layerFit), a hash of every arm weight as drawn, the bones after the battle posture settles
// four fallen poses, the burning fire's cards, and the idle's seed-1 looks. tests/clothing-layers.test.mjs compares the
// branch with tests/fixtures/clothing-main.json, made by this from main (b546dfb):
//   node tools/clothing-main-fixture.mjs <checkout> > tests/fixtures/clothing-main.json
import fs from 'node:fs';import {pathToFileURL,fileURLToPath} from 'node:url';
const hash=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,'0');};
const round=(x,n=5)=>+x.toFixed(n);
export async function snapshot(root=fileURLToPath(new URL('../',import.meta.url))){root=root.replace(/[\\/]*$/,'/');const imp=f=>import(pathToFileURL(root+'dist/tactics/'+f).href);
 const T=await imp('vendor/three.module.js'),{ANIMAL_MOTION_CATALOG}=await imp('animal-motion-catalog.js'),{createBattlePosture}=await imp('battle-posture.js'),{createWorkerLocomotion}=await imp('worker-locomotion.js'),{createWeaponModel}=await imp('weapon-models.js'),{fireBodyZones}=await imp('painted-fire-zones.js'),{createIdle}=await imp('idle-motion.js');
 const out={};
 for(const p of ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed)){const make=()=>p.create(JSON.parse(fs.readFileSync(root+'dist/tactics/'+p.file,'utf8')));const w=make(),row={named:[],arms:[]};
  // weights, slot-free: each vertex's bones and weights (to 1e-6); the arm weights alone as the GPU draws them
  for(const m of w.parts){const g=m.geometry,a=g.attributes,f=g.userData.layerFit,plain=new Map();if(f)f.vertices.forEach((v,k)=>plain.set(v,k));let named='',arms='';
   for(let i=0;i<a.position.count;i++){const k=plain.get(i),n=new Map(),d=new Map();for(let j=0;j<4;j++){const bi=k===undefined?a.skinIndex.getComponent(i,j):f.index[4*k+j],wi=k===undefined?a.skinWeight.getComponent(i,j):f.weight[4*k+j];if(wi>0)n.set(bi,(n.get(bi)||0)+wi);const bj=a.skinIndex.getComponent(i,j),wj=a.skinWeight.getComponent(i,j);if(wj>0&&/upperArm|forearm|hand|fingers/.test(w.bones[bj].name))d.set(bj,(d.get(bj)||0)+wj);}
    named+=[...n].sort((x,y)=>x[0]-y[0]).map(([b,x])=>b+':'+x.toFixed(6)).join(',')+';';arms+=[...d].sort((x,y)=>x[0]-y[0]).map(([b,x])=>b+':'+x.toFixed(6)).join(',')+';';}
   row.named.push(m.name+' '+hash(named));row.arms.push(m.name+' '+hash(arms));}
  // the fallen poses the battle posture settles, with a rifle carried
  const posture=createBattlePosture(w,p),loc=createWorkerLocomotion(w,p);w.equipWeapon(createWeaponModel('rifle'));
  row.fallen=[{down:1,stable:1},{down:1},{down:.5},{dead:1}].map(pose=>{const s={pose,heading:0,distance:0,blend:0};loc.apply(s);posture.apply(s);posture.ground();w.root.updateMatrixWorld(true);return w.bones.map(b=>b.getWorldPosition(new T.Vector3()).toArray().map(x=>round(x)));});
  // the burning fire's cards, on a character standing at rest
  const z=make();z.pose('neutral');row.fire=fireBodyZones(z).map(c=>({of:c.bone?.name||c.part.name,min:c.box.min.toArray().map(x=>round(x)),max:c.box.max.toArray().map(x=>round(x)),width:round(c.width),height:round(c.height)}));
  // the idle's first seed
  const i=make(),idle=createIdle(i,{seed:1,eye:p.eye??null});row.looks=idle.schedule.looks.map(l=>[l.label,round(l.time,4),round(l.dur,4)]);idle.dispose();
  out[p.id]=row;[w,z,i].forEach(x=>x.dispose());}
 return out;}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])console.log(JSON.stringify(await snapshot(process.argv[2]),null,0).replace(/\},"/g,'},\n"'));

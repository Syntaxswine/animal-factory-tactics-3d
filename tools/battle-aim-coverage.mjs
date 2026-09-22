import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';
import {ANIMAL_MOTION_CATALOG as profiles} from '../dist/tactics/animal-motion-catalog.js';
import {createBattlePosture} from '../dist/tactics/battle-posture.js';
import {createRifleFiring} from '../dist/tactics/rifle-firing.js';
import {createWeaponModel} from '../dist/tactics/weapon-models.js';
const rows=[],coverage={};let worstAngle=0;
for(const p of profiles.filter(p=>!p.unarmed)){
 const w=p.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+p.file,import.meta.url)))),posture=createBattlePosture(w,p),f=createRifleFiring(w,p,posture);
 try{for(const weapon of ['rifle','assault','smg','shotgun','sniper']){
  const gun=createWeaponModel(weapon);w.equipWeapon(gun);
  try{for(const prone of [0,.25,.5,.75,1])for(const xyz of [[12,.48,0],[3,.4,2],[1,1.4,0],[2,3,0],[3,.05,-2]]){
   const target=new T.Vector3(...xyz),m=f.apply({aim:1,recoil:0,target,sample:{pose:{prone},heading:0,blend:0,distance:0}});
   const key=xyz.join();coverage[key]??={supported:0,unavailable:0};coverage[key][m.supported?'supported':'unavailable']++;
   if(m.supported)worstAngle=Math.max(worstAngle,m.direction.angleTo(target.clone().sub(m.origin)));
   rows.push({species:p.id,weapon,prone,target:xyz,supported:m.supported,reason:m.reason});
  }}finally{gun.dispose();}
 }}finally{w.dispose();}
}
const report={scope:'Geometric endpoint coverage, aim=1/recoil=0. Not an art approval or proof all these weapons fire through this controller in gameplay.',worstAngle,coverage,rows};
const out=new URL('../artifacts/battle-aim-reach/',import.meta.url);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('coverage.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:rows.length,worstAngle,coverage}));

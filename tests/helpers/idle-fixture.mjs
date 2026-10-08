import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createWeaponModel} from '../../dist/tactics/weapon-models.js';
import {createGrenadeModel} from '../../dist/tactics/grenade-model.js';
import {createArmedIdle} from '../../dist/tactics/armed-idle-motion.js';
const cache=new Map();
export function idleFixture(profile,id,fn){
 if(!cache.has(profile.id))cache.set(profile.id,JSON.parse(fs.readFileSync(new URL('../../dist/tactics/'+profile.file,import.meta.url))));
 const worker=profile.create(cache.get(profile.id)),weapon=id==='rifle'&&!profile.unarmed?worker.rifle:id==='grenade'?createGrenadeModel():createWeaponModel(id);
 worker.equipWeapon?.(weapon);
 const attributes=['position','normal','skinIndex','skinWeight','paintNormal'],original=worker.parts.map(p=>Object.fromEntries(attributes.map(k=>[k,p.geometry.attributes[k].array.slice()]))),parents=worker.bones.map(b=>b.parent);
 const carry=weapon.carry,mount=weapon.mount?.position.clone();let motion;
 try{motion=createArmedIdle(worker,profile,{weapon});fn({worker,weapon,motion});}
 finally{motion?.dispose();motion?.dispose();worker.parts.forEach((p,i)=>attributes.forEach(k=>assert.deepEqual(p.geometry.attributes[k].array,original[i][k],profile.id+' restores '+p.name+' '+k)));worker.bones.forEach((b,i)=>assert.equal(b.parent,parents[i]));assert.equal(weapon.carry,carry);if(mount)assert.ok(mount.distanceTo(weapon.mount.position)<1e-12);if(weapon!==worker.rifle)weapon.dispose();worker.skeleton.dispose();worker.dispose();}
}

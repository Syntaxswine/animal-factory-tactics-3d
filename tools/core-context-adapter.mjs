export const contextOverrides={
 'engine.js':'Context ground targeting permits ordinary firearms with normal AP, ammo and real projectile impacts.',
 'projectiles.js':'Terrain targets aim at the tile surface rather than a fictional torso.'
};
export function adaptCoreContext(name,data){
 if(!contextOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Context adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='engine.js'){
  s="import {previewGroundFire} from '../ground-fire.js';\n"+s;
  once("if(!Object.hasOwn(AIM_ZONES,zone))", "if(b.ground)return previewGroundFire(s,a,b,WEAPONS[a.weapon],combatCosts(s),burst,aimLevel);\n if(!Object.hasOwn(AIM_ZONES,zone))");
  once('if(ballistic&&!target.barrel&&!target.structure&&alive(target))','if(ballistic&&!target.ground&&!target.barrel&&!target.structure&&alive(target))');
  once("if(!WEAPONS[u?.weapon]?.blast&&!WEAPONS[u?.weapon]?.incendiary)return false;return attack(s,u,groundTarget(point));", "if(!WEAPONS[u?.weapon]?.mag)return false;return attack(s,u,groundTarget(point));");
 }else{
  once("=>u.barrel?.4:zone==='weapon'?", "=>u.ground?.04:u.barrel?.4:zone==='weapon'?");
 }
 return Buffer.from(s);
}

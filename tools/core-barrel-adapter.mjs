export const barrelOverrides={
 'environment.js':'Register a separate targetable explosive barrel without changing ordinary drums.',
 'engine.js':'Shoot explosive barrels with normal aim/AP/ammo; share tank blast rules and commit chained barrels once.',
 'projectiles.js':'Trace the actual explosive drum cylinder, including incidental misses and pellets.',
 'explosives.js':'Report exposed explosive barrels for the shared fuel-blast pipeline instead of silently deleting them.'
};
export function adaptCoreBarrels(name,data){
 if(!barrelOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Barrel adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='environment.js')s="import {EXPLOSIVE_BARREL,EXPLOSIVE_BARREL_RULE} from '../explosive-barrels.js';\n"+s+"\nPROPS[EXPLOSIVE_BARREL]={...EXPLOSIVE_BARREL_RULE};\n";
 if(name==='projectiles.js'){
  s="import {barrelRayHit,barrelId} from '../explosive-barrels.js';\n"+s;
  once("=>zone==='weapon'?", "=>u.barrel?.4:zone==='weapon'?");
  once('const impact=(kind,t,extra={})=>',`const barrelHit=barrelRayHit(state.props,origin,d,limit);let nearestProp=barrelHit?.prop;
 if(barrelHit){limit=barrelHit.distance;nearest=null;}
 const impact=(kind,t,extra={})=>`);
  once('limit=terrainHit;nearest=null;', 'limit=terrainHit;nearest=null;nearestProp=null;');
  if(s.split('prop?.solid&&prop.cover>0').length!==3)throw Error('Barrel cover anchors changed');
  s=s.replaceAll('prop?.solid&&prop.cover>0','prop?.solid&&!prop.explosive&&prop.cover>0');
  once('if(nearest){const result=',"if(nearestProp)return impact('prop',limit,{propId:barrelId(nearestProp),propKind:nearestProp.kind});\n if(nearest){const result=");
 }
 if(name==='explosives.js'){
  s="import {isExplosiveBarrel,barrelId} from '../explosive-barrels.js';\n"+s;
  once('target.ground?.08:1','target.ground?.08:target.barrel?.4:1');
  once('function blastClear(s,impact,end)', 'function blastClear(s,impact,end,propId=null)');
  once("return hit.kind==='range'||hit.distance>=length-.06;", "return propId!==null&&hit.propId===propId||hit.kind==='range'||hit.distance>=length-.06;");
  once('for(const prop of s.props){const cells=', 'for(const prop of s.props){if(isExplosiveBarrel(prop))continue;const cells=');
  once('return {hits,blast:',`const barrels=s.props.filter(isExplosiveBarrel).filter(p=>{
  const h=unitBaseHeight(p),dist=boxDistance(impact,p.x-.328,p.y-.328,h,p.x+.328,p.y+.328,h+.8);
  return dist<radius&&w.damage*(1-dist/radius)>=1&&blastClear(s,impact,{x:p.x,y:p.y,h:h+.4},barrelId(p));
 });
 return {hits,barrels,blast:`);
 }
 if(name==='engine.js'){
  s="import {presentBarrel,isExplosiveBarrel} from '../explosive-barrels.js';\nimport {previewBarrelAttack} from '../barrel-targeting.js';\nimport {applyFuelBlast,detonateBarrels,fuelBlastReaches} from '../fuel-blast.js';\n"+s;
  once('flamePreview,flameShape,flameVictims','flamePreview,flameShape,flameVictims,flameBarrels');
  once('if(WEAPONS[a.weapon].incendiary){',`if(b.barrel){
  if(!presentBarrel(s,b))return {ok:false,reason:'Barrel already destroyed'};
  if(WEAPONS[a.weapon].incendiary)return flamePreview(s,a,{...b,ground:true},WEAPONS[a.weapon],combatCosts(s));
  if(WEAPONS[a.weapon].blast)return explosivePreview(s,a,b,WEAPONS[a.weapon]);
  return previewBarrelAttack(s,a,b,WEAPONS[a.weapon],combatCosts(s),burst,aimLevel);
 }
 if(WEAPONS[a.weapon].incendiary){`);
  const start=s.indexOf('function explodeTanks('),end=s.indexOf('\nexport function attack(',start);
  if(start<0||end<0)throw Error('Tank function anchor changed');
  s=s.slice(0,start)+`const fuelHooks={damage:combatDamage,ignite,burn:recordBurn};
function explodeTanks(s,wearer,source=null){
 const wornWeapon=wearer.weapon;wearer.tanksExploded=true;wearer.ammo.flamethrower=0;
 wearer.pack=wearer.pack.filter(i=>i.kind!=='flamethrower');wearer.slots=wearer.slots.map(id=>id==='flamethrower'?null:id);
 if(wearer.weapon==='flamethrower')wearer.weapon='hands';wearer.overwatch=null;
 const result=applyFuelBlast(s,wearer,fuelHooks,source,wearer),receipt=recordBurn(s,wearer,'tank');receipt.weapon=wornWeapon;receipt.fires=result.fires;
 log(s,wearer.name+"'s fuel tanks exploded / "+result.victims.length+' caught in blast.');
 return {x:wearer.x,y:wearer.y,z:levelOf(wearer),h:unitBaseHeight(wearer)+.8,kind:'tank',unitId:wearer.id,fireSequence:receipt.sequence,burns:result.burns};
}
function appendBarrelBlasts(s,event,explosions,targets,source){
 const standing=s.units.filter(alive),blasts=detonateBarrels(s,targets,fuelHooks,source);
 for(const blast of blasts){event.hit=true;event.explosions.push(blast);explosions.push(blast);(event.burns??=[]).push(...blast.burns);log(s,'Explosive barrel detonated.');}
 for(const u of standing)if(!alive(u)&&!event.downed.includes(u.id))event.downed.push(u.id);
}
`+s.slice(end);
  once('if(!b.ground&&!inCone(b,a))','if(!b.ground&&!b.barrel&&!inCone(b,a))');
  once("id:'ground',name:'Terrain'", "barrel:false,id:'ground',name:'Terrain'");
  once('if(ballistic&&alive(target)){','if(ballistic&&!target.barrel&&alive(target)){');
  once('if(!victim&&!blastResult&&!pellets&&!flame){',`const barrelHits=[...(pellets||(shot?[shot]:[])).filter(p=>p.propId).map(p=>p.propId),...(blastResult?.barrels||[]),...(flame?flameBarrels(s,flame):[])];
  appendBarrelBlasts(s,event,explosions,barrelHits,shooter);
  if(!victim&&!blastResult&&!pellets&&!flame){`);
  once("log(s,\x60\x24{shooter.name} → \x24{target.name}: miss", "if(!event.hit)log(s,\x60\x24{shooter.name} → \x24{target.name}: miss");
  once('if(pellets){event.hit=pelletHits.length>0;', 'if(pellets){event.hit=event.hit||pelletHits.length>0;');
  once('if(flame&&!alive(victim)&&!incapacitated(victim))continue;', 'if(!alive(victim)&&!incapacitated(victim))continue;');
  once('(event.burns??=[]).push(...blast.burns);}', '(event.burns??=[]).push(...blast.burns);appendBarrelBlasts(s,event,explosions,s.props.filter(p=>isExplosiveBarrel(p)&&fuelBlastReaches(victim,p)),shooter);}');
 }
 return Buffer.from(s);
}

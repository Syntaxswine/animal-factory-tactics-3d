export const sceneryOverrides={
 'environment.js':'Register helicopter and furnishing placements; only the helicopter body blocks standing movement.',
 'maps.js':'Use baked helicopter movement clearance and validate authored squad facing.',
 'projectiles.js':'Helicopter body, debris and overhead rotor use the visible model triangles for bullet collisions.',
 'visibility.js':'The helicopter shields sight through its body while leaving rotor overhang open.',
 'engine.js':'Keep the authored squad-start facing on entry into gameplay.'
};
export function adaptCoreScenery(name,data){
 if(!sceneryOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Scenery adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='environment.js'){
  s="import {SCENERY_PROPS,isHelicopter} from '../scenery-catalog.js';\nimport {helicopterBlocked} from '../scenery-rules.js';\n"+s;
  once('export const propBlocks=(m,x,y,z=0)=>','export const propBlocks=(m,x,y,z=0)=>isHelicopter(propAt(m,x,y,z))?helicopterBlocked(propAt(m,x,y,z),{x,y,z}):');
  s+='\nObject.assign(PROPS,SCENERY_PROPS);\n';
 }
 if(name==='maps.js'){
  s="import {helicopterMoveAllowed} from '../scenery-rules.js';\n"+s;
  once('&&siteMoveAllowed(m,p,b)','&&siteMoveAllowed(m,p,b)&&helicopterMoveAllowed(m,p,b)');
  once("return [...errors,'Place exactly four valid squad starts.'];","return [...errors,'Place exactly four valid squad starts.'];\n for(const p of raw.starts)if(p.heading!==undefined&&(!Number.isFinite(p.heading)||p.heading<0||p.heading>=360))errors.push('Squad facing must be between 0 and 359 degrees.');");
 }
 if(name==='projectiles.js'){
  s="import {helicopterRayHit} from '../scenery-rules.js';\nimport {isHelicopter,sceneryId} from '../scenery-catalog.js';\n"+s;
  once('const impact=(kind,t,extra={})=>',`const helicopterHit=helicopterRayHit(state.props,origin,d,limit);
 if(helicopterHit){limit=helicopterHit.distance;nearest=null;nearestProp=helicopterHit.prop;}
 const impact=(kind,t,extra={})=>`);
  once('propId:isStrategicSite(nearestProp)?','propId:isHelicopter(nearestProp)?sceneryId(nearestProp):isStrategicSite(nearestProp)?');
 }
 if(name==='visibility.js'){
  s="import {helicopterRayHit} from '../scenery-rules.js';\nimport {isHelicopter} from '../scenery-catalog.js';\n"+s;
  once('c={sites:', 'c={helicopters:(s.props||[]).filter(isHelicopter),sites:');
  once('if(c.sites.length){','if(c.helicopters.length){const length=Math.hypot(dx,dy,dh);if(length>.001&&helicopterRayHit(c.helicopters,{x:a.x,y:a.y,h:h0},{x:dx/length,y:dy/length,h:dh/length},Math.max(0,length-.51)))return false;}\n if(c.sites.length){');
 }
 if(name==='engine.js')once("if(p.outfit)s.units.at(-1).outfit=p.outfit;", "if(p.heading!==undefined){const u=s.units.at(-1);u.heading=p.heading;const angle=p.heading*Math.PI/180;u.facing=Math.cos(angle)-Math.sin(angle)>=0?1:-1;}if(p.outfit)s.units.at(-1).outfit=p.outfit;");
 return Buffer.from(s);
}

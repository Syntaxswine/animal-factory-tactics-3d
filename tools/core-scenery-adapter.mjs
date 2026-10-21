export const sceneryOverrides={
 'blocks.js':'Copy authored upper floors without materializing arch-owned surfaces into detached floors.',
 'environment.js':'Register scenery with four orientations and physical body clearance; invalidate footprint indexes after in-place edits.',
 'maps.js':'Use physical scenery movement clearance and derived stone-arch tops, validate full orientation and headroom, and preserve authored squad facing.',
 'editor-model.js':'Persist full scenery orientation and reject machine headroom conflicts before committing a prop.',
 'projectiles.js':'Scenery bodies use the visible model triangles for bullet and rocket collisions.',
 'visibility.js':'Physical scenery shields sight while leaving real openings clear.',
 'explosives.js':'A blast can affect its own scenery surface without treating other machines as transparent; natural stone arches share the cliff-terrain blast policy.',
 'engine.js':'Keep the authored squad-start facing on entry into gameplay.'
};
export function adaptCoreScenery(name,data){
 if(!sceneryOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Scenery adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='blocks.js')once('const t=terrainAt(m,x+dx,y+dy,z);', "const t=m.upper?.[z-1]?.[tileKey(x+dx,y+dy)]||'void';");
 if(name==='environment.js'){
  s="import {SceneryIndex} from '../scenery-index.js';\nimport {SCENERY_PROPS,isScenery,scenerySize} from '../scenery-catalog.js';\nimport {sceneryBlockedAt} from '../scenery-rules.js';\n"+s;
  once('const w=p.rotated?rule.h:rule.w,h=p.rotated?rule.w:rule.h;', 'const {w,h}=isScenery(p)?scenerySize(p):{w:p.rotated?rule.h:rule.w,h:p.rotated?rule.w:rule.h};');
  once('const indexes=new WeakMap();', 'const indexes=new SceneryIndex(props=>{const index=new Map();for(const p of props)for(const q of propCells(p))index.set(`${q.x},${q.y},${q.z}`,p);return index;});');
  once('let index=indexes.get(props);if(!index){index=new Map();for(const p of props)for(const q of propCells(p))index.set(`${q.x},${q.y},${q.z}`,p);indexes.set(props,index);}', 'const index=indexes.get(m);');
  once('export const propBlocks=(m,x,y,z=0)=>','export const propBlocks=(m,x,y,z=0)=>sceneryBlockedAt(m,{x,y,z})?true:');
  s+='\nObject.assign(PROPS,SCENERY_PROPS);\n';
 }
 if(name==='maps.js'){
  s="import {archTerrainAt} from '../stone-arches.js';\nimport {sceneryMoveAllowed} from '../scenery-rules.js';\nimport {isScenery,SCENERY_ROTATIONS} from '../scenery-catalog.js';\nimport {sceneryPlacementErrors} from '../scenery-placement.js';\n"+s;
  once("return z===0?(m.terrain||m.map)[y][x]:(m.upper?.[z-1]?.[tileKey(x,y)]||'void');", "return z===0?(m.terrain||m.map)[y][x]:(m.upper?.[z-1]?.[tileKey(x,y)]||archTerrainAt(m,x,y,z)||'void');");
  once('&&siteMoveAllowed(m,p,b)','&&siteMoveAllowed(m,p,b)&&sceneryMoveAllowed(m,p,b)');
  once("return [...errors,'Invalid environment props.'];", "return [...errors,'Invalid environment props.'];\n if((raw.props||[]).some(p=>isScenery(p)&&p.rotation!==undefined&&!SCENERY_ROTATIONS.includes(p.rotation)))return [...errors,'Scenery orientation must be 0°, 90°, 180° or 270°.'];\n errors.push(...sceneryPlacementErrors(raw,null,PROPS,EDGES));");
  once("return [...errors,'Place exactly four valid squad starts.'];","return [...errors,'Place exactly four valid squad starts.'];\n for(const p of raw.starts)if(p.heading!==undefined&&(!Number.isFinite(p.heading)||p.heading<0||p.heading>=360))errors.push('Squad facing must be between 0 and 359 degrees.');");
 }
 if(name==='editor-model.js'){
  s="import {isScenery,sceneryOrientation} from '../scenery-catalog.js';\nimport {sceneryPlacementErrors} from '../scenery-placement.js';\n"+s;
  once('const p={x,y,z,kind,rotated:!!options.rotated},cells=propCells(p);','const p={x,y,z,kind,rotated:!!options.rotated,...isScenery({kind})?sceneryOrientation(options):{}},cells=propCells(p);');
  once("m.props=[...(m.props||[]),p];return '';", "const sceneryError=sceneryPlacementErrors(m,p,PROPS,EDGES)[0];if(sceneryError)return sceneryError;m.props=[...(m.props||[]),p];return '';");
 }
 if(name==='projectiles.js'){
  s="import {sceneryRayHit} from '../scenery-rules.js';\nimport {isPhysicalScenery,sceneryId} from '../scenery-catalog.js';\n"+s;
  once('const impact=(kind,t,extra={})=>',`const sceneryHit=sceneryRayHit(state.props,origin,d,limit);
 if(sceneryHit){limit=sceneryHit.distance;nearest=null;nearestProp=sceneryHit.prop;}
 const impact=(kind,t,extra={})=>`);
  once('propId:isStrategicSite(nearestProp)?','propId:isPhysicalScenery(nearestProp)?sceneryId(nearestProp):isStrategicSite(nearestProp)?');
 }
 if(name==='visibility.js'){
  s="import {sceneryRayHit} from '../scenery-rules.js';\nimport {isPhysicalScenery} from '../scenery-catalog.js';\n"+s;
  once('c={sites:', 'c={scenery:(s.props||[]).filter(isPhysicalScenery),sites:');
  once('if(c.sites.length){','if(c.scenery.length){const length=Math.hypot(dx,dy,dh);if(length>.001&&sceneryRayHit(c.scenery,{x:a.x,y:a.y,h:h0},{x:dx/length,y:dy/length,h:dh/length},Math.max(0,length-.51)))return false;}\n if(c.sites.length){');
 }
 if(name==='engine.js')once("if(p.outfit)s.units.at(-1).outfit=p.outfit;", "if(p.heading!==undefined){const u=s.units.at(-1);u.heading=p.heading;const angle=p.heading*Math.PI/180;u.facing=Math.cos(angle)-Math.sin(angle)>=0?1:-1;}if(p.outfit)s.units.at(-1).outfit=p.outfit;");
 if(name==='explosives.js'){
  s="import {isPhysicalScenery,isStoneArch,sceneryId} from '../scenery-catalog.js';\n"+s;
  once('if(isExplosiveBarrel(prop)||isStrategicSite(prop)||', 'if(isExplosiveBarrel(prop)||isStrategicSite(prop)||isStoneArch(prop)||');
  once('candidates.push({...nearest,remove:', 'candidates.push({...nearest,propId:isPhysicalScenery(prop)?sceneryId(prop):null,remove:');
  once('if(blastClear(s,impact,c.point))', 'if(blastClear(s,impact,c.point,c.propId))');
 }
 return Buffer.from(s);
}

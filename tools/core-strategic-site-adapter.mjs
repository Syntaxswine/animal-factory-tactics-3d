export const strategicSiteOverrides={
 'environment.js':'Register intact/wreck strategic sites with separate reserved footprints and standing passage masks.',
 'maps.js':'Validate ground-only strategic sites and follow their baked continuous passage links.',
 'editor-model.js':'Preserve the optional trusted sabotage action when placing a strategic site.',
 'projectiles.js':'Use the actual strategic-site triangles for shots and sight; retain open lattice gaps.',
 'visibility.js':'Strategic-site geometry shields terrain without making the entire reserved area opaque.',
 'explosives.js':'Replace exposed strategic structures with persistent wrecks rather than deleting their footprints.',
 'engine.js':'Flamethrowers destroy exposed strategic sites; explosive targeting supports structures.'
};
export function adaptCoreStrategicSites(name,data){
 if(!strategicSiteOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Strategic site adapter anchor changed: '+a);s=s.replace(a,b);};
 if(name==='environment.js'){
  s="import {SITE_PROPS,isStrategicSite,siteBlocked} from '../strategic-site-rules.js';\n"+s;
  once('!!PROPS[propAt(m,x,y,z)?.kind]?.solid','isStrategicSite(propAt(m,x,y,z))?siteBlocked(propAt(m,x,y,z),{x,y,z}):!!PROPS[propAt(m,x,y,z)?.kind]?.solid');
  s+='\nObject.assign(PROPS,SITE_PROPS);\n';
 }
 if(name==='maps.js'){
  s="import {siteMoveAllowed,strategicSiteErrors} from '../strategic-site-rules.js';\n"+s;
  once('out.filter(b=>rampMoveAllowed(m,p,b))','out.filter(b=>rampMoveAllowed(m,p,b)&&siteMoveAllowed(m,p,b))');
  once('errors.push(...canopyErrors(raw));','errors.push(...strategicSiteErrors(raw));errors.push(...canopyErrors(raw));');
 }
 if(name==='editor-model.js'){
  s="import {isStrategicSite} from '../strategic-site-rules.js';\n"+s;
  once('cells=propCells(p);if((m.props||[]).length',"cells=propCells(p);if(isStrategicSite(p))p.sabotage=!!options.sabotage;if((m.props||[]).length");
 }
 if(name==='projectiles.js'){
  s="import {siteRayHit,isStrategicSite,siteId} from '../strategic-site-rules.js';\n"+s;
  once('const impact=(kind,t,extra={})=>',`const siteHit=siteRayHit(state.props,origin,d,limit);
 if(siteHit){limit=siteHit.distance;nearest=null;nearestProp=siteHit.prop;}
 const impact=(kind,t,extra={})=>`);
  once('propId:barrelId(nearestProp)','propId:isStrategicSite(nearestProp)?siteId(nearestProp):barrelId(nearestProp)');
 }
 if(name==='visibility.js'){
  s="import {isStrategicSite,siteRayHit} from '../strategic-site-rules.js';\nimport {unitBaseHeight} from '../tower-geometry.js';\n"+s;
  once('c={hasWoodland:', 'c={sites:(s.props||[]).filter(isStrategicSite),hasWoodland:');
  once('h0=az*3+eyeHeight(a),dh=(bz-az)*3;','h0=unitBaseHeight(a)+eyeHeight(a),dh=bz*3+eyeHeight(a)-h0;\n if(c.sites.length){const length=Math.hypot(dx,dy,dh);if(length>.001&&siteRayHit(c.sites,{x:a.x,y:a.y,h:h0},{x:dx/length,y:dy/length,h:dh/length},Math.max(0,length-.51)))return false;}');
 }
 if(name==='explosives.js'){
  s="import {isStrategicSite} from '../strategic-site-rules.js';\nimport {blastStrategicSites} from '../strategic-site-damage.js';\n"+s;
  once('if(isExplosiveBarrel(prop))continue;','if(isExplosiveBarrel(prop)||isStrategicSite(prop))continue;');
  once('return {hits,barrels,blast:', 'const sites=blastStrategicSites(s,impact,radius);destroyed+=sites.length;\n return {hits,barrels,sites,blast:');
 }
 if(name==='engine.js'){
  s="import {intactSite,siteId,siteEscapeSteps} from '../strategic-site-rules.js';\nimport {flameStrategicSites} from '../strategic-site-damage.js';\n"+s;
  once('return neighbors(s,p,stairs).filter(q=>','return neighbors(s,p,stairs).concat(siteEscapeSteps(s,u,p)).filter(q=>');
  once('for(const n of neighbors(s,p,stairs)){','for(const n of neighbors(s,p,stairs).concat(siteEscapeSteps(s,g,p))){');
  once('if(b.barrel){',`if(b.structure){
  if(!s.props.some(p=>intactSite(p)&&siteId(p)===b.id))return {ok:false,reason:'Structure already destroyed'};
  if(WEAPONS[a.weapon].incendiary)return flamePreview(s,a,{...b,ground:true},WEAPONS[a.weapon],combatCosts(s));
  if(WEAPONS[a.weapon].blast)return explosivePreview(s,a,b,WEAPONS[a.weapon]);
  return {ok:false,reason:'Use a flamethrower or explosive weapon',cost:WEAPONS[a.weapon].cost,rounds:1};
 }
 if(b.barrel){`);
  once('!b.ground&&!b.barrel&&!inCone(b,a)','!b.ground&&!b.barrel&&!b.structure&&!inCone(b,a)');
  once('if(ballistic&&!target.barrel&&alive(target)){','if(ballistic&&!target.barrel&&!target.structure&&alive(target)){');
  once('event.flame=flame;event.hit=flameHits.length>0;', 'event.flame=flame;event.sites=flameStrategicSites(s,flame);event.hit=flameHits.length>0||event.sites.length>0;');
  once('event.hit=blastResult.hits.length>0;', 'event.sites=blastResult.sites;event.hit=blastResult.hits.length>0||event.sites.length>0;');
 }
 return Buffer.from(s);
}

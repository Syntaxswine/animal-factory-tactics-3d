export const ROOF_KINDS=['roof-corrugated-flat','roof-corrugated-sloped','roof-flat-parapet'];
export const roofVisualKind=kind=>kind.replace(/^roof-climbable-/,'roof-');
export const climbableRoofKind=kind=>ROOF_KINDS.includes(kind)?kind.replace('roof-','roof-climbable-'):kind;
export const isClimbableRoof=p=>p?.kind?.startsWith('roof-climbable-')&&ROOF_KINDS.includes(roofVisualKind(p.kind));
export function roofLabel(kind){const names={'roof-corrugated-flat':'Corrugated flat roof','roof-corrugated-sloped':'Corrugated sloped roof','roof-flat-parapet':'Flat parapet roof'};return (isClimbableRoof({kind})?'Climbable ':'')+(names[roofVisualKind(kind)]||kind);}
const cache=new WeakMap();
function index(map){const props=map.props||[];if(cache.has(props))return cache.get(props);const links=[],byTile=new Map(),seen=new Set();for(const p of props){if(!isClimbableRoof(p)||!(p.z>0&&p.z<3))continue;for(let y=p.y;y<p.y+2;y++)for(let x=p.x;x<p.x+2;x++)for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const q={x:x-dx,y:y-dy,z:p.z-1,dx,dy},id=[q.x,q.y,q.z,dx,dy].join(',');if(seen.has(id))continue;seen.add(id);links.push(q);for(const key of [`${q.x},${q.y},${q.z}`,`${x},${y},${p.z}`]){if(!byTile.has(key))byTile.set(key,[]);byTile.get(key).push(q);}}}const result={links,byTile};cache.set(props,result);return result;}
// Geometry and current collision validity are checked by roofValid at lookup time.
export const automaticRoofClimbs=map=>index(map).links;
export const automaticRoofLinksAt=(map,p)=>index(map).byTile.get(`${p.x},${p.y},${p.z||0}`)||[];

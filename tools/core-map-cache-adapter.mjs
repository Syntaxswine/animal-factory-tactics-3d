export const mapCacheOverrides={
 'engine.js':'Track live encounter geometry independently of turns and invalidate it when a fence is cut.',
 'maps.js':'Invalidate live geometry when terrain changes or a door opens; editable map clones keep content checks. Validate terrain with per-call sets instead of allocating an allowed-type array per tile.',
 'explosives.js':'Invalidate geometry immediately after each nonstructural blast removal.',
 'visibility.js':'Reuse terrain sight geometry across live actor updates, retaining content checks for mutable editor maps.'
};
export function adaptCoreMapCache(name,data){
 if(!mapCacheOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Map cache adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {"+(name==='visibility.js'?'MapGeometryCache':'invalidateMapGeometry'+(name==='engine.js'?',trackMapGeometry':''))+"} from '../map-geometry-cache.js';\n"+s;
 if(name==='engine.js'){
  once('if(detect)refresh(s);log(s,`Local map ready', 'trackMapGeometry(s);if(detect)refresh(s);log(s,`Local map ready');
  once("s.edges[edge]='fence-cut';", "s.edges[edge]='fence-cut';invalidateMapGeometry(s);");
 }
 if(name==='maps.js'){
  once('export function validateMap(raw,{connectivity=true}={}){', "export function validateMap(raw,{connectivity=true}={}){\n const groundTypes=new Set(['yard','floor','crate','void','water','bridge','woodland','woodland-dense',...GROUNDS]),upperTypes=new Set(['yard','floor','crate','bridge','woodland','woodland-dense',...GROUNDS]);");
  once("!['yard','floor','crate','void','water','bridge','woodland','woodland-dense',...GROUNDS].includes(t)", '!groundTypes.has(t)');
  once("!['yard','floor','crate','bridge','woodland','woodland-dense',...GROUNDS].includes(v)", '!upperTypes.has(v)');
  once('m.upper[z-1][tileKey(x,y)]=value;return true;', 'm.upper[z-1][tileKey(x,y)]=value;invalidateMapGeometry(m);return true;');
  once('m.edges[k]=next;return true;', 'm.edges[k]=next;invalidateMapGeometry(m);return true;');
 }
 if(name==='explosives.js')once('c.remove();destroyed++;', 'c.remove();invalidateMapGeometry(s);destroyed++;');
 if(name==='visibility.js'){
  once('synchronizeFoliage,traceFoliage','synchronizeFoliage,foliageOccluded');
  once('if(traceFoliage(c.foliage,','if(foliageOccluded(c.foliage,');
  once(",'sight'))return false;",'))return false;');
  once('function scene(s){const signature=foliageSignature(s);let c=caches.get(s);if(c?.signature===signature)return c;',
   'function scene(s){let cache=caches.get(s);if(!cache){cache=new MapGeometryCache(buildScene);caches.set(s,cache);}return cache.get(s);}\nfunction buildScene(s){const signature=foliageSignature(s);let c;');
  once('caches.set(s,c);return c;', 'return c;');
 }
 return Buffer.from(s);
}

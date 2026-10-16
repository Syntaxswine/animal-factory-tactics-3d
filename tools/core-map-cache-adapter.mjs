export const mapCacheOverrides={
 'engine.js':'Track live encounter geometry independently of turns and invalidate it when a fence is cut.',
 'maps.js':'Invalidate live geometry when terrain changes or a door opens; editable map clones keep content checks.',
 'explosives.js':'Invalidate geometry immediately after each nonstructural blast removal.'
};
export function adaptCoreMapCache(name,data){
 if(!mapCacheOverrides[name])return data;let s=data.toString();
 const once=(a,b)=>{if(s.split(a).length!==2)throw Error('Map cache adapter anchor changed: '+a);s=s.replace(a,b);};
 s="import {invalidateMapGeometry"+(name==='engine.js'?',trackMapGeometry':'')+"} from '../map-geometry-cache.js';\n"+s;
 if(name==='engine.js'){
  once('if(detect)refresh(s);log(s,`Local map ready', 'trackMapGeometry(s);if(detect)refresh(s);log(s,`Local map ready');
  once("s.edges[edge]='fence-cut';", "s.edges[edge]='fence-cut';invalidateMapGeometry(s);");
 }
 if(name==='maps.js'){
  once('m.upper[z-1][tileKey(x,y)]=value;return true;', 'm.upper[z-1][tileKey(x,y)]=value;invalidateMapGeometry(m);return true;');
  once('m.edges[k]=next;return true;', 'm.edges[k]=next;invalidateMapGeometry(m);return true;');
 }
 if(name==='explosives.js')once('c.remove();destroyed++;', 'c.remove();invalidateMapGeometry(s);destroyed++;');
 return Buffer.from(s);
}

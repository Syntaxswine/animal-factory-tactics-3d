// The pinned two-dimensional core stays unchanged. Extend only its 3D copy.
export const layerOverrides={'maps.js':'Support authored layers 1–5 while retaining legacy map shapes.','blocks.js':'Preserve all authored layers through reusable blocks.','editor-model.js':'Author floors, walls and access links on the extended layers.','visibility.js':'Treat absent legacy upper layers as empty.','woodland.js':'Split cross-level foliage rays at every supported layer.','connections.js':'Include all supported heights in boundary profiles.','explosives.js':'Apply blast geometry across every authored layer.'};
function once(s,a,b){if(s.split(a).length!==2)throw Error('Layer adapter anchor changed: '+a);return s.replace(a,b);}
export function adaptCoreLayers(name,data){let s=data.toString();
 if(name==='maps.js'){
  s="import {MAP_LEVELS,validLayerCount,ensureMapLayer} from '../map-layers.js';\n"+s;
  s=once(s,'LEVELS=3,','LEVELS=MAP_LEVELS,');
  s=once(s,"import {invalidateMapGeometry}","import {invalidateMapGeometry,trackMapGeometry}");
  // Connectivity is synchronous and read-only. Give its temporary view a fresh
  // ground-array identity so fast indexes cannot opt the mutable editor map in.
  s=once(s,'reachedTargets({...raw,edgeLocks:{}},targets)','reachedTargets(trackMapGeometry({...raw,terrain:raw.terrain.slice(),edgeLocks:{}}),targets)');
  s=once(s,"if(!z)m.terrain[y][x]=value;else if(value==='void')delete m.upper[z-1][tileKey(x,y)];", "if(z&&value!=='void')ensureMapLayer(m,z);if(!z)m.terrain[y][x]=value;else if(value==='void'){if(m.upper[z-1])delete m.upper[z-1][tileKey(x,y)];}");
  s=once(s,'p.z<2&&','p.z<LEVELS-1&&');
  s=once(s,'levels:LEVELS,name,terrain:','levels:3,name,terrain:');
  // The existing three-storey fixture is not a request to grow every building.
  s=s.replaceAll('z<LEVELS;z++)stampRoom','z<3;z++)stampRoom');
  s=once(s,'point=p=>p&&inBounds(p.x,p.y,levelOf(p))','point=p=>p&&inBounds(p.x,p.y,levelOf(p))&&levelOf(p)<raw.levels');
  s=once(s,'raw.levels!==LEVELS','!validLayerCount(raw.levels)');
  s=once(s,'240 × 240 tiles and 3 levels.','240 × 240 tiles and 3–5 layers.');
  s=once(s,'raw.upper.length!==2','raw.upper.length!==raw.levels-1');
  s=once(s,'Expected two sparse upper levels.','Expected one sparse upper floor per declared layer above ground.');
  s=s.replaceAll('p.z>=2','p.z>=raw.levels-1').replaceAll('[12]','[1-4]');
  s=s.replace('Invalid stairs: lower level must be 0 or 1.','Invalid stairs: an upper landing layer is required.');
 }else if(name==='editor-model.js'){
  s=once(s,'import {W,H,stampRoom','import {LEVELS,W,H,stampRoom');
  s=s.replaceAll('[12]','[1-4]').replace('if(z>=2)', 'if(z>=LEVELS-1)').replace('if(z===2)', 'if(z>=LEVELS-1)');
  s=s.replace('Roof climbs begin on level 1 or 2.','A climb needs an upper landing layer.').replace('Stairs must begin on level 1 or 2.','Stairs need an upper landing layer.').replace('Select level 2 or 3 for a roof.','Select an upper layer for a roof.');
 }else if(name==='blocks.js'){
  s="import {validLayerCount,ensureMapLayer} from '../map-layers.js';\n"+s;
  s=once(s,'import {blankMap,','import {LEVELS,blankMap,');
  s=once(s,'size:24,levels:3,name:m.name','size:24,levels:m.levels,name:m.name');
  s=once(s,'upper:[{},{}],edges:{}','upper:Array.from({length:m.levels-1},()=>({})),edges:{}');
  s=once(s,'for(let z=1;z<3;z++)for(let dy','for(let z=1;z<m.levels;z++)for(let dy');
  s=once(s,"for(let z=1;z<3;z++)setTerrain(m,x+dx,y+dy,z,d.upper[z-1][tileKey(dx,dy)]||'void')", "for(let z=1;z<LEVELS;z++)setTerrain(m,x+dx,y+dy,z,d.upper[z-1]?.[tileKey(dx,dy)]||'void')");
  s=once(s,'d.levels!==3','!validLayerCount(d.levels)');s=once(s,'d.upper.length!==2','d.upper.length!==d.levels-1');
  s=once(s,'export function applyData(m,d,x,y,remap=false){','export function applyData(m,d,x,y,remap=false){if(d.levels>m.levels)ensureMapLayer(m,d.levels-1);');
  s=s.replace('Expected a24×24 block with3levels.','Expected a 24 × 24 block with 3–5 layers.').replaceAll('[12]','[1-4]');
 }else if(name==='visibility.js')s=once(s,'Object.entries(s.upper[z-1])','Object.entries(s.upper[z-1]||{})');
 else if(name==='woodland.js'){s=once(s,'import {terrainAt,levelOf}','import {terrainAt,levelOf,LEVELS}');s=once(s,'z<3','z<LEVELS');}
 else if(name==='connections.js'){s="import {MAP_LEVELS} from '../map-layers.js';\n"+s;s=s.replaceAll('z<3','z<MAP_LEVELS');}
 else if(name==='explosives.js')s=once(s,'for(let z=0;z<3;z++)','for(let z=0;z<(s.upper.length+1);z++)');
 return Buffer.from(s);
}

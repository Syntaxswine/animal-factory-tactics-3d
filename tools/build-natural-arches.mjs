import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {naturalArchGeometry} from '../dist/tactics/natural-rock-arches.js';
import {ARCH_ELEVATION_PLAN} from '../dist/tactics/natural-arch-data.js';
const directory=path.resolve(import.meta.dirname,'../dist/assets/environment/natural-rock-arches'),round=x=>+x.toFixed(7),hash=file=>createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));manifest.models=[];manifest.elevationPlan=ARCH_ELEVATION_PLAN;
fs.writeFileSync(path.join(directory,'natural-rock.mtl'),'newmtl PaintedLimestone\nKa 0.25 0.25 0.25\nKd 1 1 1\nKs 0 0 0\nNs 1\nillum 1\nmap_Kd paint-atlas-v1.png\n');
for(const kind of ['large','small'])for(const detail of ['author','runtime']){
 const g=naturalArchGeometry(kind,{detail}),name=kind+'-'+detail,a=g.attributes;
 const data={format:'Animal Factory static mesh v1',coordinates:'Y up, tile=1, X span, Z passage',kind,detail,triangles:g.userData.triangles,layout:g.userData.layout,bounds:{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()},attributes:Object.fromEntries(['position','normal','uv','color','surface'].map(k=>[k,{itemSize:a[k].itemSize,array:Array.from(a[k].array,round)}]))};
 fs.writeFileSync(path.join(directory,name+'.json'),JSON.stringify(data));
 const obj=['# Animal Factory natural rock arch; Y up, one unit per tile','mtllib natural-rock.mtl','o '+name];
 for(let i=0;i<a.position.count;i++)obj.push('v '+[a.position.getX(i),a.position.getY(i),a.position.getZ(i)].map(round).join(' '));
 for(let i=0;i<a.uv.count;i++)obj.push('vt '+[a.uv.getX(i),a.uv.getY(i)].map(round).join(' '));
 for(let i=0;i<a.normal.count;i++)obj.push('vn '+[a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i)].map(round).join(' '));
 obj.push('usemtl PaintedLimestone','s off');for(let i=1;i<=a.position.count;i+=3)obj.push('f '+[i,i+1,i+2].map(n=>`${n}/${n}/${n}`).join(' '));fs.writeFileSync(path.join(directory,name+'.obj'),obj.join('\n')+'\n');
 manifest.models.push({kind,detail,triangles:data.triangles,json:name+'.json',obj:name+'.obj',jsonSha256:hash(name+'.json'),objSha256:hash(name+'.obj'),bounds:data.bounds,walkableTop:data.layout.height,layer:data.layout.topLevel+1});g.dispose();
}
manifest.textures=['paint-atlas-v1.png','paint-atlas-v1.webp'].map(file=>({file,width:1254,height:1254,bytes:fs.statSync(path.join(directory,file)).size,sha256:hash(file)}));
manifest.geometryWorkflow='Approximately 3,000 author triangles reduced to approximately 1,000 runtime triangles (exact counts recorded per model). Reduced samples of the same constrained rock volume preserve the exact top route, end contacts and protected opening; tiny cap slivers are not subdivided further. Fine cracks, strata and moss are painted.';
manifest.shading={faces:'Shared planar normals and painted relief; broad front/rear faces do not receive dynamic shadows to avoid cap-triangulation self-shadow stripes.',otherSurfaces:'Geometric normals and normal shadow reception on the top, ends and underside. All rock casts shadows.',surfaceAttribute:{front:0,rear:1,underside:2,top:3,end:4},portability:'JSON includes surface classifications. OBJ includes geometry, UVs and normals; reproduce the runtime library material policy for equivalent shadows.'};
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({models:manifest.models.map(({kind,detail,triangles})=>({kind,detail,triangles})),textures:manifest.textures.map(({file,bytes})=>({file,bytes}))}));

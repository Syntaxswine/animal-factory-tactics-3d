// node tools/speaking-heads/preview-data.mjs <id> <out.png> [--level=10k|author] [--wire] [--weights]
// Clay renders of a built speaking head (dist/tactics/speaking-heads/<id>-<level>.json) beside
// the character's own skull at the same level: profile, three-quarter and front, closed and
// with the jaw open 8, 16 and 24 degrees about its hinge.
import fs from 'node:fs';
import {render,montage,stack,writePNG} from './raster.mjs';
const id=process.argv[2],out=process.argv[3],level=process.argv.find(a=>a.startsWith('--level='))?.slice(8)||'10k';
const wire=process.argv.includes('--wire'),weights=process.argv.includes('--weights');
const root=new URL('../../dist/tactics/',import.meta.url),head=JSON.parse(fs.readFileSync(new URL(`speaking-heads/${id}-${level}.json`,root)));
const characterFile=level==='author'?(id==='horse'?'horse-light-data.json':head.character.replace('10k','author')):head.character,character=JSON.parse(fs.readFileSync(new URL(characterFile,root)));
const original=character.parts.find(p=>p.name===head.replaces);
const [hx,hy]=head.jaw.hinge;
const turn=(p,a)=>{const c=Math.cos(-a),s=Math.sin(-a),dx=p[0]-hx,dy=p[1]-hy;return [hx+dx*c-dy*s,hy+dx*s+dy*c,p[2]];};
function pose(angle){return head.parts.map(part=>{const P=part.position,N=part.normal,n=P.length/3,pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);
 for(let i=0;i<n;i++){const w=part.kind==='skin'?part.jaw[i]:part.bone==='jaw'?1:0,p=[P[i*3],P[i*3+1],P[i*3+2]],q=turn(p,angle);pos.set(p.map((v,k)=>v+w*(q[k]-v)),i*3);
  const nn=[N[i*3],N[i*3+1],N[i*3+2]],r=turn([nn[0]+hx,nn[1]+hy,nn[2]],angle);nor.set(nn.map((v,k)=>v+w*((r[k]-[hx,hy,0][k])-v)),i*3);
  const m=part.kind==='skin'?part.inside[i]:0,base=part.kind==='tongue'?[.78,.42,.42]:part.kind==='teeth'?[.93,.9,.8]:weights?[.25+.75*w,.35,1-.75*w]:[.74,.72,.68];
  col.set(base.map((v,k)=>v*(1-m)+[.42,.12,.12][k]*m),i*3);}
 return {position:pos,normal:nor,index:part.index,colors:col};});}
const originalMesh=[{position:original.position,normal:original.normal,index:original.index,color:[.74,.72,.68]}];
// centred on the mouth: the vertices that fold flat at rest (its lips' faces and cheeks)
const skin=head.parts[0],mouth=i=>skin.fold?skin.fold[i]>.5:skin.inside[i]>.5,lip=[0,1,2].map(k=>{let s=0,c=0;for(let i=0;i<skin.inside.length;i++)if(mouth(i)){s+=skin.position[i*3+k];c++;}return s/c;});
const center=[lip[0]-.02,lip[1]-.01,0],size=420,scale=1500;
const views=[{dir:[0,0,-1],up:[0,1,0]},{dir:[-.78,-.18,-.6],up:[0,1,0]},{dir:[-1,.05,0],up:[0,1,0]}];
const angles=[0,8,16,24].map(a=>a*Math.PI/180);
const rows=views.map(v=>montage([originalMesh,...angles.map(pose)].map(m=>render(m,{...v,center,scale,width:size,height:size},{wire}))));
const img=stack(rows);writePNG(out,img.width,img.height,img.rgba);
console.log(id,level,'triangles',head.triangles,'(skull it replaces',original.triangles+')','parts',head.parts.map(p=>p.name+' '+p.triangles).join(', '));

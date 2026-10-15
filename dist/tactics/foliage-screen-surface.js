import {groundHash,groundNoise} from './biome-ground-composition.js';

export const SCREEN_CHUNK_SIZE=24;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const massAt=(x,z,seed)=>groundNoise(x,z,5.8,seed+421)*.72+groundNoise(x,z,2.3,seed+433)*.28;

// Compose several tiles as a clump, not a separate identical bush per cell.
// World coordinates keep the field continuous across render chunks. This is
// only an art field: occupancy and the finite sight volumes still own the edge.
export function screenComposition(plan,x,z){
 const [ox,oz]=plan.origin||[0,0],wx=x+ox,wz=z+oz,seed=plan.seed;
 const mass=massAt(wx,wz,seed);
 return {mass,angle:groundNoise(wx,wz,7.4,seed+449)*Math.PI*2,tone:groundNoise(wx,wz,8.5,seed+457)};
}

// Cosmetic backing for the existing sight ellipsoids. No rule, seed, preset
// or collider is authored here. Backing vertices stay in their occupied cell;
// overlapping leaf fans are clipped by that same finite envelope in the shader.
export function screenSurface(plan){
 const lookup=new Map(plan.obstacles.screens.filter(s=>s.z===plan.level).map(s=>[s.x+','+s.y,s]));
 const cells=[...lookup.values()].filter(s=>s.family===plan.family),chunks=new Map();
 const [originX,originZ]=plan.origin||[0,0],cellGrid=new Array(plan.width*plan.depth);
 for(const s of lookup.values())cellGrid[s.y*plan.width+s.x]=s;
 // Shared vertices, side rows and finite-difference normals ask for the same
 // field samples repeatedly. Keep scratch caches only for this surface build.
 const compositionCache=new Map(),coreCache=new Map();
 const compositionAt=(x,z)=>{const key=x+','+z;if(!compositionCache.has(key))compositionCache.set(key,screenComposition(plan,x,z));return compositionCache.get(key);};
 // All core and normal samples lie on the existing quarter-cell mesh grid.
 // Numeric sample keys avoid allocating strings for every repeated normal.
 const sampleKey=(x,z)=>(x+1)*4+(z+1)*4*(plan.width+2)*4;
 const roofAt=(x,z,base,owner=lookup.get(`${Math.floor(x+.5)},${Math.floor(z+.5)}`))=>{
  if(!owner||owner.base!==base)return base;
  let top=base;for(const l of owner.lobes){const q=1-((x-l.center[0])/l.radius[0])**2-((z-l.center[2])/l.radius[2])**2;if(q>=0)top=Math.max(top,l.center[1]+l.radius[1]*Math.sqrt(q));}return top;
 };
 // Lower the shoulder gradually toward a shorter neighbour instead of cutting
 // a separate peak out of each tile. The owning crown is always an upper bound;
 // nearby shorter crowns may lower it, but taller neighbours cannot raise it.
 const ceilingCache=new Map();
 const ceilingAt=(s,x,z)=>{
  if(!ceilingCache.has(s.base))ceilingCache.set(s.base,new Map());const cache=ceilingCache.get(s.base),key=sampleKey(x,z);if(cache.has(key))return cache.get(key);
  let limit=Infinity;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const cx=Math.floor(x+.5)+dx,cz=Math.floor(z+.5)+dz;if(cx<0||cx>=plan.width||cz<0||cz>=plan.depth)continue;
   const c=cellGrid[cz*plan.width+cx];if(!c||c.base!==s.base)continue;
   const px=Math.max(c.x-.5,Math.min(c.x+.5,x)),pz=Math.max(c.y-.5,Math.min(c.y+.5,z));
   limit=Math.min(limit,roofAt(px,pz,s.base,c)+Math.hypot(x-px,z-pz)*.45);
  }if(!Number.isFinite(limit))limit=s.base;cache.set(key,limit);return limit;
 };
 const coreAt=(s,x,z)=>{
  if(!coreCache.has(s.family))coreCache.set(s.family,new Map());const familyCache=coreCache.get(s.family);
  if(!familyCache.has(s.base))familyCache.set(s.base,new Map());const cache=familyCache.get(s.base),key=sampleKey(x,z);
  if(!cache.has(key)){const mass=massAt(x+originX,z+originZ,plan.seed);cache.set(key,Math.min(ceilingAt(s,x,z),s.base+(s.family==='snow'?1.70:1.52)+mass*.85));}return cache.get(key);
 };
 const exposed=(s,dx,dy)=>{const n=lookup.get(`${s.x+dx},${s.y+dy}`);return !n||n.base!==s.base;};
 const inset=(x,z,fraction)=>{
  const [ox,oz]=plan.origin||[0,0],a=(x+ox)+(z+oz),wave=.5+.32*Math.sin(a*2.13)+.18*Math.sin(a*5.31+1.7);
  return .25+.10*wave+.04*Math.sin(fraction*Math.PI);
 };
 const contour=(s,x,z,fraction)=>{
  let px=x,pz=z;
  for(const [dx,dz]of directions)if(exposed(s,dx,dz)){
   const d=dx?Math.abs(x-s.x-dx*.5):Math.abs(z-s.y-dz*.5),amount=inset(x,z,fraction)*Math.max(0,1-d/.5);
   px-=dx*amount;pz-=dz*amount;
  }return [px,pz];
 };
 const get=(x,y)=>{const key=`${Math.floor(x/SCREEN_CHUNK_SIZE)},${Math.floor(y/SCREEN_CHUNK_SIZE)}`;if(!chunks.has(key))chunks.set(key,{key,position:[],normal:[],uv:[],color:[],index:[],fringe:{position:[],uv:[],index:[]},far:{position:[],uv:[],index:[]},distant:{position:[],uv:[],index:[]},cells:[]});return chunks.get(key);};
 const fringeQuad=(g,points,mirror=false,lod=2)=>{for(const target of [g.fringe,...(lod<2?[g.far]:[]),...(lod<1?[g.distant]:[])]){const i=target.position.length/3;target.position.push(...points.flat());target.uv.push(...(mirror?[1,0,0,0,1,1,0,1]:[0,0,1,0,0,1,1,1]));target.index.push(i,i+1,i+2,i+2,i+1,i+3);}};
 const vertex=(g,x,y,z,base,n)=>{
  const i=g.position.length/3;g.position.push(x,y,z);g.normal.push(...n);g.uv.push(x+z,y-base);
  const tone=groundNoise(x+originX,z+originZ,8.5,plan.seed+457),t=.88+tone*.16;
  g.color.push(t*(.98+tone*.025),t,t*(1.015-tone*.035));return i;
 };
 for(const s of cells){
  const g=get(s.x,s.y);g.cells.push([s.x,s.y,s.base]);const first=g.position.length/3;
  for(let iz=0;iz<=2;iz++)for(let ix=0;ix<=2;ix++){
   // Sample normals at the actual half-cell mesh spacing. Adjacent vertices
   // reuse those samples instead of evaluating sub-pixel derivatives repeatedly.
   const x=s.x-.5+ix*.5,z=s.y-.5+iz*.5,h=coreAt(s,x,z),e=.5,dx=(coreAt(s,x+e,z)-coreAt(s,x-e,z))/(2*e),dz=(coreAt(s,x,z+e)-coreAt(s,x,z-e))/(2*e),len=Math.hypot(dx,1,dz);
   const [px,pz]=contour(s,x,z,1);vertex(g,px,h,pz,s.base,[-dx/len,1/len,-dz/len]);
  }
  for(let iz=0;iz<2;iz++)for(let ix=0;ix<2;ix++){const a=first+iz*3+ix,b=a+1,c=a+3,d=c+1;g.index.push(a,c,b,b,c,d);}
  // Close small core joins; no raised slab or detached cap at a tile seam.
  for(const [dx,dz]of directions)if(!exposed(s,dx,dz)){
   const other=lookup.get(`${s.x+dx},${s.y+dz}`);
   for(let col=0;col<2;col++){
    const points=[];for(const edge of [col*.5-.5,(col+1)*.5-.5]){const x=s.x+dx*.5+(dz?edge:0),z=s.y+dz*.5+(dx?edge:0),own=coreAt(s,x,z),lower=Math.min(own,coreAt(other,x,z));points.push([x,lower,z],[x,own,z]);}
    if(Math.abs(points[1][1]-points[0][1])+Math.abs(points[3][1]-points[2][1])<1e-6)continue;
    const a=g.position.length/3;for(const p of points)vertex(g,...p,s.base,[dx,0,dz]);g.index.push(a,a+1,a+2,a+2,a+1,a+3);
   }
  }
  for(const [dx,dz]of directions)if(exposed(s,dx,dz)){
   const start=g.position.length/3;
   for(let row=0;row<=5;row++)for(let col=0;col<=4;col++){
    const along=-.5+col*.25,bx=s.x+dx*.5+(dz?along:0),bz=s.y+dz*.5+(dx?along:0),top=coreAt(s,bx,bz),fraction=row/5;
    const [px,pz]=contour(s,bx,bz,fraction);vertex(g,px,s.base+(top-s.base)*fraction,pz,s.base,[dx,0,dz]);
   }
   for(let row=0;row<5;row++)for(let col=0;col<4;col++){const a=start+row*5+col,b=a+1,c=a+5,d=c+1;g.index.push(a,b,c,b,d,c);}
   // Folded shoulder normals soften the flat cut wall without extra models.
   for(let row=0;row<=5;row++)for(let col=0;col<=4;col++){
    const pos=(r,c)=>g.position.slice((start+r*5+c)*3,(start+r*5+c)*3+3),a=pos(row,Math.max(0,col-1)),b=pos(row,Math.min(4,col+1)),c=pos(Math.max(0,row-1),col),d=pos(Math.min(5,row+1),col),u=b.map((v,i)=>v-a[i]),v=d.map((n,i)=>n-c[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],sign=normal[0]*dx+normal[2]*dz<0?-1:1,len=Math.hypot(...normal)||1;
    g.normal.splice((start+row*5+col)*3,3,...normal.map(n=>n/len*sign));
   }
   const h=Math.min(roofAt(s.x,s.y,s.base,s),coreAt(s,s.x,s.y)+.48),n=groundHash(s.x+dx*17,s.y+dz*31,plan.seed+81),group=compositionAt(s.x,s.y);
   for(let row=0;row<2;row++){
    const wet=plan.family==='wetlands',snow=plan.family==='snow',width=1.02+n*.38+group.mass*.28,top=h-.04-row*.16,height=wet?s.base+.06:Math.max(s.base+.25,h-(snow?.85:1.7)),offset=row?.22:-.24,depth=row?.24:.40,points=[];
    for(const vertical of [0,1])for(const a of [-width/2,width/2]){
     const along=a+offset+(vertical?(row?-.03:.03):0),out=depth+(vertical?-.08:.04)+a*(row?.18:-.18);
     points.push([s.x+dx*out+(dz?along:0),vertical?top:height,s.y+dz*out+(dx?along:0)]);
    }fringeQuad(g,points,n>.5,row===0?0:2);
   }
  }
  // A broad bough occasionally crosses several occupied cells. Quiet pockets
  // expose the painted core; they never make a gap in the blocked thicket.
  // Near/far/distant retain nested subsets of the same composed fans.
  const [ox,oz]=plan.origin||[0,0],n=groundHash(s.x+ox,s.y+oz,plan.seed+183),group=compositionAt(s.x,s.y),snow=plan.family==='snow';
  const count=group.mass>.58?3:group.mass>.43?2:1;
  if(group.mass>.28&&n<.12+group.mass*.70)for(let row=0;row<count;row++){
   const angle=group.angle+(n-.5)*.75+(row-.5)*.38,width=(snow?2.25:1.95)+group.mass*.65+n*.2,c=Math.cos(angle),sn=Math.sin(angle),top=coreAt(s,s.x,s.y)+.54,height=snow?.83:plan.family==='wetlands'?1.45:1.15,points=[];
   const jx=(groundHash(s.x+ox,s.y+oz,plan.seed+197)-.5)*.36,jz=(groundHash(s.x+ox,s.y+oz,plan.seed+211)-.5)*.36;
   for(const vertical of [0,1])for(const x of [-width/2,width/2]){
    const z=(vertical?(snow?.74:.43):snow?-.55:-.28)*(row?-1:1),px=s.x+jx+x*c-z*sn,pz=s.y+jz+x*sn+z*c;
    points.push([px,top-height+vertical*(height-.02-row*.045),pz]);
   }fringeQuad(g,points,n>.5,row);
  }
 }
 compositionCache.clear();coreCache.clear();ceilingCache.clear();cellGrid.length=0;
 return {chunks:[...chunks.values()],cells,roofAt,exposed};
}

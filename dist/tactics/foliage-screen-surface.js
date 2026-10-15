import {groundHash} from './biome-ground-composition.js';

export const SCREEN_CHUNK_SIZE=24;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];

// Cosmetic backing for the existing sight ellipsoids. No rule, seed, preset
// or collider is authored here. Backing vertices stay in their occupied cell;
// overlapping leaf fans are clipped by that same finite envelope in the shader.
export function screenSurface(plan){
 const lookup=new Map(plan.obstacles.screens.filter(s=>s.z===plan.level).map(s=>[s.x+','+s.y,s]));
 const cells=[...lookup.values()].filter(s=>s.family===plan.family),chunks=new Map();
 const roofAt=(x,z,base,owner=lookup.get(`${Math.floor(x+.5)},${Math.floor(z+.5)}`))=>{
  if(!owner||owner.base!==base)return base;
  let top=base;for(const l of owner.lobes){const q=1-((x-l.center[0])/l.radius[0])**2-((z-l.center[2])/l.radius[2])**2;if(q>=0)top=Math.max(top,l.center[1]+l.radius[1]*Math.sqrt(q));}return top;
 };
 // The dense core is below the leaf fringe. Its crown remains inside the
 // owning clipped volume; it never borrows a taller neighbour's canopy.
 const coreAt=(s,x,z)=>Math.min(roofAt(x,z,s.base,s),s.base+(s.family==='snow'?1.85:1.70)+.035*Math.sin(x*.63+Math.sin(z*.41)));
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
  const [ox,oz]=plan.origin||[0,0],broad=Math.sin((x+ox)*.31+Math.cos((z+oz)*.22))*Math.cos((z+oz)*.35),t=.93+broad*.07;
  g.color.push(t,t,t);return i;
 };
 for(const s of cells){
  const g=get(s.x,s.y);g.cells.push([s.x,s.y,s.base]);const first=g.position.length/3;
  for(let iz=0;iz<=2;iz++)for(let ix=0;ix<=2;ix++){
   const x=s.x-.5+ix*.5,z=s.y-.5+iz*.5,h=coreAt(s,x,z),e=.035,dx=(coreAt(s,x+e,z)-coreAt(s,x-e,z))/(2*e),dz=(coreAt(s,x,z+e)-coreAt(s,x,z-e))/(2*e),len=Math.hypot(dx,1,dz);
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
   const h=roofAt(s.x,s.y,s.base,s),n=groundHash(s.x+dx*17,s.y+dz*31,plan.seed+81);
   for(let row=0;row<2;row++){
    const wet=plan.family==='wetlands',width=.95+n*.32,top=h+.10-row*.12,height=wet?s.base+.06:Math.max(s.base+.25,h-1.85),offset=row?.22:-.24,depth=row?.24:.40,points=[];
    for(const vertical of [0,1])for(const a of [-width/2,width/2]){
     const along=a+offset+(vertical?(row?-.03:.03):0),out=depth+(vertical?-.08:.04)+a*(row?.18:-.18);
     points.push([s.x+dx*out+(dz?along:0),vertical?top:height,s.y+dz*out+(dx?along:0)]);
    }fringeQuad(g,points,n>.5,row===0?0:2);
   }
  }
  // Overviews retain two broad painted fans and very far views retain one.
  // The dense core remains, with less cutout overlap at distance.
  const n=groundHash(s.x,s.y,plan.seed+183);
  if(n>.10)for(let row=0;row<(plan.family==='snow'?2:3);row++){
   const snow=plan.family==='snow',angle=n*6.28+row*1.047,width=1.45+n*.72,c=Math.cos(angle),sn=Math.sin(angle),top=roofAt(s.x,s.y,s.base,s)+(snow?.05:.2),height=snow?.72:plan.family==='wetlands'?1.65:1.35,points=[];
   for(const vertical of [0,1])for(const x of [-width/2,width/2]){
    const z=(vertical?(snow?.62:.36):snow?-.38:-.22)*(row?-1:1),px=s.x+x*c-z*sn,pz=s.y+x*sn+z*c;
    points.push([px,top-height+vertical*(height-.02-row*.045),pz]);
   }fringeQuad(g,points,n>.5,row);
  }
 }
 return {chunks:[...chunks.values()],cells,roofAt,exposed};
}

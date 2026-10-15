// Measurements of the built speaking heads (dist/tactics/speaking-heads/<id>-<level>.json), posed
// as the runtime poses them (the jaw bone turning about the hinge, linear blend skinning). These
// are the instruments of the round-1 grey review (docs/tactics/hybrid-review/speaking-heads/
// reviews/round-1.md), lifted into the tree so the tests can hold the acceptance numbers it set:
// see-through in profile and rear three-quarter, mouth parts seen through a closed mouth, teeth
// and tongue against the actual skin (rooted, poking out, crowns exposed), the tongue seen from the
// front, the skin's folds through itself, and the jaw's weight along the profile jaw line.
// Everything is in the character's rest space (metres).
import fs from 'node:fs';

export const IDS=['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog','hen'];
const ROOT=new URL('../../dist/tactics/',import.meta.url);
export const loadHead=(id,level='author')=>JSON.parse(fs.readFileSync(new URL(`speaking-heads/${id}-${level==='author'?'author':'10k'}.json`,ROOT),'utf8'));
export const loadCharacter=(head,level)=>JSON.parse(fs.readFileSync(new URL(level==='author'?(head.species==='horse'?'horse-light-data.json':head.character.replace('10k','author')):head.character,ROOT),'utf8'));

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const vtx=(P,i)=>[P[i*3],P[i*3+1],P[i*3+2]];

// Every part posed with the jaw open `deg` degrees, as the runtime poses it (speaking-head.js): the
// skin's closed shape blended in as the jaw closes (in full at 0, none from 2 degrees), then the
// skin by its jaw weights, teeth and tongue rigid on their bones. Returns [{name, kind, bone, index,
// P (Float64Array), jaw, inside, fold, lower, teeth, pi}].
export const CLOSED_FADE=2;
export function pose(head,deg){
 const [hx,hy]=head.jaw.hinge,a=deg*Math.PI/180,c=Math.cos(-a),s=Math.sin(-a),t=Math.min(1,Math.max(0,deg/CLOSED_FADE)),shut=1-t*t*(3-2*t);
 return head.parts.map((part,pi)=>{let P=part.position;const n=P.length/3,out=new Float64Array(n*3);
  if(part.closed&&shut>0){P=Float64Array.from(P);part.closed.vertices.forEach((i,k)=>{for(let j=0;j<3;j++)P[i*3+j]+=shut*part.closed.offset[k*3+j];});}
  for(let i=0;i<n;i++){const w=part.kind==='skin'?part.jaw[i]:part.bone==='jaw'?1:0,x=P[i*3],y=P[i*3+1],dx=x-hx,dy=y-hy;
   out[i*3]=x+w*(hx+dx*c-dy*s-x);out[i*3+1]=y+w*(hy+dx*s+dy*c-y);out[i*3+2]=P[i*3+2];}
  return {name:part.name,kind:part.kind,bone:part.bone,index:part.index,P:out,jaw:part.jaw,inside:part.inside,fold:part.fold,lower:part.lower,teeth:part.teeth,pi};});
}
// The mouth's middle at rest: the centroid of the skin's folding vertices (the lips' faces).
export function mouthCentre(head){const s=head.parts[0];let c=[0,0,0],k=0;for(let i=0;i<s.fold.length;i++)if(s.fold[i]>.5){for(let j=0;j<3;j++)c[j]+=s.position[i*3+j];k++;}return c.map(v=>v/k);}

// Orthographic z-buffer. view: {dir (eye -> subject), up, center, ppu (pixels per metre), w, h,
// both}. Back faces are culled, as the renderer draws the parts (FrontSide; `both` draws them
// too). Returns {depth (larger nearer), id (part index), tri, w, h, right, up}. Edge-on triangles
// skipped.
export function raster(parts,view){
 const {w,h,ppu,center}=view,d=norm(view.dir),right=norm(cross(d,view.up)),up=cross(right,d);
 const depth=new Float32Array(w*h).fill(-Infinity),id=new Int16Array(w*h).fill(-1),tri=new Int32Array(w*h).fill(-1);
 for(const part of parts){const P=part.P,n=P.length/3,sx=new Float64Array(n),sy=new Float64Array(n),sz=new Float64Array(n);
  for(let i=0;i<n;i++){const v=[P[i*3]-center[0],P[i*3+1]-center[1],P[i*3+2]-center[2]];sx[i]=w/2+dot(v,right)*ppu;sy[i]=h/2-dot(v,up)*ppu;sz[i]=-dot(v,d);}
  const ix=part.index;
  for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],e=ix[t+2];
   const area=(sx[b]-sx[a])*(sy[e]-sy[a])-(sx[e]-sx[a])*(sy[b]-sy[a]);if(Math.abs(area)<1e-9||area>0&&!view.both)continue;
   const x0=Math.max(0,Math.floor(Math.min(sx[a],sx[b],sx[e]))),x1=Math.min(w-1,Math.ceil(Math.max(sx[a],sx[b],sx[e])));
   const y0=Math.max(0,Math.floor(Math.min(sy[a],sy[b],sy[e]))),y1=Math.min(h-1,Math.ceil(Math.max(sy[a],sy[b],sy[e])));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const px=x+.5,py=y+.5;
    const w0=((sx[b]-px)*(sy[e]-py)-(sx[e]-px)*(sy[b]-py))/area,w1=((sx[e]-px)*(sy[a]-py)-(sx[a]-px)*(sy[e]-py))/area,w2=1-w0-w1;
    if(w0<-1e-9||w1<-1e-9||w2<-1e-9)continue;const z=w0*sz[a]+w1*sz[b]+w2*sz[e],k=y*w+x;if(z<=depth[k])continue;depth[k]=z;id[k]=part.pi;tri[k]=t/3;}}}
 return {depth,id,tri,w,h,right,up};
}

// Segment-triangle (Moller-Trumbore), endpoints excluded slightly; triangle-triangle by edges.
function segTri(p,q,a,b,c){const e1=sub(b,a),e2=sub(c,a),dir=sub(q,p),pv=cross(dir,e2),det=dot(e1,pv);if(Math.abs(det)<1e-14)return false;const inv=1/det,tv=sub(p,a),u=dot(tv,pv)*inv;if(u<0||u>1)return false;const qv=cross(tv,e1),v=dot(dir,qv)*inv;if(v<0||u+v>1)return false;const t=dot(e2,qv)*inv;return t>1e-7&&t<1-1e-7;}
function triTri(A,B){for(let k=0;k<3;k++){if(segTri(A[k],A[(k+1)%3],B[0],B[1],B[2]))return true;if(segTri(B[k],B[(k+1)%3],A[0],A[1],A[2]))return true;}return false;}
// Closest point on a triangle (Ericson).
function closestOnTri(p,a,b,c){
 const ab=sub(b,a),ac=sub(c,a),ap=sub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
 const bp=sub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0){const v=d1/(d1-d3);return [a[0]+v*ab[0],a[1]+v*ab[1],a[2]+v*ab[2]];}
 const cp=sub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0){const w=d2/(d2-d6);return [a[0]+w*ac[0],a[1]+w*ac[1],a[2]+w*ac[2]];}
 const va=d3*d6-d5*d4;if(va<=0&&(d4-d3)>=0&&(d5-d6)>=0){const w=(d4-d3)/((d4-d3)+(d5-d6));return [b[0]+w*(c[0]-b[0]),b[1]+w*(c[1]-b[1]),b[2]+w*(c[2]-b[2])];}
 const den=1/(va+vb+vc),v=vb*den,w=vc*den;return [a[0]+ab[0]*v+ac[0]*w,a[1]+ab[1]*v+ac[1]*w,a[2]+ab[2]*v+ac[2]*w];}

// A posed skin as a solid: inside (by the parity of three axis-aligned rays, two of three to agree)
// and the nearest triangle (distance, and whether it is outer skin: all three vertices under
// inside .5), both through grids.
// A triangle of the outer skin: none of its vertices the mouth's (inside) or the lips' faces and
// the cheeks between them (fold), which are the mouth's when it opens.
const outerTri=(skin,t)=>{const I=skin.index;for(let k=0;k<3;k++){const i=I[t*3+k];if(skin.inside[i]>=.5||skin.fold[i]>=.5)return false;}return true;};
export function solid(skin){
 const P=skin.P,I=skin.index,nt=I.length/3,T=[];
 for(let t=0;t<nt;t++){const v=[vtx(P,I[t*3]),vtx(P,I[t*3+1]),vtx(P,I[t*3+2])];T.push({v,min:[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),max:[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k])),outer:outerTri(skin,t)});}
 const cell=.004,grid2=(a,b)=>{const g=new Map();T.forEach((tr,t)=>{for(let i=Math.floor(tr.min[a]/cell);i<=Math.floor(tr.max[a]/cell);i++)for(let j=Math.floor(tr.min[b]/cell);j<=Math.floor(tr.max[b]/cell);j++){const k=i+','+j;if(!g.has(k))g.set(k,[]);g.get(k).push(t);}});return g;};
 const gx=grid2(1,2),gy=grid2(0,2);
 const parity=(p,axis,sign,g,a,b)=>{const l=g.get(Math.floor(p[a]/cell)+','+Math.floor(p[b]/cell))||[];let n=0;const q=p.slice();q[axis]+=sign*10;for(const t of l)if(segTri(p,q,...T[t].v))n++;return n%2===1;};
 const inside=p=>{let v=0;if(parity(p,0,1,gx,1,2))v++;if(parity(p,0,-1,gx,1,2))v++;if(v===1&&parity(p,1,1,gy,0,2))v++;return v>=2;};
 const c3=.01,g3=new Map();T.forEach((tr,t)=>{for(let i=Math.floor(tr.min[0]/c3);i<=Math.floor(tr.max[0]/c3);i++)for(let j=Math.floor(tr.min[1]/c3);j<=Math.floor(tr.max[1]/c3);j++)for(let k=Math.floor(tr.min[2]/c3);k<=Math.floor(tr.max[2]/c3);k++){const key=i+','+j+','+k;if(!g3.has(key))g3.set(key,[]);g3.get(key).push(t);}});
 const nearest=p=>{let best=Infinity,outer=false,side=0;const c=p.map(v=>Math.floor(v/c3));
  for(let r=0;r<6;r++){for(let i=c[0]-r;i<=c[0]+r;i++)for(let j=c[1]-r;j<=c[1]+r;j++)for(let k=c[2]-r;k<=c[2]+r;k++){if(Math.max(Math.abs(i-c[0]),Math.abs(j-c[1]),Math.abs(k-c[2]))!==r)continue;const l=g3.get(i+','+j+','+k);if(!l)continue;
    for(const t of l){const q=closestOnTri(p,...T[t].v),d=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);if(d<best){best=d;outer=T[t].outer;const [a,b,e]=T[t].v;side=Math.sign(dot(sub(p,q),cross(sub(b,a),sub(e,a))));}}}
   if(best<=r*c3)break;}
  return {d:best,outer,side};};
 return {inside,nearest};
}

// The lips' front edges at the middle (rest): the frontmost folding vertices of each side.
export function lipTips(head){const s=head.parts[0],P=s.position;let up=-1,lo=-1,zmin=Infinity;
 // (nearest the middle: the lips' faces may keep no folding vertex at the middle itself)
 for(let i=0;i<P.length/3;i++)if(s.fold[i]>.5)zmin=Math.min(zmin,Math.abs(P[i*3+2]));const zr=Math.max(.008,zmin+.004);
 const near=i=>Math.abs(P[i*3+2])<=zr;
 for(let i=0;i<P.length/3;i++){if(s.fold[i]<.5||!near(i))continue;if(s.lower[i]<.5){if(up<0||P[i*3]>P[up*3])up=i;}else if(lo<0||P[i*3]>P[lo*3])lo=i;}
 return {up,lo};}

// See-through (mm^2): background seen through the head behind the mouth's front opening. The
// front opening is the mouth's own and is filled as a wall: the strip between the lips' front
// edges (each lip's frontmost face vertex per 2 mm of z, at rest, within 12 mm of the lips' front),
// and a wall from lip tip to lip tip at the middle; background the border's flood fill cannot
// reach is seen through the head. (Round 1's instrument walled the middle alone; with the mouth
// open along the whole lip line, round 3, the front opening seen at a slant left slivers behind
// that one wall.) az: 0 is exact profile, positive toward the rear; el: the eye's height, degrees
// above the level (the game's camera is 30 degrees above, at any heading). Returns {mm2 (all of
// it), largest (the largest one hole), ...}.
export function seeThrough(head,deg,az=0,{ppu=4000,size=1000,el=0}={}){
 const parts=pose(head,deg),S=parts[0].P,{up,lo}=lipTips(head),tipU=vtx(S,up),tipL=vtx(S,lo),a=az*Math.PI/180,e=el*Math.PI/180;
 const center=[(tipU[0]+tipL[0])/2-.04,(tipU[1]+tipL[1])/2,0],R=raster(parts,{dir:[Math.sin(a)*Math.cos(e),-Math.sin(e),-Math.cos(a)*Math.cos(e)],up:[0,1,0],center,ppu,w:size,h:size}),w=R.w,h=R.h,mask=new Uint8Array(w*h);
 for(let k=0;k<w*h;k++)mask[k]=R.id[k]>=0?1:0;
 const proj=p=>{const v=sub(p,center);return [w/2+dot(v,R.right)*ppu,h/2-dot(v,R.up)*ppu];};
 // the front opening: the lips' front edges (each lip's frontmost face vertex per 2 mm of z, at
 // rest), within 12 mm of the lips' front, the strip between them filled
 const skin=head.parts[0],RP=skin.position,front=new Map();let xmax=-Infinity;
 for(let i=0;i<RP.length/3;i++){if(skin.fold[i]<.5||(skin.lower[i]>.02&&skin.lower[i]<.98))continue;xmax=Math.max(xmax,RP[i*3]);const key=Math.round(RP[i*3+2]/.002)+':'+(skin.lower[i]<.5?0:1),b=front.get(key);if(b===undefined||RP[i*3]>RP[b*3])front.set(key,i);}
 const zbs=[...new Set([...front.keys()].map(k=>+k.split(':')[0]))].sort((p,q)=>p-q).filter(zb=>{const u=front.get(zb+':0'),l=front.get(zb+':1');return u!==undefined&&l!==undefined&&RP[u*3]>xmax-.012&&RP[l*3]>xmax-.012;});
 const fill=(A,B,C)=>{const x0=Math.max(0,Math.floor(Math.min(A[0],B[0],C[0]))),x1=Math.min(w-1,Math.ceil(Math.max(A[0],B[0],C[0]))),y0=Math.max(0,Math.floor(Math.min(A[1],B[1],C[1]))),y1=Math.min(h-1,Math.ceil(Math.max(A[1],B[1],C[1])));
  const d=(B[0]-A[0])*(C[1]-A[1])-(C[0]-A[0])*(B[1]-A[1]);if(Math.abs(d)<1e-9)return;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const u=((B[0]-x)*(C[1]-y)-(C[0]-x)*(B[1]-y))/d,v=((C[0]-x)*(A[1]-y)-(A[0]-x)*(C[1]-y))/d;if(u>=-.01&&v>=-.01&&u+v<=1.02&&!mask[y*w+x])mask[y*w+x]=2;}};
 for(let k=1;k<zbs.length;k++){if(zbs[k]-zbs[k-1]>2)continue;const [u0,u1,l0,l1]=[front.get(zbs[k-1]+':0'),front.get(zbs[k]+':0'),front.get(zbs[k-1]+':1'),front.get(zbs[k]+':1')].map(i=>proj(vtx(S,i)));fill(u0,u1,l1);fill(u0,l1,l0);}
 const walls=[[tipU,tipL]];
 for(const path of walls)for(let q=1;q<path.length;q++){const [ax,ay]=proj(path[q-1]),[bx,by]=proj(path[q]),steps=Math.ceil(Math.hypot(bx-ax,by-ay))*2+1;
  for(let s=0;s<=steps;s++){const x=Math.round(ax+(bx-ax)*s/steps),y=Math.round(ay+(by-ay)*s/steps);for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<w&&Y<h&&!mask[Y*w+X])mask[Y*w+X]=2;}}}
 const seen=new Uint8Array(w*h),stack=[];for(let x=0;x<w;x++)stack.push(x,(h-1)*w+x);for(let y=0;y<h;y++)stack.push(y*w,y*w+w-1);
 while(stack.length){const k=stack.pop();if(seen[k]||mask[k])continue;seen[k]=1;const x=k%w,y=(k-x)/w;if(x>0)stack.push(k-1);if(x<w-1)stack.push(k+1);if(y>0)stack.push(k-w);if(y<h-1)stack.push(k+w);}
 let holes=0;for(let k=0;k<w*h;k++)if(!mask[k]&&!seen[k])holes++;
 // the largest one hole (4-connected): a way through the head is one; the slivers a jagged lip's
 // edge encloses are many and small
 const done=new Uint8Array(w*h);let largest=0;for(let k0=0;k0<w*h;k0++){if(mask[k0]||seen[k0]||done[k0])continue;let n=0;const st=[k0];done[k0]=1;
  while(st.length){const k=st.pop();n++;const x=k%w,y=(k-x)/w;for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&!mask[j]&&!seen[j]&&!done[j]){done[j]=1;st.push(j);}}largest=Math.max(largest,n);}
 return {mm2:holes/(ppu*ppu)*1e6,largest:largest/(ppu*ppu)*1e6,mask,seen,R,parts};
}

// Closed (jaw 0): the most tooth and tongue area (mm^2) any of 120 directions around the face sees,
// and the most mouth interior (skin whose three vertices are all inside .5), at 10 px/mm over 9 cm
// about the mouth, back faces culled as the renderer culls them (round 2: at 4 px/mm, drawing back
// faces, it saw none of the leaks the renderer showed). The hen's head part (her beak sits in it) is
// drawn too.
export function closedVisibility(head,level,{ppu=10000,size=900,occluder=null}={}){
 const parts=pose(head,0),skin=head.parts[0];
 if(occluder)parts.push({name:'occluder',kind:'occluder',index:occluder.index,P:Float64Array.from(occluder.position),pi:parts.length});
 const interior=new Uint8Array(skin.index.length/3);for(let t=0;t<interior.length;t++)interior[t]=Math.min(skin.inside[skin.index[t*3]],skin.inside[skin.index[t*3+1]],skin.inside[skin.index[t*3+2]])>.5?1:0;
 const center=mouthCentre(head);let worst={teeth:0},worstInterior={interior:0};
 for(let el=-60;el<=45;el+=15)for(let az=-105;az<=105;az+=15){const e=[Math.cos(el*Math.PI/180)*Math.cos(az*Math.PI/180),Math.sin(el*Math.PI/180),Math.cos(el*Math.PI/180)*Math.sin(az*Math.PI/180)];
  const R=raster(parts,{dir:e.map(v=>-v),up:[0,1,0],center,ppu,w:size,h:size});let teeth=0,inner=0;
  for(let k=0;k<R.id.length;k++){const pi=R.id[k];if(pi<0)continue;const kind=parts[pi].kind;if(kind==='teeth'||kind==='tongue')teeth++;else if(pi===0&&interior[R.tri[k]])inner++;}
  const mm=1e6/(ppu*ppu);if(teeth*mm>worst.teeth)worst={teeth:teeth*mm,az,el};if(inner*mm>worstInterior.interior)worstInterior={interior:inner*mm,az,el};}
 return {teeth:worst,interior:worstInterior};
}

// Teeth and tongue against the posed skin: for each tooth (and the tongue), how many of its vertices
// lie inside the skin's solid (rooted when any), and those outside whose nearest skin is outer skin,
// on its outer side (poking out), with how far. (Round 3: with the mouth open along the whole lip
// line a crown stands in the opening, outside the solid, nearer a lip's outer edge than anything:
// on that skin's inner side it is not through it.) Returns [{part, kind, tooth, n, inside, poke, maxPoke}].
export function partsAgainstSkin(head,deg){
 const parts=pose(head,deg),S=solid(parts[0]),out=[];
 for(const part of parts.slice(1)){const groups=part.teeth?part.teeth.map((t,i)=>({tooth:i,kind:t.kind,first:t.first,count:t.count})):[{tooth:null,kind:part.kind,first:0,count:part.P.length/3}];
  for(const g of groups){let inside=0,poke=0,maxPoke=0;for(let i=g.first;i<g.first+g.count;i++){const p=vtx(part.P,i);if(S.inside(p)){inside++;continue;}const N=S.nearest(p);if(N.outer&&N.side>0){poke++;maxPoke=Math.max(maxPoke,N.d);}}
   out.push({part:part.name,kind:g.kind,tooth:g.tooth,n:g.count,inside,poke,maxPoke});}}
 return out;
}

// Teeth and tongue against the skin's own triangles, posed (round 2's reviewer's instrument): for
// each part, the skin triangles it crosses, by the skin's class there: the lips' faces and the
// cheeks between them (`face`: any vertex folding), the mouth inside (`inside`: all three under the
// approved surface past .5) or the outer skin. A tooth is rooted where it crosses the gum (inside);
// through a lip's face or a cheek it shows. Returns [{part, kind, face, inside, outer}] (triangles).
export function partsCrossSkin(head,deg,{cell=.004}={}){
 const parts=pose(head,deg),S=head.parts[0],tris=(part,keep=()=>true)=>{const P=part.P,I=part.index,o=[];for(let t=0;t<I.length/3;t++){if(!keep(t))continue;const v=[0,1,2].map(k=>{const i=I[t*3+k];return [P[i*3],P[i*3+1],P[i*3+2]];});o.push({t,v,min:[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),max:[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k]))});}return o;};
 const cls=t=>{const v=[S.index[t*3],S.index[t*3+1],S.index[t*3+2]];return v.some(i=>S.fold[i]>.5)?'face':v.every(i=>S.inside[i]>=.5)?'inside':'outer';};
 const skin=tris(parts[0]),grid=new Map();skin.forEach((b,j)=>{for(let x=Math.floor(b.min[0]/cell);x<=Math.floor(b.max[0]/cell);x++)for(let y=Math.floor(b.min[1]/cell);y<=Math.floor(b.max[1]/cell);y++)for(let z=Math.floor(b.min[2]/cell);z<=Math.floor(b.max[2]/cell);z++){const k=x+','+y+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(j);}});
 return parts.slice(1).map(part=>{const hit=new Set();for(const a of tris(part)){const cand=new Set();
   for(let x=Math.floor(a.min[0]/cell);x<=Math.floor(a.max[0]/cell);x++)for(let y=Math.floor(a.min[1]/cell);y<=Math.floor(a.max[1]/cell);y++)for(let z=Math.floor(a.min[2]/cell);z<=Math.floor(a.max[2]/cell);z++){const l=grid.get(x+','+y+','+z);if(l)for(const j of l)cand.add(j);}
   for(const j of cand){const b=skin[j];if([0,1,2].some(d=>b.min[d]>a.max[d]||b.max[d]<a.min[d]))continue;if(triTri(a.v,b.v))hit.add(b.t);}}
  const out={part:part.name,kind:part.kind,face:0,inside:0,outer:0};for(const t of hit)out[cls(t)]++;return out;});
}

// The open mouth's shading (round 2's reviewer's instrument, made to shade as the renderer does,
// round 3): over the lips' faces (triangles all folding) and the band between the parted lips
// (triangles graded from one lip to the other, as the build's bandNormals has them: their lower
// not all <= .02 nor all >= .98), where the lips part (every vertex's part > .2), the share of their
// area whose shading normal is more than 60 (or 30, 90) degrees off the triangle's own facing:
// stripes, or a surface lit as if it faced away. The shading normal is speaking-head.js's, sampled
// at 16 points in each triangle: the vertex normal and the band normal skinned as the GPU skins them
// (the rest normal turned by the jaw's weight), interpolated, and blended to the band's by
// smoothstep(0,.1,lower) * smoothstep(1,.9,lower) * smoothstep(.2,.6,part). Fragments the renderer
// lights evenly as the mouth's inside (its mouth factor at least .5, so their normal is at least
// 40% the eye's: speaking-head.js, round 3) are left out: they cannot stripe.
// Returns {area (m^2), over30, over60, over90}.
export function mouthShading(head,deg){
 const S=head.parts[0],P=pose(head,deg)[0].P,a=-deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),nrm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
 const B=Float64Array.from(S.normal);if(S.band)S.band.vertices.forEach((i,k)=>{for(let j=0;j<3;j++)B[i*3+j]=S.band.normal[k*3+j];});
 const skinned=(A,i)=>{const n=[A[i*3],A[i*3+1],A[i*3+2]],w=S.jaw[i],r=[n[0]*c-n[1]*s,n[0]*s+n[1]*c,n[2]];return n.map((v,k)=>v*(1-w)+r[k]*w);};
 const smooth=(e0,e1,x)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
 const K=4,at=[];for(let i=0;i<K;i++)for(let j=0;i+j<K;j++){at.push([(3*i+1)/(3*K),(3*j+1)/(3*K)]);if(i+j<K-1)at.push([(3*i+2)/(3*K),(3*j+2)/(3*K)]);}
 const open=smooth(0,2,deg);let tot=0,o30=0,o60=0,o90=0;
 for(let t=0;t<S.index.length/3;t++){const v=[S.index[t*3],S.index[t*3+1],S.index[t*3+2]];if(!v.every(i=>S.part[i]>.2))continue;
  const band=!(v.every(i=>S.lower[i]<=.02)||v.every(i=>S.lower[i]>=.98));if(!band&&!v.every(i=>S.fold[i]>.5))continue;
  const p=v.map(i=>[P[i*3],P[i*3+1],P[i*3+2]]),f=cross(sub(p[1],p[0]),sub(p[2],p[0])),A=Math.hypot(...f)/2;if(A<1e-9)continue;const fn=nrm(f);
  const nv=v.map(i=>nrm(skinned(S.normal,i))),bv=v.map(i=>skinned(B,i));
  for(const [u,w] of at){const b0=1-u-w,W=[b0,u,w],lerp=X=>[0,1,2].map(k=>W[0]*X[0][k]+W[1]*X[1][k]+W[2]*X[2][k]);
   const lower=W[0]*S.lower[v[0]]+W[1]*S.lower[v[1]]+W[2]*S.lower[v[2]],part=W[0]*S.part[v[0]]+W[1]*S.part[v[1]]+W[2]*S.part[v[2]];
   const fold=W[0]*S.fold[v[0]]+W[1]*S.fold[v[1]]+W[2]*S.fold[v[2]],inside=W[0]*S.inside[v[0]]+W[1]*S.inside[v[1]]+W[2]*S.inside[v[2]];
   const g=part*4*lower*(1-lower)*open,m=Math.max(inside*(1+(open-1)*fold),smooth(0,.35,g),smooth(.9,1,fold)*open*(1-smooth(.6,1,part)));if(m>=.5)continue;
   const bf=smooth(0,.1,lower)*(1-smooth(.9,1,lower))*smooth(.2,.6,part),nr=nrm(lerp(nv)),nb=nrm(lerp(bv)),n=nrm(nr.map((x,k)=>x*(1-bf)+nb[k]*bf));
   const ang=Math.acos(Math.max(-1,Math.min(1,dot(n,fn))))*180/Math.PI,da=A/at.length;tot+=da;if(ang>30)o30+=da;if(ang>60)o60+=da;if(ang>90)o90+=da;}}
 return {area:tot,over30:tot?o30/tot:0,over60:tot?o60/tot:0,over90:tot?o90/tot:0};
}

// Exposed crowns: for each tooth, the largest distance from the posed skin of its vertices outside it.
export function crownExposure(head,deg){
 const parts=pose(head,deg),S=solid(parts[0]),out=[];
 for(const part of parts.slice(1).filter(p=>p.teeth))part.teeth.forEach((t,i)=>{let crown=0;for(let k=t.first;k<t.first+t.count;k++){const p=vtx(part.P,k);if(!S.inside(p))crown=Math.max(crown,S.nearest(p).d);}out.push({part:part.name,kind:t.kind,tooth:i,crown});});
 return out;
}

// The share of the tongue's own silhouette that is seen with everything drawn, from a view
// (azimuth and elevation, degrees; az 0 el 0 is straight in front).
export function tongueVisible(head,deg,az=0,el=0,{ppu=5000,size=700}={}){
 const parts=pose(head,deg),ti=parts.findIndex(p=>p.kind==='tongue');if(ti<0)return null;const T=parts[ti],n=T.P.length/3;let c=[0,0,0];for(let i=0;i<n;i++)for(let k=0;k<3;k++)c[k]+=T.P[i*3+k]/n;
 const a=az*Math.PI/180,e=el*Math.PI/180,eye=[Math.cos(e)*Math.cos(a),Math.sin(e),Math.cos(e)*Math.sin(a)],view={dir:eye.map(v=>-v),up:[0,1,0],center:c,ppu,w:size,h:size};
 const alone=raster([{...T,pi:0}],view),all=raster(parts,view);let s=0,v=0;for(let k=0;k<alone.id.length;k++)if(alone.id[k]===0){s++;if(all.id[k]===ti)v++;}
 return s?v/s:0;
}

// The skin through itself near the mouth (within `reach` of it in x and y), posed: pairs of
// triangles that cross, and of those the pairs of outer skin.
export function selfIntersections(head,deg,{reach=.12,cell=.005}={}){
 const parts=pose(head,deg),skin=parts[0],P=skin.P,I=skin.index,c=mouthCentre(head),T=[];
 const outer=t=>outerTri(skin,t);
 for(let t=0;t<I.length/3;t++){const i=I[t*3];if(Math.hypot(P[i*3]-c[0],P[i*3+1]-c[1])>reach)continue;const ids=[I[t*3],I[t*3+1],I[t*3+2]],v=ids.map(k=>vtx(P,k));T.push({t,ids,v,min:[0,1,2].map(k=>Math.min(v[0][k],v[1][k],v[2][k])),max:[0,1,2].map(k=>Math.max(v[0][k],v[1][k],v[2][k]))});}
 const grid=new Map();T.forEach((tr,j)=>{for(let x=Math.floor(tr.min[0]/cell);x<=Math.floor(tr.max[0]/cell);x++)for(let y=Math.floor(tr.min[1]/cell);y<=Math.floor(tr.max[1]/cell);y++)for(let z=Math.floor(tr.min[2]/cell);z<=Math.floor(tr.max[2]/cell);z++){const k=x+','+y+','+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(j);}});
 const hits=[];
 T.forEach((A,i)=>{const cand=new Set();for(let x=Math.floor(A.min[0]/cell);x<=Math.floor(A.max[0]/cell);x++)for(let y=Math.floor(A.min[1]/cell);y<=Math.floor(A.max[1]/cell);y++)for(let z=Math.floor(A.min[2]/cell);z<=Math.floor(A.max[2]/cell);z++){const l=grid.get(x+','+y+','+z);if(l)for(const j of l)if(j>i)cand.add(j);}
  for(const j of cand){const B=T[j];if(B.ids.some(v=>A.ids.includes(v)))continue;if(B.min[0]>A.max[0]||B.max[0]<A.min[0]||B.min[1]>A.max[1]||B.max[1]<A.min[1]||B.min[2]>A.max[2]||B.max[2]<A.min[2])continue;
   if(triTri(A.v,B.v))hits.push({a:A.t,b:B.t,outer:outer(A.t)&&outer(B.t),at:[0,1,2].map(k=>(A.v[0][k]+A.v[1][k]+A.v[2][k]+B.v[0][k]+B.v[1][k]+B.v[2][k])/6)});}});
 return {pairs:hits.length,outer:hits.filter(h=>h.outer).length,hits};
}

// The jaw's weight along the profile jaw line, as seen: the skin at rest drawn from the side, and in
// each half-millimetre column from the jaw's angle to the lower lip's tip, the weight where its
// lowest pixel is (interpolated across that triangle), and which side of the lips it is (lower,
// 0 the upper). Left out: the first 3 mm past the angle, where the underside rises steeply out of
// the throat (the throat's blend meets the jaw there: the pig-director's chin rises 13 mm in
// them); at the front, the columns where the upper lip is the lowest (it overhangs the lower
// lip's tip); and any column whose lowest point is not below the lips (the lowest of the lips'
// folded faces within 1.5 mm, less half a millimetre): there the lips meet, and a thin lower lip's
// edge can leave a column only the upper lip covers (the cow's, 0.5 mm wide). Returns [{x, y, w, lower}].
export function jawLine(head,{ppu=2000,size=800}={}){
 const s=head.parts[0],P=s.position,I=s.index,c=mouthCentre(head),angle=head.jaw.angle[0];let tip=-Infinity;
 for(let i=0;i<P.length/3;i++)if(s.jaw[i]>.98&&Math.abs(P[i*3+2])<.01)tip=Math.max(tip,P[i*3]);
 const W=size,H=size,sx=x=>W/2+(x-c[0])*ppu,sy=y=>H/2-(y-c[1])*ppu,low=new Float32Array(W).fill(-1),wt=new Float32Array(W),lw=new Float32Array(W);
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]],X=v.map(i=>sx(P[i*3])),Y=v.map(i=>sy(P[i*3+1]));
  const area=(X[1]-X[0])*(Y[2]-Y[0])-(X[2]-X[0])*(Y[1]-Y[0]);if(Math.abs(area)<1e-9)continue;
  const x0=Math.max(0,Math.floor(Math.min(...X))),x1=Math.min(W-1,Math.ceil(Math.max(...X))),y0=Math.max(0,Math.floor(Math.min(...Y))),y1=Math.min(H-1,Math.ceil(Math.max(...Y)));
  for(let x=x0;x<=x1;x++)for(let y=y1;y>=y0;y--){if(y<=low[x])break;const px=x+.5,py=y+.5;
   const w0=((X[1]-px)*(Y[2]-py)-(X[2]-px)*(Y[1]-py))/area,w1=((X[2]-px)*(Y[0]-py)-(X[0]-px)*(Y[2]-py))/area,w2=1-w0-w1;if(w0<-1e-9||w1<-1e-9||w2<-1e-9)continue;
   low[x]=y;wt[x]=w0*s.jaw[v[0]]+w1*s.jaw[v[1]]+w2*s.jaw[v[2]];lw[x]=w0*s.lower[v[0]]+w1*s.lower[v[1]]+w2*s.lower[v[2]];break;}}
 const lips=[];for(let i=0;i<P.length/3;i++)if(s.fold[i]>.5)lips.push([P[i*3],P[i*3+1]]);
 const lipAt=x=>{let y=Infinity;for(const [u,v] of lips)if(Math.abs(u-x)<.0015)y=Math.min(y,v);return y;};
 const out=[];for(let x=0;x<W;x++){const wx=c[0]+(x+.5-W/2)/ppu,wy=c[1]-(low[x]+.5-H/2)/ppu;if(low[x]<0||wx<angle+.003||wx>tip-.001||wy>lipAt(wx)-.0005)continue;out.push({x:wx,y:wy,w:wt[x],lower:lw[x]});}
 while(out.length&&out.at(-1).lower<.5)out.pop();
 return out;
}
// The reviewer's first instrument for it: the lowest outer vertex in each 5 mm of x (a coarse mesh
// can leave a bin no vertex on the underside, and give it one on the cheek).
export function jawLineVertices(head){
 const s=head.parts[0],P=s.position,[hx,hy]=head.jaw.hinge,angle=head.jaw.angle[0];let tip=-Infinity;
 for(let i=0;i<P.length/3;i++)if(s.jaw[i]>.98&&Math.abs(P[i*3+2])<.01)tip=Math.max(tip,P[i*3]);
 const bins=new Map();for(let i=0;i<P.length/3;i++){const x=P[i*3],y=P[i*3+1];if(s.inside[i]>.2||x<angle||x>tip||y>hy-.02)continue;const b=Math.floor((x-hx)/.005),cur=bins.get(b);if(!cur||y<cur.y)bins.set(b,{x,y,w:s.jaw[i]});}
 return [...bins.values()].sort((a,b)=>a.x-b.x);
}

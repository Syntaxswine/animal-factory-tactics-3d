// Measurements of the built speaking heads (dist/tactics/speaking-heads/<id>-<level>.json), posed
// as the runtime poses them (the jaw bone turning about the hinge, linear blend skinning). These
// are the instruments of the round-1 grey review (docs/tactics/hybrid-review/speaking-heads/
// reviews/round-1.md), lifted into the tree so the tests can hold the acceptance numbers it set:
// see-through in profile and rear three-quarter, mouth parts seen through a closed mouth, teeth
// and tongue against the actual skin (rooted, poking out, crowns exposed), the tongue seen from the
// front, the skin's folds through itself, and the jaw's weight along the profile jaw line.
// Everything is in the character's rest space (metres).
import fs from 'node:fs';
import {sub,dot,cross,norm,vtx,CLOSED_FADE,pose,raster,closedVisibility,segTri,triTri,lipTips,holesThrough,partsCrossSkin,closestOnTri,outerTri,solid,crownExposure} from './view.mjs';
export {CLOSED_FADE,pose,raster,closedVisibility,lipTips,holesThrough,partsCrossSkin,solid,crownExposure};

export const IDS=['horse','goat','bull','cow','donkey','sheep','skunk','pig-foreman','pig-director','rabbit','dog','hen'];
const ROOT=new URL('../../dist/tactics/',import.meta.url);
export const loadHead=(id,level='author')=>JSON.parse(fs.readFileSync(new URL(`speaking-heads/${id}-${level==='author'?'author':'10k'}.json`,ROOT),'utf8'));
export const loadCharacter=(head,level)=>JSON.parse(fs.readFileSync(new URL(level==='author'?(head.species==='horse'?'horse-light-data.json':head.character.replace('10k','author')):head.character,ROOT),'utf8'));


// The mouth's middle at rest: the centroid of the skin's folding vertices (the lips' faces).
export function mouthCentre(head){const s=head.parts[0];let c=[0,0,0],k=0;for(let i=0;i<s.fold.length;i++)if(s.fold[i]>.5){for(let j=0;j<3;j++)c[j]+=s.position[i*3+j];k++;}return c.map(v=>v/k);}


const outerIndex=skin=>{const out=[];for(let t=0;t<skin.index.length/3;t++)if(outerTri(skin,t))out.push(skin.index[t*3],skin.index[t*3+1],skin.index[t*3+2]);return out;};


// The mouth's front opening, as a curtain (round 4): the lips' edges (the outer skin's boundary
// and each lip face's vertices next to it; a game mesh's reduction can take a lip's face into the
// outer skin) in front of the cavity's front corners (the build's head.mouth.frontCorner, less
// 2 mm), and each lip's front 2 mm at least (the skunk's cavity narrows to 3 mm across at its
// front, and its game mesh's lower lip has no edge in front of that), every edge of one lip's drawn
// to the other lip's (each end to that lip's nearest edge vertex at rest). Returns triangles over
// the skin's vertices: drawn posed, both sides, it closes the front opening in every view as a
// surface, where it is. (Round 3 filled a strip between the lips' frontmost face vertices per 2 mm
// of z within 12 mm of the front, in the picture, wherever the background showed: on a flat-fronted
// muzzle it covered 4 mm, not the opening, and it could close pockets of the background outside the
// head.) `whole`: over the lips' whole edges, the sides too, a wall where rounds 3 and 4 stood the
// lining (the open-sides test's falsifier).
export function frontCurtain(head,{whole=false}={}){
 const s=head.parts[0],P=s.position,I=s.index,n=P.length/3,x0=whole?-Infinity:head.mouth.frontCorner[0]-.002;
 const outer=i=>s.fold[i]<.5&&s.inside[i]<.5,side=i=>s.lower[i]<=.02?0:s.lower[i]>=.98?1:-1,edge=new Uint8Array(n),rim=new Uint8Array(n),front=[-Infinity,-Infinity];
 for(let t=0;t<I.length;t+=3){const v=[I[t],I[t+1],I[t+2]];if(!v.some(outer)||v.every(outer))continue;for(const i of v)if((outer(i)||s.fold[i]>.5)&&side(i)>=0){edge[i]=1;front[side(i)]=Math.max(front[side(i)],P[i*3]);}}
 for(let i=0;i<n;i++)if(edge[i]&&P[i*3]>Math.min(x0,front[side(i)]-.002))rim[i]=1;
 const of=[[],[]];for(let i=0;i<n;i++)if(rim[i])of[side(i)].push(i);
 if(!of[0].length||!of[1].length)throw Error(`frontCurtain: ${head.species}-${head.level} has no ${of[0].length?'lower':'upper'} rim in front of its cavity's front corners`);
 const nearest=(i,list)=>{let b=-1,d=Infinity;for(const j of list){const e=(P[i*3]-P[j*3])**2+(P[i*3+1]-P[j*3+1])**2+(P[i*3+2]-P[j*3+2])**2;if(e<d){d=e;b=j;}}return b;};
 const partner=new Map();for(const k of [0,1])for(const i of of[k])partner.set(i,nearest(i,of[1-k]));
 const out=[],seen=new Set();
 for(let t=0;t<I.length;t+=3)for(let k=0;k<3;k++){const a=I[t+k],b=I[t+(k+1)%3];if(!rim[a]||!rim[b]||side(a)!==side(b))continue;const key=a<b?a+':'+b:b+':'+a;if(seen.has(key))continue;seen.add(key);
  const pa=partner.get(a),pb=partner.get(b);out.push(a,b,pb);if(pa!==pb)out.push(a,pb,pa);}
 return new Uint32Array(out);
}

// See-through (mm^2): background seen through the head behind the mouth's front opening, which is
// the mouth's own and is closed by a curtain (frontCurtain); background the border's flood fill
// cannot reach is seen through the head. Throws if the head is not in the frame: the lips' tips
// both inside it and the skin over 2% of it (round 3's found no upper lip on four game meshes, drew
// nothing and read 0). az: 0 is exact profile from the left (+z), 180 from the right, positive
// toward the rear; el: the eye's height, degrees above the level (the game's camera is 30 degrees
// above, at any heading). `outerOnly` draws the outer skin alone (no lips' faces, mouth, teeth or
// tongue): what shows through it is the opening between the lips. Returns {mm2 (all of it),
// largest (the largest one hole), ...}.
export function seeThrough(head,deg,az=0,{ppu=4000,size=1000,el=0,outerOnly=false}={}){
 const posed=pose(head,deg),S=posed[0].P,{up,lo}=lipTips(head),tipU=vtx(S,up),tipL=vtx(S,lo),a=az*Math.PI/180,e=el*Math.PI/180;
 const parts=outerOnly?[{...posed[0],index:outerIndex(head.parts[0])}]:posed;
 if(!head.mouth?.frontCorner)throw Error(`seeThrough: ${head.species}-${head.level} has no front corner (rebuild it)`);
 const curtain={name:'front opening',kind:'curtain',index:frontCurtain(head),P:S,pi:parts.length,both:true};
 const center=[(tipU[0]+tipL[0])/2-.04,(tipU[1]+tipL[1])/2,0],R=raster([...parts,curtain],{dir:[Math.sin(a)*Math.cos(e),-Math.sin(e),-Math.cos(a)*Math.cos(e)],up:[0,1,0],center,ppu,w:size,h:size}),w=R.w,h=R.h,mask=new Uint8Array(w*h);
 let skinPixels=0;for(let k=0;k<w*h;k++){mask[k]=R.id[k]<0?0:R.id[k]===curtain.pi?2:1;if(R.id[k]===0)skinPixels++;}
 const proj=p=>{const v=sub(p,center);return [w/2+dot(v,R.right)*ppu,h/2-dot(v,R.up)*ppu];},framed=p=>{const [x,y]=proj(p);return x>=0&&y>=0&&x<w&&y<h;};
 if(skinPixels<w*h*.02||!framed(tipU)||!framed(tipL))throw Error(`seeThrough: ${head.species}-${head.level} at ${deg}°, ${az}° round, ${el}° up: the head is not in the frame (${skinPixels} pixels of skin)`);
 const seen=new Uint8Array(w*h),stack=[];for(let x=0;x<w;x++)stack.push(x,(h-1)*w+x);for(let y=0;y<h;y++)stack.push(y*w,y*w+w-1);
 while(stack.length){const k=stack.pop();if(seen[k]||mask[k])continue;seen[k]=1;const x=k%w,y=(k-x)/w;if(x>0)stack.push(k-1);if(x<w-1)stack.push(k+1);if(y>0)stack.push(k-w);if(y<h-1)stack.push(k+w);}
 let holes=0;for(let k=0;k<w*h;k++)if(!mask[k]&&!seen[k])holes++;
 // the largest one hole (4-connected): a way through the head is one; the slivers a jagged lip's
 // edge encloses are many and small
 const done=new Uint8Array(w*h);let largest=0;for(let k0=0;k0<w*h;k0++){if(mask[k0]||seen[k0]||done[k0])continue;let n=0;const st=[k0];done[k0]=1;
  while(st.length){const k=st.pop();n++;const x=k%w,y=(k-x)/w;for(const j of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(j>=0&&!mask[j]&&!seen[j]&&!done[j]){done[j]=1;st.push(j);}}largest=Math.max(largest,n);}
 return {mm2:holes/(ppu*ppu)*1e6,largest:largest/(ppu*ppu)*1e6,mask,seen,R,parts};
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


// The open mouth's shading (round 2's reviewer's instrument, made to shade as the renderer does,
// round 3): over the lips' faces (triangles all folding) and the band between the parted lips
// (triangles graded from one lip to the other, as the build's bandNormals has them: their lower
// not all <= .02 nor all >= .98), where the lips part (every vertex's part > .2), the share of their
// area whose shading normal is more than 60 (or 30, 90) degrees off the triangle's own facing:
// stripes, or a surface lit as if it faced away. The shading normal is speaking-head.js's, sampled
// at 16 points in each triangle: the vertex normal and the band normal skinned as the GPU skins them
// (the rest normal turned by the jaw's weight), interpolated, and blended to the band's by
// smoothstep(0,.1,lower) * smoothstep(1,.9,lower) * smoothstep(.2,.6,part). Fragments the renderer
// lights as the mouth's inside (its mouth factor at least .5) are left out: speaking-head.js pulls
// their normals at least 40% of the way to the eye (a normal turned wholly away still faces away,
// but round 3's review's light-only renders found the inside lit evenly).
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
 // (nor the throat: its front edge, where the profile drops behind the jaw's angle, can fall a
 // column past the angle's 3 mm, the pig director's 46 mm below its jaw line at 3.1 mm, after the
 // architect's follow-up's rebuild moved it 0.2 mm; the jaw line is continuous from there on)
 while(out.length>1&&out[1].y-out[0].y>.005)out.shift();
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

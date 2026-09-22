import {TREE_VARIANTS} from './environment.js';
// Presentation geometry only: the existing tree footprints and collision boxes
// remain the authority for movement, line of sight and cover.
export function foliageModel(kind){
 const variant=TREE_VARIANTS[kind];
 if(variant)return foliageModel(variant.base).map(p=>({...p,center:p.center.map(v=>v*variant.scale),size:p.size.map(v=>v*variant.scale)}));
 const parts=[],add=(shape,material,center,size,rotation=[0,0,0])=>parts.push({shape,material,center,size,rotation});
 const branch=(a,b,width,shape='taper')=>{const v=b.map((n,i)=>n-a[i]);add(shape,'bark',a.map((n,i)=>(n+b[i])/2),[width,Math.hypot(...v),width],[Math.atan2(v[2],v[1]),0,-Math.atan2(v[0],Math.hypot(v[1],v[2]))]);};
 branch([0,.02,0],[-.035,.86,.018],.245);branch([-.035,.75,.018],[.055,1.62,-.02],.15);
 add('taper','bark',[0,.09,0],[.34,.22,.32]);
 for(let i=0;i<5;i++){const a=i*2.4;branch([0,.15,0],[Math.cos(a)*.33,-.065,Math.sin(a)*.30],.135,'cone');}
 if(kind==='tree-pine'){
  branch([.055,1.45,-.02],[.015,2.30,0],.07);
  // Three overlapping masses carry the silhouette; needle detail stays in the paint.
  add('pine-tier','pine',[0,1.12,0],[1.48,1.0,1.36],[0,.2,0]);
  add('pine-tier','pine',[.025,1.57,-.01],[1.07,.98,1.02],[0,1.1,0]);
  add('pine-tier','pine',[.015,2.0,0],[.65,.92,.64],[0,2.0,0]);
 }else{
  const limbs=[[-.46,1.47,-.18],[.40,1.59,.28],[-.22,1.81,.23],[.30,1.91,-.31]];
  add('broadleaf-crown','leaf-light',[.015,1.91,.01],[1.73,1.09,1.60],[0,.7,0]);
  for(const [i,tip]of limbs.entries()){
   branch([0,.83+i*.16,0],tip,.11-i*.012);
   const [x,y,z]=tip;branch([x*.6,y-.1,z*.6],[x*1.10,y+.13,z*1.1],.055);
  }
 }
 return parts;
}

// Stable local variation survives editor rebuilds, fog updates and camera moves.
export function grassTufts(box){
 if(box.kind!=='floor'||!['yard','ground-grass','woodland'].includes(box.material))return [];
 const {x,y,z=0}=box.source,seed=(Math.imul(x+91,73856093)^Math.imul(y+37,19349663)^Math.imul(z+7,83492791))>>>0;
 const random=i=>((Math.imul(seed^(i*374761393),1597334677)>>>0)%10000)/10000;
 const count=box.material==='yard'?(seed%3===0?1:0):2,top=box.center[1]+box.size[1]/2;
 return Array.from({length:count},(_,i)=>{
  const height=.10+random(i+5)*.095;
  return {id:box.id+':tuft:'+i,source:box.source,kind:'grass',material:'grass-blade',shape:'grass-tuft',center:[x+(random(i+1)-.5)*.72,top+height/2,y+(random(i+3)-.5)*.72],size:[.20+random(i+7)*.12,height,.18+random(i+9)*.12],rotation:[0,random(i+11)*Math.PI*2,0]};
 });
}

// Traversable woodland is vegetation cover, not solid tree props. These instances
// retain the floor source for fog/floor filtering and never enter collision data.
export function coverUndergrowth(box){
 if(box.kind!=='floor'||box.material!=='woodland')return [];
 const {x,y,z=0}=box.source,seed=(Math.imul(x+17,73856093)^Math.imul(y+61,19349663)^Math.imul(z+3,83492791))>>>0;
 const random=i=>((Math.imul(seed^(i*374761393),1597334677)>>>0)%10000)/10000,top=box.center[1]+box.size[1]/2;
 return Array.from({length:3},(_,i)=>{const h=.55+random(i+3)*.6;
  return {id:box.id+':cover:'+i,source:box.source,kind:'foliage-cover',material:i===1?'leaf-light':'foliage',shape:'cover-crown',center:[x+(random(i+1)-.5)*.5,top+.12+h/2,y+(random(i+7)-.5)*.5],size:[.58+random(i+5)*.25,h,.55+random(i+11)*.28],rotation:[0,random(i+13)*Math.PI*2,0]};
 });
}

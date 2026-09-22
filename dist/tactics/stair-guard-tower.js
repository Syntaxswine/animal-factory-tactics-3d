import {DIMENSIONS} from './hybrid-world.js';
export function buildStairGuardTower(root,{box,wood,iron,material,skin,metal}){
 const H=3*DIMENSIONS.floorSpacing,m=metal?material('tower-iron',0x85938b,[.75,.12,.15,.26]):wood(skin),trim=metal?iron:wood(skin,1),shift=-.95;
 const b=(name,mat,p,s,r)=>{const o=box(root,mat,[p[0]+shift,p[1],p[2]],s,r);o.name=name;return o;};
 function beam(name,a,c,width=.10,mat=trim){const d=a.map((v,i)=>c[i]-v),o=b(name,mat,a.map((v,i)=>(v+c[i])/2),[width,Math.hypot(...d),width]);o.quaternion.setFromUnitVectors(o.up.clone(),o.up.clone().set(...d).normalize());return o;}
 for(const x of [-1.36,1.36])for(const z of [-1.36,1.36])b('house-support',trim,[x,H/2,z],[.25,H,.25]);
 for(let level=0;level<3;level++)for(const side of [-1,1]){
  const lo=level*2.12+.15,hi=(level+1)*2.12-.15;
  beam('tower-brace',[-1.36,lo,side*1.36],[1.36,hi,side*1.36],.13);beam('tower-brace',[1.36,lo,side*1.36],[-1.36,hi,side*1.36],.13);
  beam('tower-brace',[side*1.36,lo,-1.36],[side*1.36,hi,1.36],.13);
  b('frame-beam',trim,[0,hi,side*1.36],[2.9,.18,.18]);b('frame-beam',trim,[side*1.36,hi,0],[.18,.18,2.9]);
 }
 for(let i=0;i<12;i++)b('guardhouse-floor',m,[-1.375+i*.25,H-.06,0],[.245,.12,3]);
 // Paired switchback flights climb one side in three full-story stages.
 for(let flight=0;flight<6;flight++){
  const x=flight%2?2.98:1.99,dir=flight%2?-1:1,start=-dir*1.45,base=flight*1.06;
  for(let step=0;step<9;step++){const z=start+dir*(step+.5)*2.9/9,y=base+(step+1)*1.06/9;b('stair-tread',m,[x,y-.035,z],[.88,.07,2.9/9+.012]);}
  for(const side of [-1,1]){const xx=x+side*.40;beam('stair-stringer',[xx,base+.06,start],[xx,base+1.01,-start],.10);beam('stair-handrail',[xx,base+.9,start],[xx,base+1.96,-start],.065);for(const f of [0,.5,1])beam('stair-baluster',[xx,base+f*1.06+.04,start+dir*f*2.9],[xx,base+f*1.06+.9,start+dir*f*2.9],.05);}
  const y=base+1.06,z=dir*1.81;
  b('stair-landing',m,[2.485,y-.06,z],[1.89,.12,.73]);
  for(const xx of [1.55,3.42])beam('landing-post',[xx,y,z+dir*.30],[xx,y+.9,z+dir*.30],.065);
  b('landing-rail',trim,[2.485,y+.9,z+dir*.30],[1.94,.065,.065]);
  for(const xx of [1.55,3.42])b('landing-side-rail',trim,[xx,y+.9,z],[.065,.065,.67]);
 }
 // Wider final landing leads directly to the side doorway, away from the corner post.
 b('entry-landing',m,[1.985,H-.04,-1.04],[.97,.08,.98]);
 b('entry-outer-rail',trim,[2.47,H+.9,-1.04],[.065,.065,.98]);beam('entry-post',[2.47,H,-.55],[2.47,H+.9,-.55],.065);
 b('entry-end-rail',trim,[1.985,H+.9,-.55],[.97,.065,.065]);
 for(const x of [1.57,3.40])for(const z of [-2.1,2.1])b('stair-column',trim,[x,H/2,z],[.10,H,.10]);
 // Open windows on three sides, with raised sills and lintels; +X holds the door.
 for(const z of [-1.45,1.45]){
  b('house-wall',m,[0,H+.42,z],[3,.84,.10]);b('house-lintel',m,[0,H+1.91,z],[3,.22,.10]);
  for(const x of [-1.43,0,1.43])b('window-post',trim,[x,H+1.32,z],[.12,.96,.14]);
  b('window-sill',trim,[0,H+.86,z],[3.04,.07,.18]);
 }
 b('house-wall',m,[-1.45,H+.42,0],[.10,.84,3]);b('house-lintel',m,[-1.45,H+1.91,0],[.10,.22,3]);
 for(const z of [-1.43,0,1.43])b('window-post',trim,[-1.45,H+1.32,z],[.14,.96,.12]);
 b('window-sill',trim,[-1.45,H+.86,0],[.18,.07,3.04]);
 for(const [z,length]of [[-1.375,.25],[.575,1.85]])b('door-wall',m,[1.45,H+.99,z],[.10,1.98,length]);
 b('door-lintel',trim,[1.45,H+1.88,-.8],[.16,.24,.92]);
 for(const z of [-1.27,-.33])b('door-jamb',trim,[1.45,H+.86,z],[.16,1.72,.065]);
 // Shallow pitched roof; overhang stays separate from the stair doorway.
 for(const side of [-1,1])b('roof-panel',trim,[side*.80,H+2.25,0],[1.68,.10,3.30],[0,0,-side*.28]);
 b('roof-ridge',trim,[0,H+2.49,0],[.16,.12,3.35]);
 if(metal){for(const z of [-1.505,1.505])for(const x of [-1.3,-.65,0,.65,1.3])for(const y of [.14,.72])b('panel-rivet',iron,[x,H+y,z],[.032,.032,.018]);}
 else{for(const z of [-1.507,1.507])for(let i=0;i<12;i++)b('wood-batten',trim,[-1.375+i*.25,H+.42,z],[.027,.82,.018]);}
 root.userData.stairTower={stories:3,deckHeight:H,guardhouse:[3,3],flights:6,treadsPerFlight:9,entrySide:'+X',coreOffsetX:shift,door:{z:[-1.25,-.35],height:1.76}};
}


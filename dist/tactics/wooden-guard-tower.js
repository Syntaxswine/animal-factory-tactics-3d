import {DIMENSIONS} from './hybrid-world.js';
export const TOWER_DECK_HEIGHT=3*DIMENSIONS.floorSpacing;
// Open, walk-through ladder aperture: x[-.5,.5], z[1.25,2.25].
export function buildWoodenGuardTower(root,{box,wood,iron,skin}){
 const H=TOWER_DECK_HEIGHT,m=wood(skin),alt=wood(skin,1);
 const b=(name,mat,p,s,r)=>{const o=box(root,mat,p,s,r);o.name=name;return o;};
 function beam(name,a,c,width=.13){const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],length=Math.hypot(dx,dy,dz),o=b(name,alt,a.map((v,i)=>(v+c[i])/2),[width,length,width]);o.quaternion.setFromUnitVectors(o.up.clone(),o.up.clone().set(dx,dy,dz).normalize());return o;}
 for(const x of [-1.36,1.36])for(const z of [-1.36,1.36]){b('support-post',m,[x,H/2,z],[.26,H,.26]);for(const y of [.17,2.12,4.24,H-.24])b('iron-post-band',iron,[x,y,z],[.28,.045,.28]);}
 for(let story=0;story<3;story++){
  const low=story*DIMENSIONS.floorSpacing+.18,high=(story+1)*DIMENSIONS.floorSpacing-.20;
  for(const z of [-1.36,1.36]){b('frame-tie',m,[0,high,z],[2.72,.18,.18]);beam('cross-brace',[-1.30,low,z],[1.30,high,z]);beam('cross-brace',[1.30,low,z],[-1.30,high,z]);}
  for(const x of [-1.36,1.36]){b('frame-tie',m,[x,high,0],[.18,.18,2.72]);beam('cross-brace',[x,low,-1.30],[x,high,1.30]);beam('cross-brace',[x,low,1.30],[x,high,-1.30]);}
 }
 // Main beams and joists stop around the opening; no hidden slab under it.
 for(const x of [-1.36,1.36])b('deck-beam',m,[x,H-.24,0],[.22,.30,4.9]);
 for(const z of [-2.35,-1.25,0,1.15,2.35])b('deck-joist',alt,[0,H-.15,z],[4.9,.18,.15]);
 for(const x of [-.58,.58])b('hatch-header',m,[x,H-.15,1.75],[.16,.18,1.12]);
 for(let i=0;i<20;i++){const z=-2.5+(i+.5)*.25,segments=i>=15&&i<=18?[[-2.5,-.5],[.5,2.5]]:[[-2.5,2.5]];for(const [a,c]of segments)b('deck-plank',wood(skin,i%4),[(a+c)/2,H-.055,z],[c-a,.11,.242]);}
 for(const side of [-1,1]){
  for(const t of [-2.42,-1.21,0,1.21,2.42]){b('railing-post',m,[side*2.42,H+.48,t],[.12,.96,.12]);if(Math.abs(t)<2.4)b('railing-post',m,[t,H+.48,side*2.42],[.12,.96,.12]);}
  for(const y of [.10,.47,.94]){b('perimeter-rail',alt,[side*2.42,H+y,0],[.13,.10,4.96]);b('perimeter-rail',alt,[0,H+y,side*2.42],[4.96,.10,.13]);}
  // Knee braces support the platform's overhang on each face.
  for(const t of [-1.36,1.36]){beam('cantilever-brace',[t,H-1,side*1.36],[t,H-.25,side*2.30],.16);beam('cantilever-brace',[side*1.36,H-1,t],[side*2.30,H-.25,t],.16);}
 }
 for(const x of [-.38,.38])b('ladder-stile',m,[x,(H+.92)/2,1.77],[.085,H+.92,.10]);
 for(let y=.22;y<H-.08;y+=.28)b('ladder-rung',alt,[0,y,1.77],[.76,.062,.082]);
 for(const x of [-.58,.58]){for(const z of [1.27,2.23])b('hatch-post',m,[x,H+.46,z],[.085,.92,.085]);for(const y of [.47,.91])b('hatch-side-rail',alt,[x,H+y,1.75],[.085,.085,1.04]);}
 for(const y of [.47,.91])b('hatch-back-rail',alt,[0,H+y,2.23],[1.16,.085,.085]);
 root.userData.tower={supportTiles:[3,3],platformTiles:[5,5],stories:3,deckHeight:H,opening:{min:[-.5,1.25],max:[.5,2.25]},ladderSide:'+Z'};
}

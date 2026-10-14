// The SAM's own sector for the intro's cutaways (storyboard shots 04-06). A
// cinematic set, not a campaign map: the tutorial reserves its sectors (TOO /
// XXO / XSO, docs/tactics/SECTOR-LIBRARY.md) and none is authored as the SAM
// site, and Codex's 3D study likewise built "independent crash and SAM
// terrain/forest sets" (intro-environment.js). Grassland with forest patches,
// the launcher in a mown clearing, a one-tier escarpment, wooded on top,
// standing across the view behind it. Tile coordinates, like the crash sector;
// the launcher's study coordinates map onto them with (X, Z) = (x, y).
import {fbm} from './crash-sector.js';

export const SAM_SITE=Object.freeze({x:120,y:120});
// The study's launch direction, level part (intro-timeline.js launchQuaternion:
// Euler(-.25, -.68, 0, YXZ) then -90 deg about up, applied to +X).
export const LAUNCH_DIR=Object.freeze((()=>{const c=Math.cos(.25),x=-Math.sin(.68)*c,y=Math.cos(.68)*c,n=Math.hypot(x,y);return [x/n,y/n];})());
// The cutaways look across the launch, so the missiles leave toward screen
// right, as they arrive from screen left in the crash sector (proof.js).
export const SAM_LOOK=Object.freeze([LAUNCH_DIR[1],-LAUNCH_DIR[0]]);
const RIDGE=62,CLEARING=24,SIZE=240;

export function samSector(){
 const upper0={},rows=[];
 for(let y=0;y<SIZE;y++){let row='';
  for(let x=0;x<SIZE;x++){const dx=x-SAM_SITE.x,dy=y-SAM_SITE.y,along=dx*SAM_LOOK[0]+dy*SAM_LOOK[1],across=-dx*SAM_LOOK[1]+dy*SAM_LOOK[0];
   const edge=RIDGE+(fbm(across*.035+3,1.7,301,3)-.5)*22+Math.sin(across*.06)*5,top=along>edge;
   if(top)upper0[x+','+y]='ground-grass';
   const r=Math.hypot(dx,dy),n=fbm(x*.045,y*.045,311,4);
   // Forest: on the escarpment's top, in patches across the lowland, never in
   // the clearing; thinning toward the camera so the foreground stays open.
   const wooded=r>CLEARING&&(top?n>.36:n>.56-.12*Math.min(1,Math.max(0,along)/50)&&along>-30);
   row+=wooded?'#':'.';}
  rows.push(row);}
 return {map:{version:2,width:SIZE,height:SIZE,levels:2,name:'Intro SAM sector (cinematic set)',upper:[upper0,{}]},woodland:{source:'generated: sam-sector.js',rows}};
}
// No tree in the launcher's clearing (plate.js keepClear's shape).
export const samKeepClear=()=>[{name:'site',test:(x,y,r)=>Math.hypot(x-SAM_SITE.x,y-SAM_SITE.y)<CLEARING-2+r}];
// A content hash of the generated set, for the plates' specs: a stored plate is
// stale as soon as the set it was painted from changes.
let key=null;
export function samSectorKey(){if(key)return key;const {map,woodland}=samSector();let h=2166136261;
 const eat=s=>{for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}};
 for(const r of woodland.rows)eat(r);eat(Object.keys(map.upper[0]).join(';'));
 return key='sam-'+(h>>>0).toString(16).padStart(8,'0');}

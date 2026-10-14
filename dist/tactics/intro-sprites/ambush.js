// The intro's first part, 0 to 20.2 s: storyboard sheet 01-06 ("approach and
// ambush") in the crash sequence's treatment, ahead of proof.js (20.2-35 s).
// Three separate places, as the storyboard's geography correction requires:
// the crash sector's plateau (01, 03, the cut back at 19.4 s), the overseas
// radio room (02) and the SAM's own sector (04-06); the relay is never shown.
// Shot times follow the 3D study (intro-timeline.js INTRO_SHOTS).
import {approachPath,approachAttitude,PERSPECTIVE_LIFT,PROOF_START} from './trajectory.js';
import {SAM_SITE,SAM_LOOK,LAUNCH_DIR,samSector,samKeepClear,samSectorKey} from './sam-sector.js';
import {buildSector,HEIGHT_SCALE,ROCK_DETAIL} from './crash-sector.js';
import {closeupSpec} from './closeup.js';
import {keepClear} from './plate.js';
export {PERSPECTIVE_LIFT};
// The SAM cutaway's camera: low in the clearing, in front of and to the left of
// the launch line, looking up across it so the rails point toward screen right
// and a little toward the lens, against the sky above the treeline (the
// storyboard's 05/06 view the launcher in 3/4 from below).
const samCamera=(()=>{const [lx,ly]=LAUNCH_DIR,[fx,fy]=SAM_LOOK,s=SAM_SITE;
 const pos=[s.x-10.5*fx+4.5*lx,s.y-10.5*fy+4.5*ly,1.1],target=[s.x+.8*lx,s.y+.8*ly,3.3];
 return Object.freeze({pos:pos.map(v=>+v.toFixed(2)),target:target.map(v=>+v.toFixed(2)),hfov:52,plate:[1760,990],window:[1600,900]});})();
// The launch, art-directed after the storyboard's 05/06 rather than the study:
// the study raises the rails only to 0.25 rad and its missiles leave almost
// level; here the cradle rises to `raised` rad over the wake, and each missile
// leaves along its rail (launch times are the study's: 17.4 and 17.95 s),
// accelerating, then eases toward a flatter `cruise` climb. Posed by
// tools/bake-intro-sam.mjs, which records the flights for the painted trails.
export const SAM_LAUNCH=Object.freeze({rest:.08,raised:.62,wake:[14,17],launches:[17.4,17.95],v0:5,accel:62,vmax:95,cruise:.2,turn:[.35,1.4],flight:2.6});
// The volley needs room: from the near camera a missile leaves the frame
// within half a second. Farther back and more side-on, both cross the frame
// climbing away to the right, trails in view.
const volleyCamera=(()=>{const [lx,ly]=LAUNCH_DIR,[fx,fy]=SAM_LOOK,s=SAM_SITE;
 const pos=[s.x-26*fx-2*lx,s.y-26*fy-2*ly,2.2],target=[s.x+9*lx,s.y+9*ly,6];
 return Object.freeze({pos:pos.map(v=>+v.toFixed(2)),target:target.map(v=>+v.toFixed(2)),hfov:60,plate:[1760,990],window:[1600,900]});})();

// The approach shots look through the close-up's lens (closeup.js closeupView)
// at the 4x butte; each camera sits off the aircraft's right side so the nose
// stays toward screen right. Plates carry a margin for a slow follow pan.
const lens=(pos,target,hfov)=>Object.freeze({pos,target,hfov,plate:[1760,990],window:[1600,900]});
export const SHOTS=Object.freeze([
 {id:'01',from:0,to:4,title:'Approach',place:'plateau',camera:lens([106,246,21],[47,203,21],50),frames:'heli-01'},
 {id:'02',from:4,to:9,title:'Overseas handler',place:'radio room',frames:'room-02'},
 {id:'03',from:9,to:12,title:'Closing in',place:'plateau',camera:lens([128,157,20],[100,132,27],56),frames:'heli-03'},
 {id:'04',from:12,to:14,title:'Radar contact',place:'SAM sector'},
 {id:'05',from:14,to:17,title:'SAM wakes',place:'SAM sector',sector:'sam',camera:samCamera,frames:'sam-05'},
 {id:'06',from:17,to:19.4,title:'Missile volley',place:'SAM sector',sector:'sam',camera:volleyCamera,frames:'sam-06'},
 {id:'07',from:19.4,to:PROOF_START,title:'Incoming',place:'plateau'},
].map(Object.freeze));
// 02: the study's radio room (intro-radio-room.js, its own units: the hen at
// the origin facing +x, the desk in front of her, the microphone before her
// beak). A 3/4 view from her front left, at head height, like the storyboard.
export const ROOM_CAMERA=Object.freeze({pos:[1.95,1.42,1.12],target:[.22,1.17,-.12],fov:36,key:[3,4,2]});
// Her line (the storyboard and the study's caption).
export const HANDLER_LINE='Your mission is to take out the central relay station.';
export const shotAt=t=>SHOTS.find(s=>t>=s.from&&t<s.to)||SHOTS.at(-1);
export const shotById=id=>SHOTS.find(s=>s.id===id);
// Round 1 stills, one per shot, shown to the user before any in-between work.
export const AMBUSH_KEYFRAMES=Object.freeze({'01':2,'02':6.5,'03':10.5,'04':13.2,'05':16.2,'06':18.05});

// The painted sector behind a perspective shot, at the 4x butte: the crash
// sector (the user's map and woodland, passed in) or the SAM's set.
export function shotSector(shot,crash){
 const opts={heightScale:HEIGHT_SCALE.closeup,extend:true,detail:ROCK_DETAIL.closeup};
 if(shot.sector==='sam'){const {map,woodland}=samSector();return buildSector(map,woodland,opts);}
 return buildSector(crash.map,crash.woodland,opts);
}
export const shotKeepClear=shot=>shot.sector==='sam'?samKeepClear():keepClear();
// What a shot's plate was painted with; the SAM plate also names its set.
export const shotSpec=shot=>shot.sector==='sam'?{...closeupSpec(shot.camera),sector:samSectorKey()}:closeupSpec(shot.camera);
// The plate's file name: shots sharing a camera share one plate.
export const plateName=shot=>`shot-${shot.plate||shot.id}-plate`;

// Where the aircraft is in a perspective shot: the approach path, lifted onto
// the 4x butte (trajectory.js PERSPECTIVE_LIFT).
export function lensPath(t){const p=approachPath(t);return {x:p.x,y:p.y,h:p.h+PERSPECTIVE_LIFT};}
export {approachAttitude};

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
import {smooth} from './trajectory.js';
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
// stays toward screen right. The architect, 2026-10-14, on round 1: 01 "bring
// the helicopter closer. Keep enough cliff and plateau to establish the
// location, but give the aircraft more presence ... Currently the pale sky
// dominates"; 03 "show more plateau. Include recognizable terrain beneath or
// behind the aircraft". So both look down from above the aircraft's height,
// close: 01 along the south wall as the aircraft climbs over the rim, 03 across
// the plateau's woods and meadows. Close, the aircraft crosses the 1600 px
// window in about two seconds, so their plates are wide (3000 px, the lens
// still 46 degrees across the window) and the window follows it (`follow`, the
// share of its offset from the plate's centre taken up; lensWindow below).
const lens=(pos,target,hfov,plate=[1760,990])=>Object.freeze({pos,target,hfov,plate,window:[1600,900]});
export const SHOTS=Object.freeze([
 {id:'01',from:0,to:4,title:'Approach',place:'plateau',camera:lens([80,222,30],[49,205.3,24],46,[3000,1000]),follow:[.8,.33],frames:'heli-01'},
 {id:'02',from:4,to:9,title:'Overseas handler',place:'radio room',frames:'room-02'},
 {id:'03',from:9,to:12,title:'Closing in',place:'plateau',camera:lens([120,152,32],[99.5,133.6,25],46,[3000,1000]),follow:[.8,.33],frames:'heli-03'},
 {id:'04',from:12,to:14,title:'Radar contact',place:'SAM sector'},
 {id:'05',from:14,to:17,title:'SAM wakes',place:'SAM sector',sector:'sam',camera:samCamera,frames:'sam-05'},
 {id:'06',from:17,to:19.4,title:'Missile volley',place:'SAM sector',sector:'sam',camera:volleyCamera,frames:'sam-06'},
 {id:'07',from:19.4,to:PROOF_START,title:'Incoming',place:'plateau'},
].map(Object.freeze));
// 02: the study's radio room (intro-radio-room.js, its own units: the hen at
// the origin facing +x, the desk in front of her, the microphone before her
// beak) in a modelled room (room-set.js). A 3/4 view from her right, close,
// like the storyboard's panel: she faces screen right into the microphone.
export const ROOM_CAMERA=Object.freeze({pos:[1.85,1.45,.85],target:[.3,1.2,-.35],fov:36});
// The room's light: a cool fill, a warm key from above the desk, and the
// swing-arm lamp's pool on the desk ([colour, intensity, ...]). The hen's
// paint is unlit (the study's model paint), so this lights the room only.
export const ROOM_LIGHT=Object.freeze({hemi:[0xf4f6f0,0x6f7464,1.3],key:[0xffe6b8,1.6,[1.5,4,1.5]],lamp:[0xffd8a0,9,.75]});
// The study's microphone, restaged a little lower and farther out so her
// open beak shows above the grille.
export const ROOM_MIC=Object.freeze({foot:[.8,.935,-.06],grille:[.44,1.28,-.12],tilt:-.9});
// The architect, 2026-10-14: "turn her toward the microphone and give her a
// slight forward lean or a wing resting on the desk." She turns 26 degrees
// toward it, her head a further 17, leans in from the hips, and rests her near
// wing on the signal pad (room-set.js poseHen; radians).
export const HEN_POSE=Object.freeze({turn:.45,lean:.18,headTurn:.3,headNod:-.02,wing:Object.freeze([.15,0,1.4]),wingTip:Object.freeze([0,0,-.7])});
// Her line (the storyboard and the study's caption), and its delivery: one
// beak movement per syllable, [syllable, seconds, stress 0-1] (null = a pause).
export const HANDLER_LINE='Your mission is to take out the central relay station.';
export const LINE_SPEECH=Object.freeze({start:4.95,maxBeak:.3,syllables:Object.freeze([
 ['your',.2,.6],['mis',.17,1],['sion',.19,.6],['is',.15,.5],['to',.13,.45],['take',.24,1],['out',.26,.9],[null,.1,0],
 ['the',.12,.45],['cen',.2,1],['tral',.17,.6],['re',.17,.7],['lay',.24,.8],['sta',.22,1],['tion',.3,.55]].map(Object.freeze))});
export const lineEnd=()=>LINE_SPEECH.start+LINE_SPEECH.syllables.reduce((s,[,d])=>s+d,0);
// The syllable at t and how far through it ({stress, u}), or null when silent.
export function syllableAt(t){let at=LINE_SPEECH.start;for(const [s,d,stress] of LINE_SPEECH.syllables){if(t>=at&&t<at+d)return s?{s,stress,u:(t-at)/d}:null;at+=d;}return null;}
// The beak's opening (radians): it opens and closes once per syllable,
// wider on stressed ones, and is shut outside the line.
export function beakAt(t){const y=syllableAt(t);return y?LINE_SPEECH.maxBeak*(.35+.65*y.stress)*Math.pow(Math.sin(Math.PI*y.u),.8):0;}
// Her pose at t: HEN_POSE, with a nod on each stressed syllable and a slow
// drift of the head; her body holds still (the bake stores only what moves).
export function henPoseAt(t){const y=syllableAt(t),nod=y?-.05*y.stress*Math.sin(Math.PI*y.u):0;
 return {...HEN_POSE,headTurn:HEN_POSE.headTurn+.04*Math.sin(1.3*t),headNod:HEN_POSE.headNod+nod+.015*Math.sin(.9*t+1),headRoll:.025*Math.sin(.7*t),beak:beakAt(t)};}
export const shotAt=t=>SHOTS.find(s=>t>=s.from&&t<s.to)||SHOTS.at(-1);
export const shotById=id=>SHOTS.find(s=>s.id===id);
// Round 1 stills, one per shot, shown to the user before any in-between work.
export const AMBUSH_KEYFRAMES=Object.freeze({'01':2,'02':6.5,'03':10.5,'04':13.2,'05':16.2,'06':18.05});

// A slow push-in and a follow pan that takes up `follow` (default a third) of
// the subject's offset from the plate's centre, clamped inside the plate.
export function lensWindow(shot,t,subjectPx){
 const [W,H]=shot.camera.plate,[ww,wh]=shot.camera.window,[fx,fy]=shot.follow||[.33,.33],zoom=1+.04*smooth(shot.from,shot.to,t);
 const mx=(W-ww/zoom)/2,my=(H-wh/zoom)/2,want=subjectPx?[(subjectPx[0]-W/2)*fx,(subjectPx[1]-H/2)*fy]:[0,0];
 return {zoom,cx:W/2+Math.max(-mx,Math.min(mx,want[0])),cy:H/2+Math.max(-my,Math.min(my,want[1]))};
}
// Where a plate point lands in the 1600 x 900 frame through that window.
export const inWindow=(shot,win,[x,y])=>[(x-win.cx)*win.zoom*1600/shot.camera.window[0]+800,(y-win.cy)*win.zoom*1600/shot.camera.window[0]+450];

// The approach and SAM shots' sky, hills, clouds and veil. The architect,
// 2026-10-14: "Washed-out skies: the missile trail disappears into the white
// background. Adjust these new shots while preserving the approved crash's
// appearance." The frame grade (plate.js GRADE, with its soft light and haze)
// turns any plate channel much above 165 to white, and round 1's sky horizon,
// clouds and veil (the close-up's, closeup.js CLOSEUP_ATMOSPHERE) all sat above
// it: measured, 22-30% of the big skies clipped. These sit below it, chosen
// through the grade to land on the storyboard's 01/03/05/06 sky (median rgb
// 165,181,200, luminance ~180) and clouds (215,212,209, ~212); the hills and the
// veil step down with them so far ground fades into the horizon, not into white.
export const AMBUSH_ATMOSPHERE=Object.freeze({top:[112,130,158],horizon:[134,148,166],ridges:[[120,134,150],[106,122,136],[96,116,114]],forest:[72,92,80],cloud:[[136,138,142],[166,162,154]],haze:[134,148,166]});

// The painted sector behind a perspective shot, at the 4x butte: the crash
// sector (the user's map and woodland, passed in) or the SAM's set.
export function shotSector(shot,crash){
 const opts={heightScale:HEIGHT_SCALE.closeup,extend:true,detail:ROCK_DETAIL.closeup};
 if(shot.sector==='sam'){const {map,woodland}=samSector();return buildSector(map,woodland,opts);}
 return buildSector(crash.map,crash.woodland,opts);
}
export const shotKeepClear=shot=>shot.sector==='sam'?samKeepClear():keepClear();
// What a shot's plate was painted with: the lens, the butte, its atmosphere,
// and for the SAM's shots the set's content key.
export const shotSpec=shot=>({...closeupSpec(shot.camera),atmosphere:AMBUSH_ATMOSPHERE,...(shot.sector==='sam'?{sector:samSectorKey()}:{})});
// The plate's file name: shots sharing a camera share one plate.
export const plateName=shot=>`shot-${shot.plate||shot.id}-plate`;

// Where the aircraft is in a perspective shot: the approach path, lifted onto
// the 4x butte (trajectory.js PERSPECTIVE_LIFT).
export function lensPath(t){const p=approachPath(t);return {x:p.x,y:p.y,h:p.h+PERSPECTIVE_LIFT};}
export {approachAttitude};

// Each character's mouth, in its head's sculpt space (heads.mjs). Placed by the character's
// painted face: the lip line is the painted mouth line (docs/tactics/SPEAKING-HEADS.md, the
// reference sheets). sculpt.mjs says how each part is used.
//  lip      where the lips meet, on the painted mouth line: its height along the head (a curve
//           through `line`'s knots [x, y]; or y at x rising `slope` per unit x), plus its rise
//           across the head (a curve through `across`'s knots [|z|, rise]; or `smile` toward the
//           corners, in full from |z| = width). The knots were fitted to the painted line traced
//           off each approved head (tools/speaking-heads/fit-lips.mjs); `x`, `y` are a point on the
//           line near the front. In front of where a beak's gap ends, its `mandibles` say which side
//           a point is (the distance to the lower minus the upper)
//  corner   where the mouth ends: the lips part in front of x, all along the lip line (and within
//           |z| < z: a mouth on the front of a muzzle; .2 is beyond any face), each wholly on its
//           own side from `open` in front of x (and `zOpen` inside z)
//  gap      how far the lips are parted in the space the head is sculpted in (folded shut at rest),
//           tapering out over `taper` behind the corners
//  hinge    the jaw's joint (the jaw bone turns about z through it)
//  rigid    a beak's mandibles are rigid: the lower one's weight ramps over this much at the hinge
//  band     how far above and below the lip line the cheeks' weight blends behind the corners:
//           `mid` inside the mouth (|z| < z0), `cheek` from |z| = z1 outward
//  jawLine  the mandible's outline is read off the profile (sculpt.mjs jawLines): `margin` below
//           the underside, the jaw's angle where it last rises steeply (`steep`) or at x `a`, and
//           the throat's blend behind and below it (`blend`, by default 0.4 x angle-to-joint)
//  cavity   the mouth behind the lips: `floor` below the cut to `roof` above it, `wall` inside the
//           cheeks and no wider than `width` (narrowing by `taper` toward the back), `front`
//           behind the front of the lips, in front of x `back`, never nearer the surface than
//           `wallMin`, edges rounded over `round` (its back over `backRound`: a throat, not a wall);
//  pad      a ruminant's dental pad on the front of the roof: its bottom `bottom` above the cut,
//           half-height, half-depth and half-width
//  teeth    rows on an arch inside the lips: jaw, kind (incisor, canine), count, half (arc length
//           from the middle to the outer teeth), width and depth (half-sizes along and across the
//           arch), tip (how far past the cut), embed (into the gum), inset (further in), lean
//  tongue   on the floor behind the lower teeth: half-width at most `width`; its top `below` the
//           cut at the tip rising to `rise` above it at the back
//  reach    how far from the cut the mouth can be (where the cavity is looked for)
//  share    the mouth's triangles, as a share of the skull's (build-speaking-heads.mjs: a quarter);
//           toothSides, the sides of its teeth's lathes by level (the build's TOOTH)
import {henGape} from './heads.mjs';

const common={gap:.008,edge:.001,reach:.09,step:.0025,taper:.01,teethGap:.0008,
 band:{mid:.006,cheek:.034,z0:.04,z1:.07},
 cavity:{roof:.010,floor:.006,width:.03,taper:.2,wall:.010,front:.006,wallMin:.004,round:.004,backRound:.012}};
const mouth=o=>({...common,...o,band:{...common.band,...o.band},cavity:{...common.cavity,...o.cavity}});
const incisors=(jaw,count,half,width,depth,tip=.0045,o={})=>({jaw,kind:'incisor',count,half,width,depth,tip,embed:.003,...o});
const canines=(jaw,half,size,tip,o={})=>({jaw,kind:'canine',count:2,half,width:size,depth:size,tip,embed:.004,...o});
const tongue=(width,o={})=>({width,embed:.0015,rise:.002,below:.002,backInset:.015,gap:.003,clear:.0015,...o});
const ruminantPad=half=>({bottom:.005,height:.004,depth:.005,half,inset:.001});

export const MOUTHS={
 bear:mouth({
  lip:{x:.195,y:1.408,line:[[.09,1.412],[.11,1.408],[.13,1.403],[.15,1.401],[.17,1.402],[.19,1.405],[.21,1.414]],smile:0,width:.055},
  corner:{x:.105,z:.2,zOpen:.02},hinge:[-.04,1.47],
  band:{z0:.04,z1:.08},cavity:{back:.035,width:.039},
  teeth:[incisors('upper',6,.013,.0024,.0026),canines('upper',.0295,.0028,.0055),incisors('lower',6,.012,.0023,.0025),canines('lower',.019,.0028,.0055)],
  tongue:tongue(.027)
 }),
 horse:mouth({
  lip:{x:.245,y:1.317,line:[[.15,1.3484],[.165,1.3429],[.18,1.3372],[.195,1.3309],[.21,1.3247],[.225,1.3199],[.24,1.3173],[.255,1.3171],[.27,1.3177]],smile:0,width:.04},
  corner:{x:.168,z:.2,zOpen:.02},hinge:[-.035,1.43],
  band:{z0:.04,z1:.07},
  cavity:{back:.05,width:.035},
  teeth:[incisors('upper',6,.022,.0042,.0034,.0045,{vary:1}),incisors('lower',6,.021,.004,.0032,.0045,{vary:1})],
  tongue:tongue(.027)
 }),
 goat:mouth({
  lip:{x:.19,y:1.3728,line:[[.095,1.3935],[.11,1.3886],[.125,1.3837],[.14,1.38],[.155,1.3775],[.17,1.3754],[.185,1.3733],[.2,1.3718],[.215,1.3702]],smile:0,width:.045},
  corner:{x:.112,z:.2,zOpen:.02},hinge:[-.03,1.42],
  band:{z0:.03,z1:.06},
  cavity:{back:.035,width:.025},
  pad:ruminantPad(.02),
  teeth:[incisors('lower',8,.02,.0031,.0022,.0045,{lean:.25})],
  tongue:tongue(.02)
 }),
 bull:mouth({
  lip:{x:.215,y:1.3518,line:[[.1,1.3613],[.115,1.3587],[.13,1.3562],[.145,1.3528],[.16,1.3505],[.175,1.3498],[.19,1.3498],[.205,1.3508],[.22,1.352]],smile:0,width:.068},
  corner:{x:.12,z:.2,zOpen:.02},hinge:[-.03,1.43],
  band:{cheek:.024,z0:.047,z1:.077},
  cavity:{back:.04,width:.042},
  pad:ruminantPad(.032),
  // (their fronts stood 0.24 mm through the game mesh's closed lip, round 3)
  teeth:[incisors('lower',8,.031,.0045,.0028,.0045,{lean:.25,inset:.001})],
  // (.035 read as a pink slab across the open mouth, round 3)
  tongue:tongue(.028)
 }),
 cow:mouth({
  lip:{x:.178,y:1.3755,line:[[.095,1.3958],[.11,1.393],[.125,1.3899],[.14,1.3847],[.155,1.3784],[.17,1.3752],[.185,1.3765],[.2,1.3805],[.215,1.3842]],smile:0,width:.05},
  corner:{x:.112,z:.2,zOpen:.02},hinge:[-.02,1.44],
  band:{z0:.037,z1:.067},
  cavity:{back:.03,width:.032},
  pad:ruminantPad(.026),
  teeth:[incisors('lower',8,.025,.0041,.0026,.005,{lean:.25})],
  tongue:tongue(.026)
 }),
 donkey:mouth({
  lip:{x:.21,y:1.2938,line:[[.125,1.313],[.1387,1.3077],[.1525,1.3022],[.1663,1.2961],[.18,1.292],[.1937,1.291],[.2075,1.2932],[.2213,1.2968],[.235,1.3004]],smile:0,width:.05},
  corner:{x:.145,z:.2,zOpen:.02},hinge:[-.04,1.36],
  band:{z0:.035,z1:.065},
  cavity:{back:.03,width:.03},
  teeth:[incisors('upper',6,.019,.004,.0033),incisors('lower',6,.018,.0038,.0031)],
  tongue:tongue(.023)
 }),
 sheep:mouth({
  lip:{x:.175,y:1.3679,line:[[.085,1.3831],[.1,1.3786],[.115,1.3739],[.13,1.3695],[.145,1.3666],[.16,1.3658],[.175,1.3679],[.19,1.3713]],smile:0,width:.045},
  corner:{x:.1,open:.03,z:.2,zOpen:.02},hinge:[-.02,1.43],
  band:{z0:.03,z1:.06},
  cavity:{back:.03,width:.025},
  pad:ruminantPad(.021),
  teeth:[incisors('lower',8,.021,.0033,.0023,.0045,{lean:.25})],
  tongue:tongue(.02)
 }),
 // (sculpted at 2 mm, not 2.5: its lower lip's front is a wedge thinner than the coarser grid, whose top
 // came out sagging below the cut, its rim turned over at rest, seen from below first at speech:
 // 1.25 mm², the architect's review's corners)
 skunk:mouth({step:.002,
  lip:{x:.165,y:1.3844,line:[[.085,1.3864],[.1,1.3814],[.115,1.3763],[.13,1.3739],[.145,1.3762],[.16,1.3817],[.175,1.3885]],smile:0,width:.035},
  corner:{x:.1,open:.025,z:.2,zOpen:.02},hinge:[-.03,1.44],
  band:{cheek:.024,z0:.025,z1:.05},
  cavity:{back:.03,width:.02,floor:.0055,roof:.009},
  // (the upper canines and incisors reached through the game mesh's thin closed lower lip, round 3)
  teeth:[incisors('upper',6,.009,.0019,.002,.003),canines('upper',.0215,.0026,.003),
   // (the lower canines reached 5 mm past the cut, through the game mesh's thin closed upper lip, round 3)
   // (their crowns 3.5 mm at 12 degrees, under the 4 mm the others show, at 3.7: round 4)
   incisors('lower',4,.0055,.0018,.0019,.0046),canines('lower',.011,.0024,.0035)],
  tongue:tongue(.016)
 }),
 'pig-foreman':mouth({
  lip:{x:.205,y:1.3804,line:[[.115,1.3956],[.13,1.3943],[.145,1.393],[.16,1.3923],[.175,1.3899],[.19,1.3853],[.205,1.3804],[.22,1.3777],[.235,1.3748]],smile:0,width:.05},
  corner:{x:.13,z:.2,zOpen:.02},hinge:[-.02,1.42],
  // the lower face slopes down all the way back to the jowls; the jaw's angle is taken where the
  // underside last steepens, under the mouth's corner
  jawLine:{a:.15},
  band:{cheek:.026,z0:.043,z1:.073},
  cavity:{back:.04,width:.038},
  teeth:[incisors('upper',6,.017,.0038,.003,.004),canines('upper',.034,.0042,.007),
   incisors('lower',6,.012,.0036,.0029,.004,{lean:.3}),canines('lower',.020,.004,.008)],
  tongue:tongue(.03)
 }),
 'pig-director':mouth({
  lip:{x:.21,y:1.4447,line:[[.12,1.478],[.135,1.4682],[.15,1.4589],[.165,1.4524],[.18,1.4483],[.195,1.4461],[.21,1.4447],[.225,1.4464],[.24,1.4502],[.255,1.4536]],smile:0,width:.05},
  corner:{x:.138,z:.2,zOpen:.03},hinge:[-.03,1.48],
  // the jaw is the small chin in front of the double chin
  jawLine:{a:.21},
  band:{cheek:.03,z0:.05,z1:.08},
  cavity:{back:.05,width:.045},
  teeth:[incisors('upper',6,.019,.0042,.0032,.004),canines('upper',.038,.0045,.007),
   incisors('lower',6,.014,.004,.003,.004,{lean:.3}),canines('lower',.023,.0042,.008)],
  tongue:tongue(.034)
 }),
 rabbit:mouth({
  lip:{x:.115,y:1.3627,line:[[.05,1.3627],[.2,1.3627]],
   across:[[0,0],[.03,-.0066],[.045,-.0013],[.06,.0069],[.075,.0151]]},
  corner:{x:.075,open:.025,z:.068,zOpen:.015},hinge:[-.02,1.43],
  band:{mid:.005,cheek:.02,z0:.027,z1:.05},
  cavity:{back:.03,width:.022,roof:.009,front:.005},
  teeth:[incisors('upper',2,.0048,.0045,.003,.0055,{embed:.004}),incisors('lower',2,.0038,.0035,.0028,.0045)],
  tongue:tongue(.016)
 }),
 // The beak parts along its gape: two rigid mandibles, the lower one turning about the beak's
 // root where it leaves the face.
 hen:mouth({gap:.006,edge:.0006,reach:.05,step:.0015,taper:.003,mandibles:henGape,
  // the gape at the middle, from the beak's root to the lower mandible's tip (a plane: at the sides
  // it runs in the groove between the two mandibles)
  lip:{x:.17,y:1.4149,slope:-.168,smile:0,width:.05},
  // the lower mandible ends short of the upper's hooked tip: the gap ends there too
  corner:{x:.165,front:.222,open:.005,z:.2,zOpen:.01},hinge:[.165,1.4145],rigid:.006,
  band:{mid:.002,cheek:.002,z0:1,z1:2},
  cavity:{back:.14,tip:.214,roof:.0035,floor:.0035,width:.012,wall:.003,front:.003,wallMin:null,round:.0015,backRound:.0015},
  // (its top below the gape all along: rising past it at the back, it showed through her closed
  // gape, 8 mm2 on the game mesh, round 4)
  tongue:tongue(.0055,{embed:.0008,rise:-.0005,below:.0015,backInset:.035,gap:.003,clear:.0008})
 }),
 // (the heaviest character, 10,446 triangles: its long mouth gets a fifth more, not a quarter)
 // (the heaviest character: at the common 4 mm and 30-triangle teeth its game mesh went 92
 // triangles over the 12,000 cap, round 3; its sixteen game teeth are four-sided)
 dog:mouth({share:.2,toothSides:{low:4},
  lip:{x:.195,y:1.3736,line:[[.06,1.386],[.075,1.3847],[.09,1.3835],[.105,1.3816],[.12,1.3793],[.135,1.377],[.15,1.3754],[.165,1.3744],[.18,1.3738],[.195,1.3736],[.21,1.3749],[.225,1.3763]],smile:0,width:.04},
  corner:{x:.079,z:.2,zOpen:.02},hinge:[-.035,1.43],
  band:{z0:.033,z1:.063},
  cavity:{back:.03,width:.028,floor:.008},
  teeth:[incisors('upper',6,.013,.0024,.0026,.004),canines('upper',.0295,.0033,.0065),
   incisors('lower',6,.012,.0023,.0025,.004),canines('lower',.019,.0031,.006)],
  tongue:tongue(.022)
 })
};

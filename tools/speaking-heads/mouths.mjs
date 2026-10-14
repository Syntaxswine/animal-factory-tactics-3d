// Each character's mouth, in its head's sculpt space (heads.mjs): where the lips meet and how
// far back the mouth runs, the jaw joint, how the jaw's weight blends into cheeks and throat,
// the cavity behind the lips, the teeth and the tongue. Placed by the character's painted face:
// the lip line is the painted mouth line (docs/tactics/SPEAKING-HEADS.md, the reference sheets).
//  lip      the line where the lips meet: y at x, rising `slope` per unit x and `smile` toward
//           the corners (in full from |z| = width)
//  corner   where the mouth ends: behind x and beyond |z| < z the slit ends round; in front of
//           them the lips' weights part over `open` (and in from the sides over `zOpen`). A mouth
//           whose corners lie on the cheeks has z beyond the face (.2); a mouth on the front of
//           a broad muzzle (bull, rabbit) ends at its z
//  hinge    the jaw joint (the jaw bone turns about Z through it)
//  lipDepth how far from the slit the lips are rigidly on their own side (default 2 cm)
//  band     how far above and below the lip line the jaw's weight blends: `mid` inside the
//           mouth, `cheek` from |z| = z0 to z1 outward
//  throat   the jaw's underside, as an angle (degrees) from the jaw joint, forward and down:
//           below that ray the throat and jowls stay with the head (weight fades over `blend`)
//  back     the back of the jaw: weight fades behind x, over `blend`
//  cavity   the mouth behind the lips: inside the head deeper than `wall`, from `floor` below
//           the lip line to `roof` above it, within `width` of the middle, in front of x `back`
//  teeth    rows along an arch: count, x at the middle, arch (how far back the ends sit), half
//           width of the row, tip (how far past the lip line a tip reaches), length, tooth
//           half-width and half-depth; `lengths`/`widths` per tooth where they differ
//  tongue   tip and back x, half width, thickness, drop (below the lip line)
//  lowerLip ellipsoids [centre, radii, blend] added under the lip line where the approved head is
//           too thin there to part (the bull)
//  slit     the slit's width where fully open; round, how round its edges and the cavity's
//  partWall how far inside the approved surface the teeth and tongue are kept
//  seal     how far from the lip line the rest pose's closing reaches
import {henGape} from './heads.mjs';

const common={slit:.010,round:.004,seal:.018,reach:.09,step:.0025,partWall:.0022,band:{mid:.006,cheek:.034,z0:.025,z1:.06}};
const ends=(n,end,mid)=>Array.from({length:n},(_,i)=>i===0||i===n-1?end:mid);

export const MOUTHS={
 horse:{...common,
  lip:{x:.245,y:1.3255,slope:-.28,smile:0,width:.04},
  corner:{x:.17,z:.2,zOpen:.02},
  hinge:[-.035,1.43],
  throat:{angle:-45,blend:10},
  back:{x:0,blend:.03},
  cavity:{back:.05,roof:.010,floor:.006,width:.032,wall:.008},
  teeth:[{jaw:'upper',count:6,x:.238,arch:.018,half:.021,tip:.005,length:.016,width:.0045,depth:.004},
   {jaw:'lower',count:6,x:.229,arch:.018,half:.020,tip:.0015,length:.015,width:.0043,depth:.004}],
  tongue:{tip:.22,back:.06,width:.029,thick:.015,drop:.001}
 },
 goat:{...common,
  lip:{x:.19,y:1.3843,slope:0,smile:.004,width:.045},
  corner:{x:.13,z:.2,zOpen:.02},
  hinge:[-.03,1.42],
  throat:{angle:-45,blend:10},
  back:{x:0,blend:.03},
  cavity:{back:.035,roof:.009,floor:.006,width:.026,wall:.007},
  teeth:[{jaw:'lower',count:8,x:.179,arch:.018,half:.019,tip:-.0005,length:.012,width:.0033,depth:.0024}],
  tongue:{tip:.17,back:.045,width:.023,thick:.015,drop:.001}
 },
 bull:{...common,
  lowerLip:[[[.185,1.343,0],[.04,.012,.052],.012]],
  lip:{x:.215,y:1.3538,slope:0,smile:0,width:.068},
  corner:{x:.14,z:.2,zOpen:.02},
  hinge:[-.03,1.43],
  band:{mid:.006,cheek:.024,z0:.04,z1:.07},
  throat:{angle:-40,blend:10},
  back:{x:.02,blend:.03},
  cavity:{back:.04,roof:.010,floor:.006,width:.05,wall:.008},
  teeth:[{jaw:'lower',count:8,x:.205,arch:.02,half:.035,tip:-.0005,length:.015,width:.0048,depth:.0032}],
  tongue:{tip:.20,back:.05,width:.047,thick:.015,drop:.001}
 },
 cow:{...common,
  lip:{x:.178,y:1.3845,slope:-.19,smile:.001,width:.05},
  corner:{x:.119,z:.2,zOpen:.02},
  hinge:[-.02,1.44],
  throat:{angle:-42,blend:10},
  back:{x:0,blend:.025},
  cavity:{back:.03,roof:.010,floor:.006,width:.036,wall:.008},
  teeth:[{jaw:'lower',count:8,x:.178,arch:.022,half:.027,tip:-.0005,length:.0145,width:.0042,depth:.0028}],
  tongue:{tip:.172,back:.04,width:.033,thick:.015,drop:.001}
 },
 donkey:{...common,
  lip:{x:.21,y:1.302,slope:-.08,smile:0,width:.05},
  corner:{x:.15,z:.2,zOpen:.02},
  hinge:[-.04,1.36],
  throat:{angle:-45,blend:10},
  back:{x:-.01,blend:.03},
  cavity:{back:.03,roof:.010,floor:.006,width:.03,wall:.008},
  teeth:[{jaw:'upper',count:6,x:.198,arch:.016,half:.019,tip:.005,length:.015,width:.0042,depth:.0038},
   {jaw:'lower',count:6,x:.19,arch:.016,half:.018,tip:.0015,length:.014,width:.004,depth:.0036}],
  tongue:{tip:.185,back:.04,width:.027,thick:.015,drop:.001}
 },
 sheep:{...common,
  lip:{x:.175,y:1.374,slope:0,smile:.002,width:.045},
  corner:{x:.11,open:.03,z:.2,zOpen:.02},
  hinge:[-.02,1.43],
  throat:{angle:-45,blend:10},
  back:{x:.01,blend:.03},
  cavity:{back:.03,roof:.009,floor:.006,width:.03,wall:.008},
  teeth:[{jaw:'lower',count:8,x:.157,arch:.018,half:.022,tip:-.0005,length:.012,width:.0036,depth:.0025}],
  tongue:{tip:.152,back:.04,width:.027,thick:.015,drop:.001}
 },
 skunk:{...common,
  lip:{x:.165,y:1.3837,slope:0,smile:0,width:.035},
  corner:{x:.10,open:.025,z:.2,zOpen:.02},
  hinge:[-.03,1.44],
  throat:{angle:-42,blend:10},
  back:{x:0,blend:.03},
  cavity:{back:.03,roof:.008,floor:.005,width:.024,wall:.007},
  teeth:[{jaw:'upper',count:8,x:.158,arch:.016,half:.017,tip:.003,length:.008,lengths:ends(8,.0115,.008),width:.0026,widths:ends(8,.0032,.0026),depth:.0025},
   {jaw:'lower',count:8,x:.151,arch:.016,half:.016,tip:.0005,length:.007,lengths:ends(8,.010,.007),width:.0024,widths:ends(8,.003,.0024),depth:.0024}],
  tongue:{tip:.152,back:.04,width:.021,thick:.015,drop:.001}
 },
 'pig-foreman':{...common,
  lip:{x:.205,y:1.386,slope:-.15,smile:0,width:.05},
  corner:{x:.15,z:.2,zOpen:.02},
  hinge:[-.02,1.42],
  band:{mid:.006,cheek:.026,z0:.035,z1:.065},
  throat:{angle:-35,blend:10},
  back:{x:.02,blend:.035},
  cavity:{back:.04,roof:.009,floor:.006,width:.045,wall:.009},
  teeth:[{jaw:'upper',count:6,x:.182,arch:.016,half:.024,tip:.004,length:.011,width:.0045,depth:.0032},
   {jaw:'lower',count:8,x:.176,arch:.02,half:.03,tip:.001,length:.010,lengths:ends(8,.016,.010),width:.0042,widths:ends(8,.005,.0042),depth:.0032}],
  tongue:{tip:.175,back:.05,width:.042,thick:.015,drop:.001}
 },
 'pig-director':{...common,
  lip:{x:.21,y:1.452,slope:-.1,smile:.012,width:.07},
  corner:{x:.10,z:.075,zOpen:.03},
  hinge:[-.03,1.48],
  band:{mid:.006,cheek:.03,z0:.04,z1:.08},
  throat:{angle:-24,blend:10},
  back:{x:.09,blend:.04},
  cavity:{back:.05,roof:.009,floor:.006,width:.05,wall:.010},
  teeth:[{jaw:'upper',count:6,x:.19,arch:.02,half:.03,tip:.004,length:.012,width:.0052,depth:.0034},
   {jaw:'lower',count:6,x:.184,arch:.02,half:.028,tip:.001,length:.011,width:.005,depth:.0034}],
  tongue:{tip:.185,back:.06,width:.047,thick:.015,drop:.001}
 },
 rabbit:{...common,
  lip:{x:.115,y:1.360,slope:0,smile:-.002,width:.025},
  corner:{x:.075,open:.025,z:.04,zOpen:.015},
  hinge:[-.02,1.43],
  band:{mid:.005,cheek:.02,z0:.02,z1:.045},
  throat:{angle:-50,blend:10},
  back:{x:0,blend:.03},
  cavity:{back:.03,roof:.008,floor:.005,width:.025,wall:.007},
  teeth:[{jaw:'upper',count:2,x:.112,arch:0,half:.0055,tip:.004,length:.016,width:.005,depth:.003},
   {jaw:'lower',count:2,x:.106,arch:0,half:.0045,tip:.001,length:.011,width:.0038,depth:.0028}],
  tongue:{tip:.115,back:.035,width:.022,thick:.015,drop:.001}
 },
 // The beak opens along the gape: its two mandibles part from tip to root (where the beak is
 // already buried in the face), so the slit runs its whole length and the halves are rigid.
 hen:{...common,slit:.006,round:.002,seal:.006,reach:.05,step:.0015,cut:henGape,
  lip:{x:.17,y:1.411,slope:-.04,smile:0,width:.05},
  corner:{x:.085,open:.005,z:.2,zOpen:.01},
  hinge:[.14,1.425],
  band:{mid:.002,cheek:.002,z0:1,z1:2},
  throat:{angle:-80,blend:10},
  back:{x:.10,blend:.005},
  cavity:{back:.12,roof:.0035,floor:.0035,width:.012,wall:.003,round:.0015},
  tongue:{tip:.215,back:.13,width:.007,thick:.004,drop:.0015}
 },
 dog:{...common,
  lip:{x:.195,y:1.379,slope:-.12,smile:.002,width:.04},
  corner:{x:.135,z:.2,zOpen:.02},
  hinge:[-.035,1.43],
  throat:{angle:-45,blend:10},
  back:{x:0,blend:.03},
  cavity:{back:.03,roof:.010,floor:.006,width:.03,wall:.008},
  teeth:[{jaw:'upper',count:8,x:.193,arch:.024,half:.021,tip:.004,length:.009,lengths:ends(8,.016,.009),width:.003,widths:ends(8,.004,.003),depth:.003},
   {jaw:'lower',count:8,x:.185,arch:.024,half:.020,tip:.001,length:.008,lengths:ends(8,.014,.008),width:.0028,widths:ends(8,.0038,.0028),depth:.003}],
  tongue:{tip:.19,back:.04,width:.027,thick:.015,drop:.001}
 }
};

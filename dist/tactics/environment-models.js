// Presentation only. Combat continues to query the existing hybrid-world boxes.
// Primitives have unit extents; cylinders/cones point up, rotation is XYZ radians.
export function environmentModel(kind,w=1,d=1,h=.8){
 const p=[];
 const add=(shape,material,c,s,r=[0,0,0])=>p.push({shape,material,center:c,size:s,rotation:r});
 const box=(m,x,y,z,a,b,c,r)=>add(m==='linen'||m==='sand'?'rounded':'box',m,[x,y,z],[a,b,c],r);
 const round=(m,x,y,z,a,b,c=a,r)=>add('cylinder',m,[x,y,z],[a,b,c],r);
 const leaf=(m,x,y,z,a,b,c,r=[0,0,0])=>add('crown',m,[x,y,z],[a,b,c],r);
 const bar=(m,a,b,r)=>{const v=b.map((n,i)=>n-a[i]),l=Math.hypot(...v);add('cylinder',m,a.map((n,i)=>(n+b[i])/2),[r,l,r],[Math.atan2(v[2],v[1]),0,-Math.atan2(v[0],Math.hypot(v[1],v[2]))]);};
 const legs=()=>{for(const x of [-w*.36,w*.36])for(const z of [-d*.35,d*.35])round('dark-metal',x,h*.45,z,.065,h*.9);};
 const handle=(x,y,z,width=.22)=>{box('dark-metal',x,y,z,width,.045,.045);for(const dx of [-width/2,width/2])box('steel',x+dx,y,z-.025,.035,.04,.07);};
 const wheel=(x,z)=>{round('dark-metal',x,.09,z,.15,.065,.15,[Math.PI/2,0,0]);round('steel',x,.09,z+.035,.055,.01,.055,[Math.PI/2,0,0]);};
 if(kind==='crate-stack'){
  // Two separately built crates with contacting bottoms/lids, not a tall box.
  for(let level=0;level<2;level++)for(const part of environmentModel('crate-wood',w*.96,d*.96,h/2))p.push({...part,center:[part.center[0],part.center[1]+level*h/2,part.center[2]],rotation:[...part.rotation]});
 }else if(kind.startsWith('tree-')){
  add('taper','bark',[0,.78,0],[.26,1.56,.25]);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bar('bark',[0,.16,0],[Math.cos(a)*.36,.035,Math.sin(a)*.36],.1);}
  if(kind==='tree-pine'){
   // Staggered drooping branch fans leave daylight between tiers. No cone stack.
   for(let tier=0;tier<5;tier++)for(let j=0;j<(tier===4?3:5);j++){
    const a=j*2.399+tier*.87,reach=.54-tier*.085,y=.91+tier*.29,x=Math.cos(a)*reach,z=Math.sin(a)*reach;
    bar('bark',[0,y+.15,0],[x,y-.075,z],.045);
    add('bough',(tier+j)%3?'pine':'foliage',[x*.7,y,z*.7],[.64-tier*.074,.34,.61-tier*.066],[.12*Math.cos(a),a,.10*Math.sin(a)]);
    add('bough','foliage',[x,y+.025,z],[.27,.16,.32],[0,a,.12]);
   }
   add('bough','leaf-light',[.025,2.30,-.025],[.26,.44,.25],[.05,0,-.08]);
  }else{
   for(let i=0;i<7;i++){
    const a=i*2.399,x=Math.cos(a)*(.33+(i%3)*.10),z=Math.sin(a)*.43,y=1.58+(i%3)*.20;
    bar('bark',[.025,.78,0],[x,y-.05,z],.085-i*.004);
    leaf(i%2?'foliage':'leaf-light',x,y,z,.83-(i%3)*.09,.52+(i%2)*.11,.69,[.12*Math.sin(a),a,.10*Math.cos(a)]);
    for(let j=0;j<2;j++){const t=a+j*1.9;leaf(j?'leaf-light':'foliage',x+Math.cos(t)*.24,y+.16+j*.025,z+Math.sin(t)*.21,.39,.25,.38,[0,t,.16]);}
   }
   leaf('leaf-light',-.09,2.10,.03,.67,.43,.67,[.08,.4,-.06]);
  }
 }else if(kind==='bush'){
  for(let i=0;i<9;i++){const a=i*2.4,x=Math.cos(a)*.29,z=Math.sin(a)*.25,y=.25+i%3*.09;bar('bark',[0,.015,0],[x,y,z],.027);leaf(i%2?'foliage':'leaf-light',x,y,z,.40,.27,.38,[.18,a,.15]);leaf('leaf-light',x*.95,y+.15,z*.95,.23,.16,.28,[0,a,.22]);}
 }else if(kind==='reeds'){
  for(let i=0;i<9;i++){const x=Math.sin(i*9)*.32,z=Math.cos(i*7)*.3,t=.65+(i%4)*.13;bar('olive',[x,0,z],[x+.07,t,z],.023);round('rust',x+.07,t-.06,z,.07,.22);for(const side of [-1,1])add('leaf','leaf-light',[x+side*.08,t*.42,z],[.07,t*.75,.025],[0,0,-side*.25]);}
 }else if(kind.includes('barrel')){
  const n=kind==='barrels-cluster'?3:1,a=n===1?.66:.42;
  for(let i=0;i<n;i++){const x=n===1?0:(i%2-.5)*.46,z=n===1?0:(Math.floor(i/2)-.4)*.46;add('drum','rust',[x,h/2,z],[a,h,a]);for(const y of [.045,h*.23,h*.76,h-.025])add('hoop','dark-metal',[x,y,z],[a+.014,.029,a+.014]);round('rust',x,h-.006,z,a*.88,.014);round('steel',x+a*.2,h+.008,z,.065,.018);}
 }else if(kind==='sandbags'){
  for(let y=0;y<3;y++)for(const [cx,width]of y===1?[[-.36,.26],[0,.48],[.36,.26]]:[[-.235,.49],[.235,.49]]){
   const z=Math.sin(cx*15+y)*.022;add('bag','sand',[cx,(y+.5)*h/3,z],[width,h/3+.012,.65],[0,Math.sin(cx*9)*.045,0]);box('sand',cx,(y+.47)*h/3,z+.318,width*.77,.018,.015);
   for(let s=0;s<5;s++)box('wood',cx+width*(-.28+s*.14),(y+.47)*h/3,z+.328,.015,.009,.007);
   add('bag','sand',[cx+width*.45,(y+.55)*h/3,z],[.055,.06,.1]);
  }
 }else if(kind==='pallet'){
  for(const x of [-.36,0,.36])box('wood',x,.065,0,.12,.13,.94);
  for(let i=0;i<5;i++)box('wood',0,.16,(i-2)*.19,.98,.07,.145);
 }else if(/table|bench|hospital-bed|stretcher|scrub-sink/.test(kind)){
  legs();const timber=kind==='table-wood',bed=/bed|stretcher/.test(kind);
  box(timber?'wood':/lab|medical|hospital/.test(kind)?'enamel':'steel',0,h-.08,0,w,.12,d);
  for(const x of [-w*.36,w*.36])for(const z of [-d*.35,d*.35]){round('dark-metal',x,.028,z,.085,.055);box('steel',x,h-.20,z,.095,.18,.08);}
  if(/workbench/.test(kind)){box('wood',0,.21,0,w*.8,.065,d*.8);for(const z of [-d*.43,d*.43])box('dark-metal',0,h-.2,z,w*.89,.12,.04);for(const x of [-w*.3,w*.3])round('steel',x,h-.2,d*.457,.025,.012,.025,[Math.PI/2,0,0]);}
  for(const x of [-w*.36,w*.36])box('dark-metal',x,h*.28,0,.04,.05,d*.7);
  if(timber){for(let i=1;i<5;i++)box('dark-metal',0,h-.014,-d/2+i*d/5,w-.04,.006,.012);for(const x of [-w*.39,w*.39])for(let i=0;i<5;i++)round('dark-metal',x,h-.014,-d*.4+i*d*.2,.017,.006);for(const z of [-d*.37,d*.37])box('wood',0,h-.21,z,w*.8,.15,.075);}
  if(bed){add('cushion','linen',[0,h+.055,0],[w*.85,.18,d*.88]);add('cushion','linen',[0,h+.18,-d*.3],[w*.7,.12,d*.2]);box('linen',0,h+.151,d*.15,w*.85,.025,d*.49);for(const x of [-w*.425,w*.425])box('linen',x,h+.10,d*.15,.025,.13,d*.49);for(const z of [-d*.44,d*.44]){for(const x of [-w*.43,w*.43])round('steel',x,h+.1,z,.04,.38);box('steel',0,h+.29,z,w*.9,.045,.045);for(const x of [-w*.23,0,w*.23])round('steel',x,h+.18,z,.027,.22);}for(const x of [-w*.36,w*.36])for(const z of [-d*.35,d*.35])wheel(x,z);}
  else if(kind==='scrub-sink'){box('dark-metal',0,h-.008,0,w*.78,.018,d*.66);for(const x of [-w*.44,w*.44])box('steel',x,h+.04,0,.1,.14,d);for(const z of [-d*.44,d*.44])box('steel',0,h+.04,z,w,.14,.1);round('steel',0,h+.21,-d*.35,.045,.38);bar('steel',[0,h+.4,-d*.35],[0,h+.4,-d*.08],.045);round('steel',0,h+.35,-d*.08,.045,.1);}
  else if(/vise/.test(kind)){box('dark-metal',w*.27,h+.02,0,.34,.12,.34);for(const x of [w*.2,w*.36])box('steel',x,h+.14,0,.085,.19,.28);bar('steel',[w*.02,h+.13,0],[w*.5,h+.13,0],.04);bar('steel',[w*.5,h+.01,0],[w*.5,h+.25,0],.028);}
  else if(kind==='lab-bench')for(let i=0;i<3;i++){round('screen',-.4+i*.22,h+.13,0,.1,.28);round('linen',-.4+i*.22,h+.285,0,.11,.035);}
  else if(kind.startsWith('medical')){box('linen',0,h+.002,0,w*.6,.045,d*.62);round('steel',w*.35,h+.035,0,.23,.035);}
 }else if(kind==='iv-stand'){
  round('steel',0,h*.5,0,.035,h);for(let i=0;i<4;i++){const a=i*Math.PI/2;bar('steel',[0,.09,0],[Math.cos(a)*.28,.055,Math.sin(a)*.28],.04);}bar('steel',[-.21,h-.02,0],[.21,h-.02,0],.03);add('cushion','linen',[.17,h-.23,0],[.17,.29,.075]);bar('screen',[.17,h-.37,0],[.12,.3,.04],.013);
 }else if(/monitor|console|botanical-chamber/.test(kind)){
  if(kind==='botanical-chamber'){box('dark-metal',0,.13,0,.85,.26,.82);box('enamel',0,h-.1,0,.88,.2,.84);for(const x of [-.38,.38])for(const z of [-.35,.35])box('steel',x,h/2,z,.055,h,.055);box('screen',0,h/2,-.37,.71,h-.4,.035);round('rust',0,.36,0,.38,.23);bar('olive',[0,.45,0],[0,1.5,0],.04);for(let i=0;i<5;i++)leaf('leaf-light',Math.sin(i*3)*.17,.6+i*.16,0,.3,.17,.2);}
  else{box('steel',0,h*.38,0,w*.76,h*.76,d*.7);box('dark-metal',0,h*.8,d*.15,w*.74,h*.45,d*.35);box('screen',0,h*.82,d*.331,w*.59,h*.29,.025);for(let i=0;i<4;i++)box('leaf-light',-w*.23+i*w*.14,h*.8+(i%2)*.025,d*.347,w*.08,.015,.008);for(let i=0;i<3;i++)round(i?'linen':'red',-w*.22+i*w*.2,h*.55,d*.365,.052,.03,.052,[Math.PI/2,0,0]);}
 }else if(kind.startsWith('medicine-cabinet')){
  const a=w*.86,b=d*.78,open=kind.endsWith('-open');
  for(const x of [-a/2,a/2])box('steel',x,h/2,0,.055,h,b);
  box('steel',0,h/2,-b/2,a,h,.055);
  for(const y of [.07,h*.34,h*.65,h-.04])box('steel',0,y,0,a,.055,b);
  if(open){
   for(const side of [-1,1]){const angle=1.12;box('steel',side*(a/2-a/4*Math.cos(angle)),h/2,b/2+a/4*Math.sin(angle),a/2,h-.07,.045,[0,side*angle,0]);}
   for(let row=0;row<2;row++)for(let i=0;i<3;i++){const x=(i-1)*.22,y=(row?h*.65:h*.34)+.12;round(i===1?'rust':'linen',x,y,0,.12,.18);round('dark-metal',x,y+.102,0,.13,.025);}
  }else{
   for(const side of [-1,1])box('enamel',side*a/4,h/2,b/2,a/2-.015,h-.07,.045);
   for(const side of [-1,1])box('dark-metal',side*.07,h*.48,b/2+.045,.035,.22,.045);
   box('red',0,h*.76,b/2+.03,.28,.07,.025);box('red',0,h*.76,b/2+.031,.07,.28,.027);
  }
 }else if(/cabinet|crate|chest|toolbox|trolley/.test(kind)){
  const wood=/wood|crate(?!-steel)/.test(kind),m=wood?'wood':'steel',a=w*.86,b=d*.86,open=kind.endsWith('-open');
  if(kind==='instrument-trolley'){legs();for(const y of [.19,h-.035])box('steel',0,y,0,a,.06,b);for(const x of [-w*.36,w*.36])for(const z of [-d*.35,d*.35])wheel(x,z);box('linen',0,h+.005,0,a*.65,.025,b*.7);handle(0,h+.14,-b/2,a*.8);}
  else{
   box('dark-metal',0,.035,0,a,.07,b);
   if(wood){
    const boards=4;for(let j=0;j<boards;j++){const y=(j+.5)*h/boards;for(const x of [-a/2+.035,a/2-.035])box(m,x,y,0,.07,h/boards-.008,b);for(const z of [-b/2+.035,b/2-.035])box(m,0,y,z,a-.1,h/boards-.008,.07);}
   }else{for(const x of [-a/2+.035,a/2-.035])box(m,x,h/2,0,.07,h,b);for(const z of [-b/2+.035,b/2-.035])box(m,0,h/2,z,a-.1,h,.07);}
   if(open)box(m,0,h+.28,-b/2+.03,a,.56,.065,[-.22,0,0]);else box(m,0,h-.015,0,a,.07,b);
   if(wood){
    for(const z of [-b/2-.025,b/2+.025]){for(const x of [-a*.36,a*.36]){box('wood',x,h/2,z,.09,h,.065);for(const y of [h*.12,h*.87])round('dark-metal',x,y,z+Math.sign(z)*.038,.021,.008,.021,[Math.PI/2,0,0]);}box('wood',0,h/2,z,a*.94,.10,.066,[0,0,.55]);}
    for(const side of [-1,1])for(const y of [.06,h-.06]){box('wood',side*(a/2+.022),y,0,.06,.10,b*.94);box('wood',0,y,side*(b/2+.048),a*.98,.10,.05);}
   }
   else if(kind==='crate-steel'){
    // Industrial transit box: reinforced corners, lifting handles and a sealed lid.
    for(const x of [-a*.45,a*.45])for(const z of [-b*.45,b*.45])box('dark-metal',x,h/2,z,.085,h,.085);
    for(const z of [-b/2-.012,b/2+.012]){box('dark-metal',0,h*.91,z,a,.023,.019);handle(0,h*.60,z,.28);for(const x of [-a*.31,a*.31])box('steel',x,h*.87,z,.052,.12,.04);}
   }else if(/chest|toolbox/.test(kind)){
    box('dark-metal',0,h*.86,b/2+.008,a*.88,.012,.01);handle(0,h*.53,b/2+.035,.29);
   }else{for(let j=1;j<4;j++){box('dark-metal',0,h*j/4,b/2+.008,a*.83,.012,.01);handle(0,h*j/4+.09,b/2+.035);}if(/medicine/.test(kind)){box('red',0,h*.76,b/2+.022,.24,.07,.025);box('red',0,h*.76,b/2+.023,.07,.24,.026);}}
   if(/chest|toolbox/.test(kind))handle(0,h+.025,0,.25);
   if(/chest|toolbox/.test(kind))for(const x of [-a*.3,a*.3]){box('dark-metal',x,h*.76,b/2+.023,.065,h*.30,.023);box('steel',x,h*.75,b/2+.04,.072,.06,.025);round('steel',x,h*.94,-b/2,.038,.12,.038,[0,0,Math.PI/2]);}
   if(!wood)for(const side of [-1,1])for(let v=0;v<4;v++)box('dark-metal',side*(a/2+.002),h*.65+v*.034,-b*.15,.009,.013,b*.27);
   if(kind==='crate-stack')box('dark-metal',0,h/2,0,a+.015,.04,b+.015);
  }
 }else if(/first-aid|medicine/.test(kind)){
  add('cushion','linen',[0,.14,0],[.5,.28,.35]);box('red',0,.287,0,.3,.018,.075);box('red',0,.288,0,.075,.018,.23);handle(0,.3,-.14);
 }else if(kind.startsWith('gun-')){
  const pistol=kind==='gun-pistol';bar('dark-metal',[-.2,.11,0],[pistol?.18:.46,.11,0],.055);box('steel',-.05,.1,0,.22,.09,.1);box('wood',-.23,.09,.065,.2,.09,.12,[0,-.25,0]);if(!pistol)box('dark-metal',.06,.07,.11,.09,.07,.16,[0,-.2,0]);
 }else if(kind.startsWith('ammo-')){box('olive',0,.14,0,.42,.28,.3);box('steel',0,.29,0,.45,.035,.32);for(const x of [-.15,.15])box('sand',x,.15,.155,.025,.22,.01);handle(0,.325,0);}
 else if(kind==='wire-cutters'){for(const s of [-1,1]){bar('red',[s*.14,.05,.22],[s*.035,.05,-.02],.06);bar('steel',[s*.035,.05,-.02],[s*.09,.05,-.2],.04);}round('steel',0,.06,0,.09,.03);}
 else if(kind==='spare-parts'){for(let i=0;i<3;i++){add('ring','steel',[-.18+i*.18,.065,(i%2)*.13],[.15,.07,.15]);bar('dark-metal',[-.23,.055,-.18],[.25,.055,-.12],.04);}}
 else throw Error('Missing environment model: '+kind);
 return p;
}

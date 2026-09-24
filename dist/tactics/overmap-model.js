// Strategic drawing data. This is deliberately separate from local map/block schemas.
export const WIDTH=30,HEIGHT=15;
export const SIDES=['north','east','south','west'];
export const KINDS=['road','river','cliff'];
export const ROLES=['countryside','village','town','city','fortress','tutorial'];
export const TERRAINS=['plain','forest','mountains','wetland','plateau'];
export const OPPOSITE={north:'south',south:'north',east:'west',west:'east'};
export const STEP={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
export const slots=kind=>kind==='road'?[.5]:[1/3,2/3];
export function anchor({side,offset}){
 if(side==='north')return [offset*100,0];
 if(side==='south')return [offset*100,100];
 if(side==='west')return [0,offset*100];
 return [100,offset*100];
}
export function sector(){return {name:'',terrain:'plain',role:'countryside',difficulty:'unassigned',owner:'unassigned',facilities:[],routes:[],travel:[],gate:'none'};}
export function blank(){return {kind:'animal-factory-overmap-sketch',version:1,width:WIDTH,height:HEIGHT,name:'Untitled overmap',sectors:Array.from({length:WIDTH*HEIGHT},sector)};}
export function route(kind,a,b,ao=slots(kind)[0],bo=ao){return {kind,from:{side:a,offset:ao},to:{side:b,offset:bo}};}
export function demo(){
 const m=blank();m.name='Attachment study';
 m.sectors.forEach((s,i)=>{const x=i%WIDTH,y=Math.floor(i/WIDTH),n=(x*17+y*31)%23;s.difficulty=x<10?'easy':x<20?'medium':'hard';s.terrain=y===0&&x>11||y===14&&x>17?'mountains':n<5?'forest':n===8?'wetland':'plain';});
 // Explicitly illustrative geography, not a campaign-generator result.
 const riverOffsets=[1,1,1,2,2,2,1,1,2,2,2,2,1,1,2,2].map(n=>n/3);
 for(let y=0;y<HEIGHT;y++)m.sectors[y*WIDTH+7].routes.push(route('river','north','south',riverOffsets[y],riverOffsets[y+1]));
 for(let x=0;x<WIDTH;x++)m.sectors[7*WIDTH+x].routes.push(route('road','west','east'));
 for(let y=2;y<13;y++)m.sectors[y*WIDTH+18].routes.push(route('road','north','south'));
 for(let y=3;y<12;y++)m.sectors[y*WIDTH+24].routes.push(route('cliff','north','south',y%2?2/3:1/3,y%2?1/3:2/3));
 m.sectors[7*WIDTH+7].gate='bridge';m.sectors[7*WIDTH+24].gate='passage';
 for(const [x,y,role,name,facilities]of [[3,7,'village','Orchard',[]],[11,7,'town','Mill town',['workshop']],[18,7,'city','Foundry',['factory','workshop']],[27,7,'fortress','East watch',[]],[18,3,'fortress','North watch',[]]])Object.assign(m.sectors[y*WIDTH+x],{role,name,facilities,owner:'red-hats'});
 // User-authored footprint: XOO / XXO / XXO. Stage order and south exit are editable.
 const plateau=[[2,3],[2,4],[3,4],[3,5],[2,5]],exitTown=6*WIDTH+2;
 plateau.forEach(([x,y],i)=>Object.assign(m.sectors[y*WIDTH+x],{role:'tutorial',name:i===0?'Tutorial start':'Tutorial '+(i+1),tutorialStep:i+1,terrain:'plateau',difficulty:'easy'}));
 const journey=[...plateau,[2,6],[2,7]];
 for(let i=1;i<journey.length;i++){const [ax,ay]=journey[i-1],[bx,by]=journey[i],side=bx>ax?'east':bx<ax?'west':by>ay?'south':'north';m.sectors[ay*WIDTH+ax].travel.push(side);m.sectors[by*WIDTH+bx].travel.push(OPPOSITE[side]);}
 Object.assign(m.sectors[exitTown],{role:'town',name:'Starting town · plateau descent',owner:'red-hats',terrain:'plain'});
 Object.assign(m.sectors[7*WIDTH+2],{role:'town',name:'Starting town · workshop',owner:'red-hats',terrain:'plain',facilities:['workshop']});
 return m;
}
export function validate(m){
 if(!m||m.kind!=='animal-factory-overmap-sketch'||m.version!==1||m.width!==WIDTH||m.height!==HEIGHT||!Array.isArray(m.sectors)||m.sectors.length!==WIDTH*HEIGHT)throw Error('Use a version 1 overmap sketch with 30 × 15 sectors. Local maps and blocks use a different format.');
 if(typeof m.name!=='string'||m.name.length>100)throw Error('Overmap name must be 100 characters or fewer.');
 const has=(arr,v)=>arr.includes(v);
 m.sectors.forEach((s,i)=>{
  const fail=()=>{throw Error('Invalid properties in sector '+(i%WIDTH+1)+','+(Math.floor(i/WIDTH)+1)+'.');};
  if(!s||typeof s.name!=='string'||s.name.length>100||!has(TERRAINS,s.terrain)||!has(ROLES,s.role)||!has(['unassigned','easy','medium','hard'],s.difficulty)||!has(['unassigned','player','red-hats','neutral'],s.owner)||!has(['none','bridge','passage'],s.gate))fail();
  for(const [key,allowed,max]of [['facilities',['factory','workshop'],2],['travel',SIDES,4]])if(!Array.isArray(s[key])||s[key].length>max||new Set(s[key]).size!==s[key].length||s[key].some(v=>!has(allowed,v)))fail();
  if(s.tutorialStep!==undefined&&(!Number.isInteger(s.tutorialStep)||s.tutorialStep<1||s.tutorialStep>5||s.role!=='tutorial'))fail();
  if(!Array.isArray(s.routes)||s.routes.length>12)fail();
  for(const r of s.routes){if(!r||!has(KINDS,r.kind))fail();for(const p of [r.from,r.to])if(!p||!has(SIDES,p.side)||!slots(r.kind).some(n=>Math.abs(n-p.offset)<1e-9)||typeof p.offset!=='number')fail();if(r.from.side===r.to.side&&r.from.offset===r.to.offset)fail();}
 });return m;
}
export function warnings(m,index){
 const s=m.sectors[index],x=index%WIDTH,y=Math.floor(index/WIDTH),out=[];
 for(const r of s.routes)for(const p of [r.from,r.to]){
  const [dx,dy]=STEP[p.side],nx=x+dx,ny=y+dy;if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT)continue;
  const other=m.sectors[ny*WIDTH+nx];
  if(!other.routes.some(q=>q.kind===r.kind&&[q.from,q.to].some(e=>e.side===OPPOSITE[p.side]&&Math.abs(e.offset-p.offset)<1e-9)))out.push(`${r.kind} at ${p.side} ${fraction(p.offset)} has no matching attachment in sector ${nx+1},${ny+1}.`);
 }
 for(const side of s.travel){const [dx,dy]=STEP[side],nx=x+dx,ny=y+dy;if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT)out.push(`Travel at ${side} leaves the overmap.`);else if(!m.sectors[ny*WIDTH+nx].travel.includes(OPPOSITE[side]))out.push(`Travel at ${side} is not declared by the neighboring sector.`);}
 if(s.gate==='bridge'&&!['road','river'].every(k=>s.routes.some(r=>r.kind===k)))out.push('Bridge needs a road and a river.');
 if(s.gate==='passage'&&!['road','cliff'].every(k=>s.routes.some(r=>r.kind===k)))out.push('Passage needs a road and a cliff.');
 return [...new Set(out)];
}
export const fraction=n=>Math.abs(n-.5)<1e-9?'½':Math.abs(n-1/3)<1e-9?'⅓':'⅔';
export class SketchDocument{
 constructor(map=demo()){this.map=structuredClone(validate(map));this.past=[];this.future=[];}
 replace(map){const next=structuredClone(validate(map));this.past.push(this.map);if(this.past.length>60)this.past.shift();this.map=next;this.future=[];}
 edit(index,fn){const next=structuredClone(this.map);fn(next.sectors[index]);this.replace(next);}
 undo(){if(this.past.length){this.future.push(this.map);this.map=this.past.pop();}}
 redo(){if(this.future.length){this.past.push(this.map);this.map=this.future.pop();}}
}

// Plateau rims are drawn only at the outside of contiguous plateau terrain.
export function plateauRim(m,index){
 if(m.sectors[index].terrain!=='plateau')return [];
 const x=index%WIDTH,y=Math.floor(index/WIDTH);
 return SIDES.filter(side=>{const [dx,dy]=STEP[side],nx=x+dx,ny=y+dy;return nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT||m.sectors[ny*WIDTH+nx].terrain!=='plateau';}).map(side=>({side,opening:m.sectors[index].travel.includes(side)}));
}

import {helicoidShot,seededShots,studyBody,traceStudy} from './helicoid-shot.js';
const $=id=>document.getElementById(id),canvas=$('pattern'),ctx=canvas.getContext('2d'),g=$('geometry').getContext('2d');let shots=[],bodies=[];
const color=result=>result==='miss'?'#66786e':['cover','ground'].includes(result)?'#ab3428':result===$('zone').value?'#247248':'#bd842b';
function update(){
 for(const id of ['accuracy','precision','distance','adjustment','twist','shot'])$(id+'-value').textContent=$(id).value;
 const distance=+$('distance').value,zone=$('zone').value,random=seededShots(+$('seed').value);bodies=studyBody.map(b=>({...b,center:[b.center[0],distance,b.center[2]]}));
 shots=Array.from({length:1000},()=>{const shot=helicoidShot({origin:[0,0,1.3],aim:[0,distance,zone==='head'?1.65:zone==='legs'?.43:1.12],accuracy:+$('accuracy').value,precision:+$('precision').value,adjustment:+$('adjustment').value/100,twist:+$('twist').value,roll:random(),rotation:random()});return {...shot,result:traceStudy(shot,bodies,$('cover').checked)};});
 const selected=shots.filter(s=>s.result.zone===zone).length,any=shots.filter(s=>['head','torso','legs'].includes(s.result.zone)).length,blocked=shots.filter(s=>['cover','ground'].includes(s.result.zone)).length;
 $('results').textContent='Selected part '+(selected/10).toFixed(1)+'%  ·  Any body part '+(any/10).toFixed(1)+'%  ·  Blocked '+(blocked/10).toFixed(1)+'%';draw();
}
function draw(){
 const selected=shots[+$('shot').value],max=Math.max(1.5,...shots.map(s=>Math.abs(s.targetPlane[0])),...shots.map(s=>Math.abs(s.targetPlane[2]-1))),scale=Math.min(230,240/max),p=(x,z)=>[500+x*scale,300-(z-1)*scale];ctx.clearRect(0,0,1000,580);
 ctx.strokeStyle='#dcd3b8';ctx.lineWidth=1;for(let x=-10;x<=10;x+=.5){ctx.beginPath();ctx.moveTo(...p(x,-20));ctx.lineTo(...p(x,20));ctx.stroke();}for(let z=-10;z<=10;z+=.5){ctx.beginPath();ctx.moveTo(...p(-20,z));ctx.lineTo(...p(20,z));ctx.stroke();}
 for(const b of bodies){ctx.beginPath();ctx.ellipse(...p(b.center[0],b.center[2]),b.radii[0]*scale,b.radii[2]*scale,0,0,Math.PI*2);ctx.fillStyle='#7b896b';ctx.fill();ctx.strokeStyle='#354d3b';ctx.stroke();}
 if($('cover').checked){const a=p(-.8,1.25),b=p(.8,0);ctx.fillStyle='#9b715e55';ctx.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);}
 for(const s of shots){const [x,y]=p(s.targetPlane[0],s.targetPlane[2]);ctx.fillStyle=color(s.result.zone);ctx.globalAlpha=.55;if(['cover','ground'].includes(s.result.zone)){ctx.strokeStyle=ctx.fillStyle;ctx.beginPath();ctx.moveTo(x-2,y-2);ctx.lineTo(x+2,y+2);ctx.moveTo(x+2,y-2);ctx.lineTo(x-2,y+2);ctx.stroke();}else{ctx.beginPath();ctx.arc(x,y,2,0,7);ctx.fill();}}ctx.globalAlpha=1;
 const a=p(selected.aim[0],selected.aim[2]);ctx.strokeStyle='#172a20';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a[0]-10,a[1]);ctx.lineTo(a[0]+10,a[1]);ctx.moveTo(a[0],a[1]-10);ctx.lineTo(a[0],a[1]+10);ctx.stroke();ctx.beginPath();ctx.arc(...p(selected.targetPlane[0],selected.targetPlane[2]),7,0,7);ctx.stroke();ctx.font='16px system-ui';ctx.fillStyle='#24372e';ctx.fillText('Target-plane view · grid = 0.5 m',22,28);
 // Illustrative coordinate view: axis left-to-right, radial axes projected obliquely.
 g.clearRect(0,0,1000,320);const q=(depth,r,angle)=>[90+depth*690+Math.cos(angle)*r*30,170-Math.sin(angle)*r*65];
 g.strokeStyle='#9aa286';g.lineWidth=1;g.beginPath();g.moveTo(70,170);g.lineTo(930,170);g.stroke();
 const twist=+$('twist').value,phase=selected.angle-twist*Math.PI*2*(selected.depth-1);for(let j=0;j<=4;j++){g.beginPath();for(let i=0;i<=120;i++){const t=.78+i/120*.44,angle=phase+(t-1)*twist*Math.PI*2;const v=q(t,j/4,angle);if(i)g.lineTo(...v);else g.moveTo(...v);}g.stroke();}
 for(let i=0;i<=20;i++){const t=.78+i/20*.44,angle=phase+(t-1)*twist*Math.PI*2;g.beginPath();g.moveTo(...q(t,0,angle));g.lineTo(...q(t,1,angle));g.stroke();}
 const radius=Math.min(1.5,selected.radius/Math.max(.01,selected.distance*selected.sigma)),end=q(selected.depth,radius,selected.angle);g.strokeStyle='#a93425';g.lineWidth=2;g.beginPath();g.moveTo(90,170);g.lineTo(...end);g.stroke();g.fillStyle='#a93425';g.beginPath();g.arc(...end,5,0,7);g.fill();g.fillStyle='#24372e';g.font='16px system-ui';g.fillText('Muzzle',55,207);g.fillText('Aim axis / target',680,207);g.fillText('Selected helicoid point',Math.min(800,end[0]-60),Math.max(30,end[1]-14));g.fillText('Helicoid construction · schematic scale',22,28);
 $('shot-value').textContent=+$('shot').value+1;$('detail').textContent='Shot '+(+$('shot').value+1)+' → '+selected.result.zone+' · axial factor '+selected.depth.toFixed(3)+' · radial offset '+selected.radius.toFixed(3)+' m · rotation '+(selected.angle*180/Math.PI%360).toFixed(1)+'°';
}
for(const id of ['accuracy','precision','distance','adjustment','twist','zone','cover','seed'])$(id).addEventListener('input',update);$('shot').addEventListener('input',draw);$('reroll').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];update();};update();

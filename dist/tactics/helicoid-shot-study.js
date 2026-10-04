import {SHOT_MODELS,DEFAULT_SHOT_SETUP,shotInputs,compareShots,distanceComparison} from './shot-models.js';

const $=id=>document.getElementById(id);
const controls=['accuracy','precision','penalty','distance','aim-level','zone','cover','smoke','smoke-bypass','seed'];
let selectedModel='critical',batch,inputs,curveKey='',curves=[],pending=false;
const percent=(n,total)=>(100*n/total).toFixed(1)+'%';
const sign=n=>(n>=0?'+':'')+n;
const settings=()=>({accuracy:+$('accuracy').value,precision:+$('precision').value,penalty:+$('penalty').value,distance:+$('distance').value,aimLevel:$('aim-level').value,zone:$('zone').value,cover:$('cover').value,smoke:$('smoke').checked,smokeBypass:$('smoke-bypass').checked,seed:+$('seed').value});
const assign=c=>{for(const [key,id]of [['accuracy','accuracy'],['precision','precision'],['penalty','penalty'],['distance','distance'],['aimLevel','aim-level'],['zone','zone'],['cover','cover'],['seed','seed']])$(id).value=c[key];$('smoke').checked=c.smoke;$('smoke-bypass').checked=c.smokeBypass;};

$('comparison').innerHTML=SHOT_MODELS.map(m=>`<article class="model" id="model-${m.id}" style="--model-color:${m.color}"><div class="model-tag">${m.tag}</div><h3>${m.name}</h3><p>${m.description}</p><button type="button" data-model="${m.id}" aria-pressed="false">Inspect this pattern</button><canvas id="pattern-${m.id}" width="340" height="345" aria-label="${m.name} shot pattern"></canvas><div class="stat-main"><strong data-stat="any"></strong><span>any body hit</span></div><dl class="stats"><dt>Successful hit rolls</dt><dd data-stat="rolled"></dd><dt>Selected part hit</dt><dd data-stat="selected"></dd><dt>Miss hit elsewhere</dt><dd data-stat="incidental"></dd><dt>Smoke grazes</dt><dd data-stat="grazes"></dd><dt>Cover / ground</dt><dd data-stat="blocked"></dd><dt>Damage per AP</dt><dd data-stat="damage"></dd></dl><p class="roll-count" data-stat="criticals"></p></article>`).join('');

function schedule(){if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;update();});}}
function update(){
 const config=settings();
 if(!$('seed').checkValidity()||$('seed').value===''){$('input-error').textContent='Enter a whole-number seed from 0 to 4294967295.';return;}
 $('input-error').textContent='';
 for(const id of ['accuracy','precision','penalty','distance'])$(id+'-value').textContent=$(id).value+(id==='distance'?' m':id==='penalty'?' points':'%');
 inputs=shotInputs(config.seed);batch=compareShots(config,inputs);
 const {setup}=batch;
 $('geometry-readout').textContent='Final hit chance '+setup.hitChance+'% · '+setup.ap+' AP. Selected part spans '+(setup.angularWidth*180/Math.PI).toFixed(2)+'° from the muzzle.';
 $('batch-info').textContent='1,000 shots / model · seed '+config.seed;
 for(const model of batch.models){const card=$('model-'+model.id),s=model.summary;
  const stat=(name,value)=>card.querySelector('[data-stat="'+name+'"]').textContent=value;
  stat('any',percent(s.any,s.count));stat('rolled',percent(s.rolledHits,s.count));stat('selected',percent(s.selected,s.count));stat('incidental',percent(s.incidental,s.count));stat('grazes',percent(s.grazes,s.count));stat('blocked',percent(s.cover+s.ground,s.count));stat('damage',(s.averageDamage/setup.ap).toFixed(2));
  stat('criticals','Natural 20: '+s.successes+' · Natural 1: '+s.failures+' (5% each in the rules)');
 }
 const nextKey=JSON.stringify({...config,distance:0});
 if(nextKey!==curveKey){curves=distanceComparison(config,inputs);curveKey=nextKey;}
 drawChart();drawInspector();
}

function shotColor(s){return s.graze?'#367ca2':s.hit?(s.collision.zone===batch.setup.zone?'#237749':'#aa7527'):['cover','ground'].includes(s.collision.zone)?'#b74232':'#68786e';}
function drawPattern(model){
 const canvas=$('pattern-'+model.id),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,scale=135,p=(x,z)=>[w/2+x*scale,h-37-z*scale];
 c.clearRect(0,0,w,h);c.strokeStyle='#d9d4b9';c.lineWidth=1;
 for(let x=-1;x<=1;x+=.5){c.beginPath();c.moveTo(...p(x,-1));c.lineTo(...p(x,3));c.stroke();}for(let z=0;z<=2.5;z+=.5){c.beginPath();c.moveTo(...p(-2,z));c.lineTo(...p(2,z));c.stroke();}
 for(const body of batch.setup.bodies){c.beginPath();c.ellipse(...p(body.center[0],body.center[2]),body.radii[0]*scale,body.radii[2]*scale,0,0,Math.PI*2);c.fillStyle='#879479';c.fill();c.strokeStyle='#53684e';c.stroke();}
 const cover=batch.setup.coverPlane;if(cover){const a=p(-cover.halfWidth,cover.height),b=p(cover.halfWidth,0);c.fillStyle='#aa766755';c.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);c.strokeStyle='#916a5b';c.beginPath();c.moveTo(...a);c.lineTo(b[0],a[1]);c.stroke();}
 if(batch.setup.smoke){c.fillStyle='#bdc8c12b';c.fillRect(...p(-.8,2.2),1.6*scale,2.2*scale);}
 let outside=0;c.save();c.beginPath();c.rect(5,25,w-10,h-46);c.clip();
 for(const shot of model.shots){const [x,y]=p(shot.targetPlane[0],shot.targetPlane[2]);if(x<5||x>w-5||y<25||y>h-21){outside++;continue;}c.globalAlpha=.44;c.fillStyle=shotColor(shot);c.strokeStyle=c.fillStyle;
  if(!shot.hit&&['cover','ground'].includes(shot.collision.zone)){c.beginPath();c.moveTo(x-1.8,y-1.8);c.lineTo(x+1.8,y+1.8);c.moveTo(x+1.8,y-1.8);c.lineTo(x-1.8,y+1.8);c.stroke();}else{c.beginPath();c.arc(x,y,1.7,0,7);c.fill();}
 }
 c.restore();c.globalAlpha=1;const [ax,ay]=p(batch.setup.aim[0],batch.setup.aim[2]);c.strokeStyle='#182f23';c.lineWidth=1.5;c.beginPath();c.moveTo(ax-7,ay);c.lineTo(ax+7,ay);c.moveTo(ax,ay-7);c.lineTo(ax,ay+7);c.stroke();
 const shot=model.shots[+$('shot').value],[sx,sy]=p(shot.targetPlane[0],shot.targetPlane[2]),px=Math.max(8,Math.min(w-8,sx)),py=Math.max(28,Math.min(h-24,sy));c.beginPath();c.arc(px,py,5,0,7);c.stroke();
 c.fillStyle='#4a5f50';c.font='11px system-ui';c.fillText('Grid 0.5 m · '+outside+' shots outside view',10,16);c.fillText('Ring: inspected shot'+(px!==sx||py!==sy?' (outside view)':''),10,h-8);
}

function drawChart(){
 const canvas=$('distance-chart'),c=canvas.getContext('2d'),x=d=>70+(d-1)/99*965,y=p=>225-p*1.85;
 c.clearRect(0,0,1080,280);c.font='13px system-ui';c.lineWidth=1;
 for(let p=0;p<=100;p+=25){c.strokeStyle='#d9d4bd';c.beginPath();c.moveTo(70,y(p));c.lineTo(1035,y(p));c.stroke();c.fillStyle='#53654f';c.fillText(p+'%',22,y(p)+4);}
 for(const d of [1,10,20,40,60,100]){c.fillText(d+' m',x(d)-10,249);}
 const rolled=batch.models[0].summary,rolledPercent=100*rolled.rolledHits/rolled.count;
 c.strokeStyle='#233d32';c.lineWidth=1.5;c.setLineDash([6,5]);c.beginPath();c.moveTo(70,y(rolledPercent));c.lineTo(1035,y(rolledPercent));c.stroke();c.setLineDash([]);c.fillStyle='#233d32';c.fillText('Successful hit rolls: '+rolledPercent.toFixed(1)+'% at every distance',70,20);
 for(const m of SHOT_MODELS){c.strokeStyle=m.color;c.lineWidth=2.5;c.beginPath();curves.forEach((row,i)=>{const s=row.models.find(v=>v.id===m.id).summary,px=x(row.distance),py=y(s.any/s.count*100);if(i)c.lineTo(px,py);else c.moveTo(px,py);});c.stroke();c.fillStyle=m.color;for(const row of curves){const s=row.models.find(v=>v.id===m.id).summary;c.beginPath();c.arc(x(row.distance),y(s.any/s.count*100),3.5,0,7);c.fill();}}
 const selectedX=x(batch.setup.distance);c.strokeStyle='#243d3280';c.setLineDash([4,5]);c.lineWidth=1;c.beginPath();c.moveTo(selectedX,32);c.lineTo(selectedX,225);c.stroke();c.setLineDash([]);
 $('range-table').innerHTML='<caption>Successful rolls: '+rolledPercent.toFixed(1)+'% throughout · cells show actual body hits and mean damage per AP</caption><thead><tr><th scope="col">Distance</th>'+SHOT_MODELS.map(m=>'<th scope="col">'+m.name+'</th>').join('')+'</tr></thead><tbody>'+curves.map(row=>'<tr><th scope="row">'+row.distance+' m</th>'+row.models.map(m=>'<td>'+percent(m.summary.any,m.summary.count)+' · '+(m.summary.averageDamage/row.ap).toFixed(2)+'/AP</td>').join('')+'</tr>').join('')+'</tbody>';
}

function shotOutcome(model,index){
 const s=model.shots[index];
 const roll=s.critical==='success'?'Natural 20 · critical success':s.critical==='failure'?'Natural 1 · critical failure':'D20 '+s.die+' · ordinary shot';
 const check=s.critical==='ordinary'?'Ordinary check: '+(inputs[index].accuracyRoll*100).toFixed(1)+'%; needs below '+(s.ordinaryChance*100).toFixed(1)+'%.':'Critical determines the hit roll.';
 const flight=s.rolledHit?'Direct aim · helicoid bypassed':(s.error*180/Math.PI).toFixed(2)+'° miss'+(s.missAdjusted?' · moved beyond selected part':'');
 const margin=model.id==='margin'&&!s.rolledHit&&s.critical==='ordinary'?'<br>Miss margin: '+s.die+' '+sign(batch.setup.modifier)+' − 11 = '+s.margin:'';
 return '<div class="shot-result" style="--model-color:'+model.color+'">'+model.name+'<strong>Hit roll: '+(s.rolledHit?'SUCCESS':'MISS')+'</strong>'+roll+'<br>'+check+'<br><b>'+(s.graze?'Grazing ':s.hit?'Hit ':'')+s.collision.zone+(s.hit?' · '+s.damage+' damage':'')+'</b><br>'+flight+margin+'</div>';
}

function drawInspector(){
 const index=+$('shot').value;let selected;
 for(const m of batch.models){const active=m.id===selectedModel,card=$('model-'+m.id),button=card.querySelector('button');card.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?'Inspecting this pattern':'Inspect this pattern';drawPattern(m);if(active)selected=m;}
 $('shot-value').textContent=index+1;$('inspector-model').textContent=selected.name;
 $('shot-outcomes').innerHTML=batch.models.map(m=>shotOutcome(m,index)).join('');
 const shot=selected.shots[index],canvas=$('geometry'),c=canvas.getContext('2d');c.clearRect(0,0,1080,250);
 // Diagram uses the sampled helicoid phase. Radial scale is exaggerated;
 // neither its diagram length nor its twist applies a second range penalty.
 const q=(t,r,a)=>[75+t*710+Math.cos(a)*r*35,125-Math.sin(a)*r*70],phase=shot.angle-2*Math.PI;
 if(!shot.rolledHit){c.strokeStyle='#b2b49a';c.lineWidth=1;for(let j=0;j<=4;j++){c.beginPath();for(let i=0;i<=80;i++){const t=.75+i/80*.5,p=q(t,j/4,phase+2*Math.PI*t);if(i)c.lineTo(...p);else c.moveTo(...p);}c.stroke();}for(let i=0;i<=14;i++){const t=.75+i/14*.5;c.beginPath();c.moveTo(...q(t,0,phase+2*Math.PI*t));c.lineTo(...q(t,1,phase+2*Math.PI*t));c.stroke();}}
 c.strokeStyle='#718774';c.setLineDash([5,5]);c.beginPath();c.moveTo(75,125);c.lineTo(995,125);c.stroke();c.setLineDash([]);
 const diagramRadius=Math.min(1.2,shot.radius/Math.max(.02,shot.sigma*2)),end=q(1,diagramRadius,shot.angle);c.strokeStyle=selected.color;c.lineWidth=2;c.beginPath();c.moveTo(75,125);c.lineTo(end[0]+(end[0]-75)*.22,end[1]+(end[1]-125)*.22);c.stroke();c.fillStyle=selected.color;c.beginPath();c.arc(...end,5,0,7);c.fill();c.font='14px system-ui';c.fillStyle='#233d32';c.fillText('Muzzle',48,157);c.fillText('Aim axis',960,111);c.fillText(shot.rolledHit?'Successful roll · direct aim':'Miss placement · helicoid schematic',22,28);c.fillText('Straight projectile ray',165,95);c.fillText(shot.rolledHit?'Aim point':'Sampled miss',end[0]-65,Math.max(51,end[1]-18));
 const offset=shot.distance*Math.tan(shot.error);$('detail').textContent=shot.rolledHit?'Shot '+(index+1)+': successful probability roll. The ray goes directly to the aim point; the helicoid is not used. First collision: '+shot.collision.zone+'.':'Shot '+(index+1)+' · '+(shot.angle*180/Math.PI%360).toFixed(1)+'° rotation · '+(shot.error*180/Math.PI).toFixed(2)+'° error · '+offset.toFixed(3)+' m offset at target distance.'+(shot.missAdjusted?' The original sample would hit the selected part, so it was moved just beyond its outline.':'')+' The diagram compresses distance and exaggerates offsets; calculations use metres.';
}

$('controls').onsubmit=e=>e.preventDefault();for(const id of controls)$(id).addEventListener('input',schedule);
$('shot').addEventListener('input',()=>{if(batch)drawInspector();});
$('comparison').addEventListener('click',e=>{const button=e.target.closest('[data-model]');if(button){selectedModel=button.dataset.model;drawInspector();}});
$('next-shot').onclick=()=>{$('shot').value=(+$('shot').value+1)%inputs.length;drawInspector();};
function findDie(die){const start=+$('shot').value;for(let n=1;n<=inputs.length;n++){const index=(start+n)%inputs.length;if(inputs[index].die===die){$('shot').value=index;drawInspector();return;}}}
$('find-failure').onclick=()=>findDie(1);$('find-success').onclick=()=>findDie(20);
$('reroll').onclick=()=>{$('seed').value=crypto.getRandomValues(new Uint32Array(1))[0];schedule();};
$('reset').onclick=()=>{assign(DEFAULT_SHOT_SETUP);$('shot').value=0;schedule();};
const scenarios={close:{distance:1},cover:{distance:20,zone:'head',cover:'head'},range:{distance:60,aimLevel:'full'},smoke:{distance:15,smoke:true}};
for(const button of document.querySelectorAll('[data-scenario]'))button.onclick=()=>{assign({...DEFAULT_SHOT_SETUP,...scenarios[button.dataset.scenario]});$('shot').value=0;schedule();};
assign(DEFAULT_SHOT_SETUP);update();

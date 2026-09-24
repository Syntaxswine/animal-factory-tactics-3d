import {WIDTH,HEIGHT,SIDES,ROLES,TERRAINS,slots,fraction,route,blank,demo,validate,warnings,SketchDocument} from './overmap-model.js';
import {svg,drawSector,icon,LEGEND,crossing} from './overmap-symbols.js';
const $=id=>document.getElementById(id),doc=new SketchDocument(),STORAGE='animal-factory-overmap-sketch-v1';
let selected=7*WIDTH+7;
const status=text=>{$('status').textContent=text;};
const attempt=fn=>{try{fn();}catch(e){status(e.message);}};
const option=(v,label=v)=>new Option(label.replaceAll('-',' '),v);
for(const [id,values]of [['terrain',TERRAINS],['role',ROLES],['difficulty',['unassigned','easy','medium','hard']],['owner',['unassigned','player','red-hats','neutral']]])for(const v of values)$(id).add(option(v));
function edit(fn){attempt(()=>{doc.edit(selected,fn);render();status('Sector updated. Save to keep this sketch; Undo restores the previous change.');});}
function textNode(text,attrs){const n=svg('text',attrs);n.textContent=text;return n;}
function drawGrid(){
 const host=$('overmap');host.replaceChildren();
 for(let x=0;x<WIDTH;x++)host.append(textNode(x+1,{x:x*100+50,y:-8,class:'coord'}));
 for(let y=0;y<HEIGHT;y++)host.append(textNode(y+1,{x:-13,y:y*100+54,class:'coord'}));
 doc.map.sectors.forEach((s,i)=>{
  const x=i%WIDTH,y=Math.floor(i/WIDTH),g=svg('g',{transform:`translate(${x*100} ${y*100})`,class:'sector-cell',role:'button',tabindex:i===selected?0:-1,'aria-label':`Sector ${x+1}, ${y+1}: ${s.name||s.role}, ${s.difficulty}`,'aria-pressed':String(i===selected),'data-sector':i});
  const title=svg('title');title.textContent=`${x+1},${y+1} · ${s.name||s.role}\n${s.routes.map(r=>r.kind+': '+r.from.side+' '+fraction(r.from.offset)+' → '+r.to.side+' '+fraction(r.to.offset)).join('\n')}`;
  g.append(title,drawSector(s,{ports:$('ports').checked,overlay:$('overlay').value}),svg('rect',{width:100,height:100,class:'cell-border'}));
  if(i===selected)g.append(svg('rect',{x:2,y:2,width:96,height:96,class:'selection'}));
  const choose=()=>{selected=i;render();};g.onclick=choose;
  g.onkeydown=e=>{let next=i;if(e.key==='ArrowRight')next=y*WIDTH+Math.min(WIDTH-1,x+1);else if(e.key==='ArrowLeft')next=y*WIDTH+Math.max(0,x-1);else if(e.key==='ArrowUp')next=Math.max(0,y-1)*WIDTH+x;else if(e.key==='ArrowDown')next=Math.min(HEIGHT-1,y+1)*WIDTH+x;else if(e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();selected=next;render();$('overmap').querySelector(`[data-sector="${selected}"]`).focus();};
  host.append(g);
 });
 const colors=$('overlay').value==='difficulty'?[['Easy','#dbe0c1'],['Medium','#ebd7ad'],['Hard','#e2bbb0'],['Unassigned','#ece4cf']]:$('overlay').value==='ownership'?[['Player','#c3d9d5'],['Red Hats','#e4b6a7'],['Neutral','#d7d3c1'],['Unassigned','#ece4cf']]:[['Landscape','#ece4cf']];
 $('overlay-key').replaceChildren(...colors.map(([label,color])=>{const span=document.createElement('span'),chip=document.createElement('i');chip.className='swatch';chip.style.background=color;span.append(chip,label);return span;}));
 $('counts').textContent=`450 sectors · ${doc.map.sectors.filter(s=>s.routes.some(r=>r.kind==='river')).length} river sectors · ${doc.map.sectors.filter(s=>s.gate==='bridge').length} bridges`;
}
function drawDetail(s){
 const el=$('detail');el.replaceChildren(drawSector(s,{ports:true,overlay:$('overlay').value,detail:true}),svg('rect',{width:100,height:100,class:'detail-outline'}));
 for(const n of [1/3,.5,2/3]){const v=n*100,t=fraction(n);el.append(textNode(t,{x:v,y:-3,class:'edge-label'}),textNode(t,{x:v,y:106,class:'edge-label'}),textNode(t,{x:-6,y:v+1.5,class:'edge-label'}),textNode(t,{x:107,y:v+1.5,class:'edge-label'}));}
 for(const [t,x,y]of [['N',50,-11],['S',50,114],['W',-13,52],['E',114,52]])el.append(textNode(t,{x,y,class:'side-label'}));
}
function pathEditor(r,index){
 const root=document.createElement('div');root.className='route-editor';const heading=document.createElement('div');heading.className='route-heading';const name=document.createElement('b');name.textContent=r.kind;const remove=document.createElement('button');remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${r.kind} path ${index+1}`);remove.onclick=()=>edit(s=>s.routes.splice(index,1));heading.append(name,remove);root.append(heading);
 for(const key of ['from','to']){const row=document.createElement('div');row.className='endpoint';const label=document.createElement('span');label.textContent=key==='from'?'From':'To';const side=document.createElement('select'),offset=document.createElement('select');side.setAttribute('aria-label',`${r.kind} ${index+1} ${key} edge`);offset.setAttribute('aria-label',`${r.kind} ${index+1} ${key} offset`);SIDES.forEach(v=>side.add(option(v)));slots(r.kind).forEach(v=>offset.add(option(String(v),fraction(v))));side.value=r[key].side;offset.value=String(r[key].offset);side.onchange=()=>edit(s=>s.routes[index][key].side=side.value);offset.onchange=()=>edit(s=>s.routes[index][key].offset=Number(offset.value));row.append(label,side,offset);root.append(row);}
 return root;
}
function render(){
 const s=doc.map.sectors[selected];$('map-name').value=doc.map.name;$('map-caption').textContent=doc.map.name;$('sector-title').textContent=`${String(selected%WIDTH+1).padStart(2,'0')} / ${String(Math.floor(selected/WIDTH)+1).padStart(2,'0')}`;
 drawGrid();drawDetail(s);
 $('sector-name').value=s.name;for(const id of ['terrain','role','difficulty','owner','gate'])$(id).value=s[id];for(const id of ['factory','workshop'])$(id).checked=s.facilities.includes(id);
 $('routes').replaceChildren(...s.routes.map(pathEditor));if(!s.routes.length)$('routes').textContent='No paths in this sector.';
 for(const side of SIDES)$('travel-'+side).checked=s.travel.includes(side);
 const issues=warnings(doc.map,selected);
 if(s.gate!=='none'){const obstacle=s.gate==='bridge'?'river':'cliff';if(s.routes.some(r=>r.kind==='road')&&s.routes.some(r=>r.kind===obstacle)&&!s.routes.filter(r=>r.kind==='road').some(a=>s.routes.filter(r=>r.kind===obstacle).some(b=>crossing(a,b))))issues.push('The paths do not intersect. Crossing symbol is shown provisionally in the corner.');}
 $('warnings').replaceChildren(...(issues.length?issues:['All drawn attachments match their neighbors.']).map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
 $('undo').disabled=!doc.past.length;$('redo').disabled=!doc.future.length;
}
for(const side of SIDES){const l=document.createElement('label');l.className='check';const input=document.createElement('input');input.type='checkbox';input.id='travel-'+side;input.onchange=()=>edit(s=>{s.travel=SIDES.filter(v=>$('travel-'+v).checked);});l.append(input,side);$('travel').append(l);}
for(const id of ['terrain','role','difficulty','owner','gate'])$(id).onchange=()=>edit(s=>s[id]=$(id).value);
$('sector-name').onchange=()=>edit(s=>s.name=$('sector-name').value.trim());
for(const id of ['factory','workshop'])$(id).onchange=()=>edit(s=>s.facilities=['factory','workshop'].filter(v=>$(v).checked));
$('map-name').onchange=()=>attempt(()=>{doc.replace({...doc.map,name:$('map-name').value.trim()});render();status('Overmap renamed.');});
$('add-route').onclick=()=>edit(s=>{const kind=$('new-kind').value;s.routes.push(route(kind,'north','south',slots(kind)[0],slots(kind).at(-1)));});
for(const id of ['ports','overlay'])$(id).onchange=render;
$('zoom').onchange=()=>{$('overmap').style.width=(Number($('zoom').value)*100)+'%';};
for(const id of ['undo','redo'])$(id).onclick=()=>{doc[id]();render();status(id==='undo'?'Change undone.':'Change restored.');};
$('blank').onclick=()=>{doc.replace(blank());selected=0;render();status('Blank overmap ready. Undo restores the previous sketch.');};
$('demo').onclick=()=>{doc.replace(demo());selected=7*WIDTH+7;render();status('Illustrative layout loaded. This is not a validated campaign. Undo restores your sketch.');};
$('save').onclick=()=>attempt(()=>{localStorage.setItem(STORAGE,JSON.stringify(doc.map));status('Sketch saved in this browser. Export JSON for a portable copy.');});
$('load').onclick=()=>attempt(()=>{const data=localStorage.getItem(STORAGE);if(!data)throw Error('No saved overmap sketch in this browser.');doc.replace(JSON.parse(data));render();status('Saved sketch loaded. Undo restores the previous sketch.');});
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(doc.map,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='animal-factory-overmap.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Overmap sketch exported.');};
$('export-svg').onclick=async()=>{try{const response=await fetch('overmap.css');if(!response.ok)throw Error('Could not load map styles.');const drawing=$('overmap').cloneNode(true);drawing.setAttribute('xmlns','http://www.w3.org/2000/svg');drawing.setAttribute('width','3000');drawing.setAttribute('height','1500');drawing.removeAttribute('style');drawing.style.fontFamily='system-ui, sans-serif';drawing.querySelectorAll('.selection').forEach(n=>n.remove());drawing.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));const style=svg('style');style.textContent=await response.text();drawing.prepend(style);const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(drawing)],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download='animal-factory-overmap.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Map graphic exported as a standalone SVG with the current overlay and attachment marks.');}catch(e){status(e.message);}};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Sketch files must be smaller than 2 MB.');const data=validate(JSON.parse(await file.text()));doc.replace(data);render();status('Sketch imported. Undo restores the previous sketch.');}catch(err){status('Import failed: '+err.message);}finally{e.target.value='';}};
for(const kind of [...LEGEND,'road','river','cliff','travel']){const item=document.createElement('div');item.className='legend-item';const drawing=svg('svg',{viewBox:'0 0 100 100','aria-hidden':'true'});if(['road','river','cliff'].includes(kind))drawing.append(drawSector({...blank().sectors[0],routes:[route(kind,'west','east')]},{ports:true,overlay:'none'}));else if(kind==='travel')drawing.append(svg('path',{d:'M20 45H63V30L85 50 63 70V55H20Z',class:'travel-port'}));else drawing.append(icon(kind,50,50,1.15));item.append(drawing,kind==='travel'?'Travel declaration':kind);$('legend').append(item);}
render();

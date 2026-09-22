import {InspectionDocument,PREVIEW_FOOTPRINTS} from './editor-3d-model.js';
import {InspectionScene} from './editor-3d-scene.js';
const $=id=>document.getElementById(id),canvas=$('scene');
let documentModel,dirty=true,loading=false,serial=0,selection=null,drag=null;
const view={x:11.5,y:11.5,span:24,preset:'0'};
const scene=new InspectionScene(canvas,()=>{dirty=true;diagnostics();});
const status=text=>$('status').textContent=text;
function diagnostics(){$('diagnostics').textContent=scene.diagnostics.join('\n')||'No missing scene assets reported.';$('metrics').textContent=`${scene.models.length} modeled starts · load ${Math.round(scene.loadMs||0)} ms · scenery ${Math.round(scene.rebuildMs||0)} ms · ${scene.renderer.info.memory.geometries} geometries / ${scene.renderer.info.memory.textures} textures`;}
function render(){if(dirty){scene.draw(view,canvas.clientWidth,canvas.clientHeight);dirty=false;diagnostics();}requestAnimationFrame(render);}
function focus(x,y,span=24){view.x=x;view.y=y;view.span=span;dirty=true;}
function home(){view.preset='0';$('camera').value='0';const p=documentModel?.map.starts[0];focus(p?.x??11.5,p?.y??11.5,22);}
async function open(text){
 const next=new InspectionDocument().open(text),ticket=++serial;documentModel=next;loading=true;selection=null;scene.select(null);$('properties').textContent='';$('selected').textContent='Choose a cell or object.';$('visual-note').textContent='';
 $('name').textContent=next.map.name;$('counts').textContent=`${next.size} × ${next.size} · ${next.block?'Block':next.map.guards.length+' guards'} · ${next.map.props.length} props`;
 $('floor').value='0';scene.options.level=0;$('sector-x').max=$('sector-y').max=next.block?1:10;$('sector-x').value=$('sector-y').value='1';home();status('Loading modeled scenery and starts…');$('export').disabled=false;
 await scene.open(next);if(ticket!==serial)return;loading=false;status(scene.diagnostics.length?'Some visuals are unavailable. See scene diagnostics.':'Read-only design view · Original JSON preserved');dirty=true;
}
async function factory(){try{status('Opening authored factory…');const r=await fetch('./default-factory.json',{cache:'no-store'});if(!r.ok)throw Error('Factory could not load: HTTP '+r.status);await open(await r.text());}catch(e){status(e.message);}}
function inspect(x,y){const p=scene.pick(x,y,canvas.clientWidth,canvas.clientHeight);if(!p||!documentModel)return null;return documentModel.inspect(p.x,p.y,scene.options.level,{...scene.options,mode:$('pick-mode').value});}
function select(value){selection=value;scene.select(value);$('selected').textContent=value?`${value.label} · ${value.x}, ${value.y} · floor ${value.z+1}`:'Outside the design';$('properties').textContent=value?JSON.stringify(value.data,null,2):'';
 const notes=[];if(value?.type==='unit'){if(value.data.outfit==='red-hats')notes.push('Saved red-hat outfit; the model currently shows its normal painted outfit.');if(value.data.species==='hen'&&value.data.weapon!=='hands')notes.push('Saved weapon: '+value.data.weapon+'. The hen model currently has no armed pose.');if(value.data.id.startsWith('start'))notes.push('Squad start marker. Species and rifle are illustrative.');}$('visual-note').textContent=notes.join(' ');
}
$('factory').onclick=factory;$('home').onclick=home;$('overview').onclick=()=>{const size=documentModel?.size||240;focus((size-1)/2,(size-1)/2,size*1.55);};
$('camera').onchange=()=>{view.preset=$('camera').value;dirty=true;};
$('floor').onchange=()=>{scene.setOptions({level:+$('floor').value});select(null);};
for(const name of ['roofs','walls'])$(name).onchange=()=>{scene.setOptions({[name]:$(name).checked});select(null);};
$('sector').onclick=()=>{const max=documentModel?.block?1:10,x=+$('sector-x').value,y=+$('sector-y').value;if(!Number.isInteger(x)||!Number.isInteger(y)||x<1||x>max||y<1||y>max){status('Choose a sector column and row from 1 to '+max+'.');return;}focus((x-1)*24+11.5,(y-1)*24+11.5,28);};
const zoom=factor=>{view.span=Math.max(6,Math.min(450,view.span*factor));dirty=true;};$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>4*1024*1024)throw Error('Choose a JSON file under 4 MB.');await open(await file.text());}catch(e){status('Import rejected: '+e.message);}finally{$('import').value='';}};
$('export').onclick=()=>{if(!documentModel)return;const url=URL.createObjectURL(new Blob([documentModel.export()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(documentModel.map.name.replace(/[^a-z0-9_-]/gi,'-')||'design')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const coords=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=coords(e);drag={id:e.pointerId,...p,last:p,moved:false};canvas.setPointerCapture(e.pointerId);canvas.focus();});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=coords(e);if(Math.hypot(p.x-drag.x,p.y-drag.y)>5)drag.moved=true;if(drag.moved){const a=scene.pick(drag.last.x,drag.last.y,canvas.clientWidth,canvas.clientHeight),b=scene.pick(p.x,p.y,canvas.clientWidth,canvas.clientHeight);if(a&&b){view.x+=a.x-b.x;view.y+=a.y-b.y;dirty=true;}}drag.last=p;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(!moved){const p=coords(e);select(inspect(p.x,p.y));}});canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.isContentEditable||e.target.closest?.('input,textarea,select,[role="textbox"]'))return;
 const key=({w:'ArrowUp',a:'ArrowLeft',s:'ArrowDown',d:'ArrowRight'})[e.key.toLowerCase()]||e.key;
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(key))return;
 e.preventDefault();
 if(key==='Home')home();else if(['+','='].includes(key))zoom(.8);else if(key==='-')zoom(1.25);
 else{
  const cx=canvas.clientWidth/2,cy=canvas.clientHeight/2,dx=key==='ArrowLeft'?-35:key==='ArrowRight'?35:0,dy=key==='ArrowUp'?-35:key==='ArrowDown'?35:0;
  const a=scene.pick(cx,cy,canvas.clientWidth,canvas.clientHeight),b=scene.pick(cx+dx,cy+dy,canvas.clientWidth,canvas.clientHeight);
  if(a&&b){view.x+=b.x-a.x;view.y+=b.y-a.y;dirty=true;}
 }
});
for(const item of PREVIEW_FOOTPRINTS){const li=document.createElement('li');li.textContent=item.name+' · '+item.tiles.join('×');$('cargo').append(li);}
new ResizeObserver(()=>dirty=true).observe(canvas);window.addEventListener('pagehide',()=>scene.dispose(),{once:true});
// Programmatic inspection shares the same opening and picking paths as the UI.
window.editor3d={open,export:()=>documentModel.export(),inspect:(x,y,z,options)=>documentModel.inspect(x,y,z,options),get document(){return documentModel;},get scene(){return scene;},get loading(){return loading;},get selection(){return selection;},view};
requestAnimationFrame(render);factory();

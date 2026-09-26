import {expandPlaceholder} from './sector-placeholder.js';
import {blockCanvas,extractBlock} from './core/blocks.js';
import {blankMap} from './core/maps.js';
import {PREVIEW_FOOTPRINTS} from './editor-3d-model.js';
import {EditingDocument} from './editor-3d-controller.js';
import {installEditing} from './editor-3d-tools.js';
import {InspectionScene} from './editor-3d-scene.js';
const $=id=>document.getElementById(id),canvas=$('scene');
let documentModel,dirty=true,loading=false,serial=0,selection=null,drag=null;
const workspaces={};
const view={x:11.5,y:11.5,span:24,preset:'0'};
const scene=new InspectionScene(canvas,()=>{dirty=true;diagnostics();});
const status=text=>$('status').textContent=text;
function diagnostics(){$('diagnostics').textContent=scene.diagnostics.join('\n')||'No missing scene assets reported.';$('metrics').textContent=`${scene.models.length} modeled starts · load ${Math.round(scene.loadMs||0)} ms · scenery ${Math.round(scene.rebuildMs||0)} ms · ${scene.renderer.info.memory.geometries} geometries / ${scene.renderer.info.memory.textures} textures`;}
function render(){if(dirty||scene.lights?.animated){scene.draw(view,canvas.clientWidth,canvas.clientHeight);dirty=false;diagnostics();}requestAnimationFrame(render);}
function focus(x,y,span=24){view.x=x;view.y=y;view.span=span;dirty=true;}
function home(){view.preset='0';$('camera').value='0';const p=documentModel?.map.starts[0];focus(p?.x??11.5,p?.y??11.5,22);}
async function open(text){
 const next=text instanceof EditingDocument?text:new EditingDocument().open(text),ticket=++serial;documentModel=next;workspaces[next.block?'block':'map']=next;loading=true;selection=null;scene.preview(null);$('properties').textContent='';$('selected').textContent='Choose a cell or object.';$('visual-note').textContent='';
 $('name').textContent=next.map.name;$('counts').textContent=`${next.size} × ${next.size} · ${next.block?'Block':next.map.guards.length+' placed characters'} · ${next.map.props.length} objects · ${next.map.canopies?.length||0} decorative roofs`;
 $('floor').value='0';scene.options.level=0;$('sector-x').max=$('sector-y').max=next.block?1:10;$('sector-x').value=$('sector-y').value='1';home();status('Loading modeled scenery and starts…');$('export').disabled=false;
 await scene.open(next);if(ticket!==serial)return;loading=false;tools.reset();status(scene.diagnostics.length?'Some visuals are unavailable. See scene diagnostics.':next.block?'Edit this reusable block, then save it to the library.':'Select a build tool to edit. Right-drag or WASD pans.');dirty=true;
}
async function factory(){try{status('Opening authored factory…');const r=await fetch('./default-factory.json',{cache:'no-store'});if(!r.ok)throw Error('Factory could not load: HTTP '+r.status);await open(await r.text());}catch(e){status(e.message);}}
function inspect(x,y){const p=scene.pick(x,y,canvas.clientWidth,canvas.clientHeight);if(!p||!documentModel)return null;return documentModel.inspect(p.x,p.y,scene.options.level,{...scene.options,mode:$('pick-mode').value});}
function select(value){selection=value;scene.select(value);$('selected').textContent=value?`${value.label} · ${value.x}, ${value.y} · floor ${value.z+1}`:'Choose a cell or object.';$('properties').textContent=value&&value.type!=='unit'?JSON.stringify(value.data,null,2):'';tools.selectionChanged();
 const notes=[];if(value?.type==='unit'){if(value.data.species==='hen'&&value.data.weapon!=='hands')notes.push('Saved weapon: '+value.data.weapon+'. The hen model currently has no armed pose.');if(value.data.id.startsWith('start'))notes.push('Squad start marker. Species and rifle are illustrative.');}$('visual-note').textContent=notes.join(' ');
}
$('factory').onclick=()=>{if(tools.guardReplace())factory();};$('home').onclick=home;$('overview').onclick=()=>{const size=documentModel?.size||240;focus((size-1)/2,(size-1)/2,size*1.55);};
$('camera').onchange=()=>{view.preset=$('camera').value;dirty=true;};
$('floor').onchange=()=>{scene.setOptions({level:+$('floor').value});select(null);};
for(const name of ['roofs','walls'])$(name).onchange=()=>{scene.setOptions({[name]:$(name).checked});select(null);};
$('sector').onclick=()=>{const max=documentModel?.block?1:10,x=+$('sector-x').value,y=+$('sector-y').value;if(!Number.isInteger(x)||!Number.isInteger(y)||x<1||x>max||y<1||y>max){status('Choose a sector column and row from 1 to '+max+'.');return;}focus((x-1)*24+11.5,(y-1)*24+11.5,28);};
const zoom=factor=>{view.span=Math.max(6,Math.min(450,view.span*factor));dirty=true;};$('zoom-in').onclick=()=>zoom(.8);$('zoom-out').onclick=()=>zoom(1.25);
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file||!tools.guardReplace())return;if(file.size>4*1024*1024)throw Error('Choose a JSON file under 4 MB.');await open(await file.text());}catch(e){status('Import rejected: '+e.message);}finally{$('import').value='';}};
$('export').onclick=()=>{if(!documentModel)return;const url=URL.createObjectURL(new Blob([documentModel.export()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(documentModel.map.name.replace(/[^a-z0-9_-]/gi,'-')||'design')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const coords=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
canvas.addEventListener('pointerdown',e=>{if(![0,2].includes(e.button))return;const p=coords(e);drag={id:e.pointerId,...p,last:p,moved:e.button===2};canvas.setPointerCapture(e.pointerId);canvas.focus();});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const p=coords(e);if(Math.hypot(p.x-drag.x,p.y-drag.y)>5)drag.moved=true;if(drag.moved){const a=scene.pick(drag.last.x,drag.last.y,canvas.clientWidth,canvas.clientHeight),b=scene.pick(p.x,p.y,canvas.clientWidth,canvas.clientHeight);if(a&&b){view.x+=a.x-b.x;view.y+=a.y-b.y;dirty=true;}}drag.last=p;});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(!moved){const p=coords(e);select(inspect(p.x,p.y));}});canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.001));},{passive:false});
document.addEventListener('keydown',e=>{
 if(document.querySelector('#editor-settings')?.open||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target.isContentEditable||e.target.closest?.('input,textarea,select,[role="textbox"]'))return;
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
async function changed(){loading=true;try{const prior=selection,identity=selection?.data?.character?.id;await scene.update(documentModel);select(identity?documentModel.characterSelection(identity):prior?documentModel.inspect(prior.x,prior.y,prior.z,{mode:prior.type==='prop'?'prop':'auto'}):null);$('name').textContent=documentModel.map.name;$('counts').textContent=`${documentModel.size} × ${documentModel.size} · ${documentModel.map.guards.length} placed characters · ${documentModel.map.props.length} objects · ${documentModel.map.canopies?.length||0} decorative roofs`;dirty=true;}finally{loading=false;}}
async function switchWorkspace(mode){if(loading)return;const next=workspaces[mode]||new EditingDocument().open(JSON.stringify(mode==='block'?extractBlock(blockCanvas('New block')):blankMap('New design')));await open(next);}
const tools=installEditing({canvas,scene,getDocument:()=>documentModel,getSelection:()=>selection,open,changed,status,isLoading:()=>loading,switchWorkspace,hasUnsaved:()=>Object.values(workspaces).some(d=>d.changed)});
window.editor3d={open,select,changed,apply:command=>tools.apply(command),validate:()=>documentModel.validate(),export:()=>documentModel.export(),inspect:(x,y,z,options)=>documentModel.inspect(x,y,z,options),get document(){return documentModel;},get scene(){return scene;},get loading(){return loading;},get selection(){return selection;},view};
async function initialMap(){
 const params=new URLSearchParams(location.search),id=params.get('sectorTemplate');if(!id){await open(JSON.stringify(blankMap('New design')));return;}
 try{if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid template identifier.');const variant=params.get('variant')||'placeholder.json';if(!/^[a-zA-Z0-9_-]+\.json$/.test(variant))throw Error('Invalid variant filename.');status('Opening sector map…');const r=await fetch('./sector-library/'+id+'/'+variant);if(!r.ok)throw Error('Template unavailable: HTTP '+r.status);const entry=await r.json(),orientation=Number(params.get('orientation')||0);if(entry.kind!=='sector-placeholder'){if(orientation!==0)throw Error('Authored maps open in their saved orientation.');await open(JSON.stringify(entry));$('overview').click();return;}if(!Number.isInteger(orientation)||!entry.allowedTransforms?.[orientation])throw Error('Unsupported orientation.');await open(JSON.stringify(expandPlaceholder(entry,entry.allowedTransforms[orientation])));$('overview').click();status('Placeholder sector. Save an authored variant after editing; campaign assignment is not enabled.');}catch(e){status('Cannot open template: '+e.message);}
}
requestAnimationFrame(render);initialMap();

import {bankSet} from './ramp-banks.js';
import {isRamp} from './cliff-ramps.js';
import {rampSupportAt} from './cliff-ramps.js';
import {characters,characterName,characterDiagnostics,copyCharacters,ensureCharacterIdentities} from './character-properties.js';
import {isCliff,CLIFF_LIMIT} from './cliff-map.js';
import {TOWERS,towerSlots,towerPost} from './tower-geometry.js';
import {LIGHT_FORMS} from './light-sources.js';
import {mapStartMinutes} from './game-clock.js';
import {InspectionDocument} from './editor-3d-model.js';
import {createEditor,applyBrush,brushShape,brushPoints,replaceMap,undo,redo} from './core/editor-model.js';
import {validateMap,edgeKey,terrainAt,roofEndpoint} from './core/maps.js';
import {openBlock,extractBlock,validateBlock,placeBlock} from './core/blocks.js';
import {connectionSet} from './core/connections.js';
import {EDGES,propCells} from './core/environment.js';
export function brushPoint(p){const x=Math.floor(p.x+.5),y=Math.floor(p.y+.5),dx=p.x-x,dy=p.y-y,axis=Math.abs(dx)>Math.abs(dy)?'e':'s';return {x,y,z:p.z,edge:edgeKey(axis,x-(axis==='e'&&dx<0?1:0),y-(axis==='s'&&dy<0?1:0),p.z)};}
export class EditingDocument extends InspectionDocument {
 open(text){super.open(text);if(!this.block)mapStartMinutes(this.map);this.editor=createEditor(this.block?openBlock(this.original):this.map);this.refresh();this.changed=false;this.revision=0;return this;}
 refresh(){if(this.block){const original={...this.original,...extractBlock(this.editor.map)};if(!this.editor.map.blockConnections?.['0,0'])delete original.connections;const display=new InspectionDocument().open(JSON.stringify(original));this.map=display.map;this.original=original;}else{this.map=this.editor.map;this.original=this.map;}this.units=[...this.map.starts.map((p,i)=>({...p,id:'start-'+i,species:p.species||['horse','goat','donkey','sheep'][i],weapon:p.weapon||'rifle',heading:0,role:characterName(p,'Squad start '+(i+1))})),...this.map.guards.map((p,i)=>({...p,id:'guard-'+i,role:characterName(p,(p.character?.category==='npc'?'NPC ':'Guard ')+(i+1))}))];for(const u of this.units){const support=rampSupportAt(this.map,u);if(support)u.cliffSupport=support;}this.changed=true;this.revision++;}
 preview(command){
  const {tool,start,end=start,options={}}=command;
  if(!start||![start.x,start.y,start.z??0].every(Number.isInteger))return {ok:false,error:'Choose a map cell.'};
  if(this.block&&(['squad','exit'].includes(tool)||[start,end].some(p=>p.x<0||p.y<0||p.x>=24||p.y>=24)))return {ok:false,error:'Keep block edits inside 24 × 24 tiles; squad and travel markers belong to full maps.'};
  const foliage=['foliage-cover','clear-foliage'].includes(tool),shapeTool=foliage||['cliff','erase-cliff'].includes(tool)?'woodland':tool;
  if(foliage&&(start.z||0)!==0)return {ok:false,error:'Foliage cover paints outdoor ground. Select the ground level.'};
  const candidate=createEditor(this.editor.map),points=brushShape(shapeTool)?brushPoints(shapeTool,start,end):[start],cells=[],edges=[];
  const occupied=foliage?new Set(candidate.map.props.flatMap(p=>propCells(p).map(c=>c.x+','+c.y+','+(c.z||0)))):null;
  if(tool==='cliff'&&points.length>CLIFF_LIMIT)return {ok:false,error:'Paint at most '+CLIFF_LIMIT+' cliff tiles at a time.'};
  if(!points.length)return {ok:false,error:'Choose a cell inside the map.'};
  try{
   for(const p of points){
    let actualTool=tool==='npc'?'guard':tool,actualOptions=tool==='npc'?{...options,category:'npc'}:options;
    if(['cliff','erase-cliff'].includes(tool)){
     const existing=candidate.map.props.find(q=>q.x===p.x&&q.y===p.y&&(q.z||0)===(start.z||0));
     if(isCliff(existing))applyBrush(candidate,'erase-prop',p.x,p.y,'',{level:start.z||0});
     if(tool==='erase-cliff'){cells.push({...p,z:start.z||0});continue;}
     actualTool='prop';actualOptions={propKind:options.cliffKind||'cliff-ledge',rotated:false};
    }
    if(foliage){const z=start.z||0,terrain=terrainAt(candidate.map,p.x,p.y,z);
     if(occupied.has(p.x+','+p.y+','+z)||candidate.map.stairs.some(q=>q.x===p.x&&q.y===p.y&&(q.z===z||q.z+1===z))||roofEndpoint(candidate.map,{...p,z}))continue;
     if(tool==='clear-foliage'){if(terrain!=='woodland')continue;actualTool='texture';actualOptions={groundKind:'ground-grass'};}
     else {if(!['yard','ground-grass','ground-dirt','ground-gravel','woodland'].includes(terrain)||terrain==='woodland')continue;actualTool='woodland';}
    }
    const error=applyBrush(candidate,actualTool,p.x,p.y,p.edge,{...actualOptions,level:start.z||0});if(error)return {ok:false,error,cells:points,edges};
    if(tool==='cliff')Object.assign(candidate.map.props.at(-1),{cliffMask:options.cliffMask??15,cliffVariant:options.cliffVariant??0,cliffSand:options.cliffSand??0});
    if(tool==='prop'&&LIGHT_FORMS[options.propKind])candidate.map.props.at(-1).lightMode=['on','off'].includes(options.lightMode)?options.lightMode:'auto';
    if(['wall','door','erase-edge'].includes(tool))edges.push(p.edge);
    if(tool==='prop'||tool==='roof-tile')cells.push(...propCells({x:p.x,y:p.y,z:start.z||0,kind:options.propKind,rotated:options.rotated}));
    else if(tool==='room'){const w=options.rotated?options.height:options.width,h=options.rotated?options.width:options.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++)cells.push({x:p.x+x,y:p.y+y,z:start.z||0});}
    else cells.push({...p,z:start.z||0});
   }
   if(foliage&&!cells.length)return {ok:false,error:tool==='clear-foliage'?'No foliage cover to clear here.':'No uncovered outdoor ground here. Water, structures and props are skipped.',cells,edges};
   // Connectivity is allowed to be temporarily broken while designing a room.
   if(this.block){if(cells.some(p=>p.x<0||p.y<0||p.x>=24||p.y>=24))return {ok:false,error:'The whole footprint must fit inside the block.',cells,edges};validateBlock(extractBlock(candidate.map));}
   if(candidate.map.edgeLocks)for(const key of Object.keys(candidate.map.edgeLocks))if(!EDGES[candidate.map.edges[key]]?.opensTo)delete candidate.map.edgeLocks[key];
   const errors=validateMap(candidate.map,{connectivity:false});
   return {ok:!errors.length,error:errors[0]||'',cells,edges,map:candidate.map};
  }catch(e){return {ok:false,error:e.message,cells:points,edges};}
 }
 apply(command){const result=this.preview(command);if(result.ok){replaceMap(this.editor,result.map);this.refresh();}return result;}
 character(id){return characters(this.editor.map).find(r=>r.p.character?.id===id);}
 characterSelection(id){const u=this.units.find(p=>p.character?.id===id);return u?{x:u.x,y:u.y,z:u.z||0,type:'unit',label:characterName(u,u.role),data:u,cells:[{x:u.x,y:u.y,z:u.z||0}]}:null;}
 updateCharacter(id,patch){
  const row=this.character(id);if(!row)throw Error('This character no longer exists.');
  const map=structuredClone(this.editor.map),p=map[row.field][row.index];
  for(const key of ['species','outfit','weapon','heading'])if(Object.hasOwn(patch,key))p[key]=patch[key];
  const allowed=['displayName','scriptId','faction','attitude','combatBehavior','canTalk','dialogueRef','canSell','shopInventoryRef','shopPricingRef','references','model','visualVariant'];
  for(const key of allowed)if(Object.hasOwn(patch.character||{},key))p.character[key]=structuredClone(patch.character[key]);
  p.character.id=id;this.replace(map);return this.characterSelection(id);
 }
 duplicateCharacter(id,point){
  const row=this.character(id);if(!row)throw Error('This character no longer exists.');
  if(row.field==='starts')throw Error('Squad slots are fixed. Duplicate a placed guard or NPC.');
  if(!point||![point.x,point.y,point.z??0].every(Number.isInteger))throw Error('Choose a destination tile.');
  if(point.x<0||point.y<0||point.x>=this.size||point.y>=this.size||(point.z||0)<0||(point.z||0)>2)throw Error('Keep the duplicate inside the current map or block.');
  const [copy]=copyCharacters([row.p],this.editor.map);Object.assign(copy,{x:point.x,y:point.y,z:point.z||0});delete copy.towerPost;
  this.replace({...this.editor.map,guards:[...this.editor.map.guards,copy]});return copy.character.id;
 }
 characterResources(resources){this.replace({...this.editor.map,characterResources:structuredClone(resources)});}
 characterWarnings(){return characterDiagnostics(this.editor.map);}
 undo(){if(!this.editor||!undo(this.editor))return false;this.refresh();return true;}
 redo(){if(!this.editor||!redo(this.editor))return false;this.refresh();return true;}
 doorLock(selection,difficulty){
  if(selection?.type!=='edge'||!EDGES[this.map.edges[selection.edge]]?.opensTo)throw Error('Select a closed door.');
  if(!Number.isInteger(difficulty)||difficulty<0||difficulty>100)throw Error('Use 0 for unlocked, or a difficulty from 1 to 100.');
  const edgeLocks={...this.map.edgeLocks};if(difficulty)edgeLocks[selection.edge]=difficulty;else delete edgeLocks[selection.edge];this.replace({...this.editor.map,edgeLocks});
 }
 fixtureCondition(selection,condition){
  const p=selection?.data;if(selection?.type!=='prop'||!LIGHT_FORMS[p.kind]||LIGHT_FORMS[p.kind].fire)throw Error('Select an electrical light fixture.');
  if(!Number.isInteger(condition)||condition<0||condition>100)throw Error('Condition must be 0-100.');
  this.replace({...this.editor.map,props:this.editor.map.props.map(q=>q.x===p.x&&q.y===p.y&&(q.z||0)===(p.z||0)?{...q,condition}:q)});
 }
 rename(name){name=name.trim();if(!name||name.length>60)return {ok:false,error:'Use a name from 1 to 60 characters.'};replaceMap(this.editor,{...this.editor.map,name});this.refresh();return {ok:true};}
 rotate(selection){
  if(selection?.type!=='prop')return {ok:false,error:'Select a prop to rotate.'};
  if(isCliff(selection.data))return {ok:false,error:'Change cliff corner masks instead of rotating props.'};
  const p=selection.data,candidate=createEditor(this.editor.map);applyBrush(candidate,'erase-prop',p.x,p.y,'',{level:p.z||0});
  const error=applyBrush(candidate,'prop',p.x,p.y,'',{level:p.z||0,propKind:p.kind,rotated:!p.rotated});
  if(error)return {ok:false,error};if(p.condition!==undefined)candidate.map.props.at(-1).condition=p.condition;if(p.lightMode)candidate.map.props.at(-1).lightMode=p.lightMode;if(p.lightTargets)candidate.map.props.at(-1).lightTargets=structuredClone(p.lightTargets);const errors=validateMap(candidate.map,{connectivity:false});if(errors.length)return {ok:false,error:errors[0]};
  if(this.block){try{validateBlock(extractBlock(candidate.map));}catch(e){return {ok:false,error:e.message};}}
  replaceMap(this.editor,candidate.map);this.refresh();return {ok:true};
 }
 addLookout(selection,options={}){
  if(selection?.type!=='prop'||!TOWERS[selection.data.kind])throw Error('Select a searchlight tower first.');
  const p=selection.data,point=towerSlots(p).find(q=>![...this.map.guards,...this.map.starts].some(u=>u.x===q.x&&u.y===q.y&&(u.z||0)===q.z));if(!point)throw Error('All four tower posts are occupied.');
  this.replace({...this.editor.map,guards:[...this.editor.map.guards,{...point,towerPost:towerPost(p,point),species:options.species||'pig-foreman',weapon:options.weapon||'rifle',heading:options.heading??90,outfit:options.outfit||'normal'}]});
 }
 lightTargets(selection,points){
  if(selection?.type!=='prop'||!LIGHT_FORMS[selection.data.kind]?.spot)throw Error('Select a spotlight first.');
  if(!Array.isArray(points)||points.length<1||points.length>3||points.some(p=>!p||![p.x,p.y,p.z??0].every(Number.isInteger)||p.x<0||p.y<0||p.x>=this.size||p.y>=this.size||p.z<0||p.z>2))throw Error('Choose one to three map tiles.');
  const p=selection.data,targets=points.map(q=>({x:q.x-p.x,y:q.y-p.y,z:(q.z||0)-(p.z||0)}));
  this.replace({...this.editor.map,props:this.editor.map.props.map(q=>q.x===p.x&&q.y===p.y&&(q.z||0)===(p.z||0)&&q.kind===p.kind?{...q,lightTargets:targets}:q)});
 }
 addRampBanks(selection,surface='dirt'){if(selection?.type!=='prop'||!isRamp(selection.data))throw Error('Select a ramp first.');if(!['dirt','grass','sand'].includes(surface))throw Error('Choose a bank surface.');const candidate=createEditor(this.editor.map);for(const p of bankSet(selection.data,surface)){if(this.block&&(p.x<0||p.y<0||p.x>=24||p.y>=24))throw Error('Banks must fit inside the block.');const error=applyBrush(candidate,'prop',p.x,p.y,'',{level:p.z,propKind:p.kind,rotated:false});if(error)throw Error(error);}this.replace(candidate.map);}
 lightMode(selection,mode){if(selection?.type!=='prop'||!LIGHT_FORMS[selection.data.kind])throw Error('Select a lamp or fire first.');if(!['auto','on','off'].includes(mode))throw Error('Choose a light schedule.');const p=selection.data;this.replace({...this.editor.map,props:this.editor.map.props.map(q=>q.x===p.x&&q.y===p.y&&(q.z||0)===(p.z||0)&&q.kind===p.kind?{...q,lightMode:mode}:q)});}
 startTime(minutes){if(this.block)throw Error("Start time belongs to a full map.");const time={...this.map.time,startMinutes:minutes};mapStartMinutes({time});this.replace({...this.editor.map,time});}
 replace(map){map=ensureCharacterIdentities(structuredClone(map));if(!this.block)mapStartMinutes(map);if(this.block)validateBlock(extractBlock(map));const errors=validateMap(map,{connectivity:false});if(errors.length)throw Error(errors[0]);replaceMap(this.editor,map);this.refresh();}
 capture(sx,sy){if(this.block)throw Error('Capture a sector from a full map.');return validateBlock(extractBlock(this.editor.map,sx,sy));}
 place(block,sx,sy){if(this.block)throw Error('Place blocks in a full map.');this.replace(placeBlock(this.editor.map,block,sx,sy));}
 connections(types){if(!this.block)throw Error('Open a block to assign its connections.');connectionSet(this.editor.map,0,0,types);this.replace({...this.editor.map,blockConnections:{'0,0':types}});}
 validate(){if(!this.block)return validateMap(this.map);try{validateBlock(JSON.parse(this.export()));return [];}catch(e){return [e.message];}}
}

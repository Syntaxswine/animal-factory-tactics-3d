import {InspectionDocument} from './editor-3d-model.js';
import {createEditor,applyBrush,brushShape,brushPoints,replaceMap,undo,redo} from './core/editor-model.js';
import {validateMap,edgeKey} from './core/maps.js';
import {propCells} from './core/environment.js';
export function brushPoint(p){const x=Math.floor(p.x+.5),y=Math.floor(p.y+.5),dx=p.x-x,dy=p.y-y,axis=Math.abs(dx)>Math.abs(dy)?'e':'s';return {x,y,z:p.z,edge:edgeKey(axis,x-(axis==='e'&&dx<0?1:0),y-(axis==='s'&&dy<0?1:0),p.z)};}
export class EditingDocument extends InspectionDocument {
 open(text){super.open(text);this.editor=this.block?null:createEditor(this.map);this.changed=false;this.revision=0;return this;}
 refresh(){this.map=this.editor.map;this.original=this.map;this.units=[...this.map.starts.map((p,i)=>({...p,id:'start-'+i,species:['horse','goat','donkey','sheep'][i],weapon:'rifle',heading:0,role:'Squad start '+(i+1)})),...this.map.guards.map((p,i)=>({...p,id:'guard-'+i,role:'Guard '+(i+1)}))];this.changed=true;this.revision++;}
 preview(command){
  if(this.block)return {ok:false,error:'Blocks can be inspected and exported here. Place them into a full map with the existing editor before editing or playtesting.'};
  const {tool,start,end=start,options={}}=command;
  if(!start||![start.x,start.y,start.z??0].every(Number.isInteger))return {ok:false,error:'Choose a map cell.'};
  const candidate=createEditor(this.map),points=brushShape(tool)?brushPoints(tool,start,end):[start],cells=[],edges=[];
  if(!points.length)return {ok:false,error:'Choose a cell inside the map.'};
  try{
   for(const p of points){const error=applyBrush(candidate,tool,p.x,p.y,p.edge,{...options,level:start.z||0});if(error)return {ok:false,error,cells:points,edges};
    if(['wall','door','erase-edge'].includes(tool))edges.push(p.edge);
    if(tool==='prop'||tool==='roof-tile')cells.push(...propCells({x:p.x,y:p.y,z:start.z||0,kind:options.propKind,rotated:options.rotated}));
    else if(tool==='room'){const w=options.rotated?options.height:options.width,h=options.rotated?options.width:options.height;for(let y=0;y<h;y++)for(let x=0;x<w;x++)cells.push({x:p.x+x,y:p.y+y,z:start.z||0});}
    else cells.push({...p,z:start.z||0});
   }
   // Connectivity is allowed to be temporarily broken while designing a room.
   const errors=validateMap(candidate.map,{connectivity:false});
   return {ok:!errors.length,error:errors[0]||'',cells,edges,map:candidate.map};
  }catch(e){return {ok:false,error:e.message,cells:points,edges};}
 }
 apply(command){const result=this.preview(command);if(result.ok){replaceMap(this.editor,result.map);this.refresh();}return result;}
 undo(){if(!this.editor||!undo(this.editor))return false;this.refresh();return true;}
 redo(){if(!this.editor||!redo(this.editor))return false;this.refresh();return true;}
 rename(name){name=name.trim();if(!name||name.length>60)return {ok:false,error:'Use a name from 1 to 60 characters.'};if(this.block)return {ok:false,error:'Block naming remains available in the existing editor.'};replaceMap(this.editor,{...this.map,name});this.refresh();return {ok:true};}
 rotate(selection){
  if(this.block)return {ok:false,error:'Place this block into a full map with the existing editor before editing.'};
  if(selection?.type!=='prop')return {ok:false,error:'Select a prop to rotate.'};
  const p=selection.data,candidate=createEditor(this.map);applyBrush(candidate,'erase-prop',p.x,p.y,'',{level:p.z||0});
  const error=applyBrush(candidate,'prop',p.x,p.y,'',{level:p.z||0,propKind:p.kind,rotated:!p.rotated});
  if(error)return {ok:false,error};const errors=validateMap(candidate.map,{connectivity:false});if(errors.length)return {ok:false,error:errors[0]};
  replaceMap(this.editor,candidate.map);this.refresh();return {ok:true};
 }
 validate(){return this.block?['Place a block in a full map before playtesting.']:validateMap(this.map);}
}

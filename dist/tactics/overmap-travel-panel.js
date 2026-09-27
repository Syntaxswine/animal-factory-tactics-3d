import {createTravel,setDestination,travelUntilStop,restTravel,travelPreview,groupPace,fatigue,validateTravel,RESUME_AT,REST_PER_HOUR} from './overmap-travel.js';
import {formatClock} from './game-clock.js';
const STORAGE='animal-factory-overmap-travel-v1';
const duration=n=>`${Math.floor(Math.round(n)/60)}h ${Math.round(n)%60}m`;
const coord=i=>`${i%30+1}, ${Math.floor(i/30)+1}`;
export function travelPanel({getMap,getSelected,onLoadMap,onChange}){
 const $=id=>document.getElementById(id);let state=null,key=null,note='';
 function sync(){const next=JSON.stringify(getMap());if(next!==key){key=next;state=createTravel(getMap());note='New map: group placed at the tutorial start.';}}
 function save(){try{localStorage.setItem(STORAGE,JSON.stringify({map:getMap(),state}));}catch(e){note='Travel changed, but could not save: '+e.message;}}
 function action(fn){try{sync();fn();save();}catch(e){note=e.message;}onChange();}
 $('travel-plan').onclick=()=>action(()=>{setDestination(state,getMap(),getSelected());note='Route planned. Travel stops when the group needs rest.';});
 $('travel-go').onclick=()=>action(()=>{const result=travelUntilStop(state,getMap());note=result.restRequired?'Group stopped: rest is required before continuing.':'Destination reached.';});
 $('travel-rest').onclick=()=>action(()=>{const high=Math.max(...state.members.map(fatigue));const hours=state.restRequired?Math.max(0,high-RESUME_AT)/REST_PER_HOUR:2;restTravel(state,hours||2);note='Rest completed. Continue travel when ready.';});
 $('travel-reset').onclick=()=>action(()=>{state=createTravel(getMap());note='Travel test reset to the starting sector.';});
 $('travel-save').onclick=()=>action(()=>{note='Travel session saved with its map, group and clock.';});
 $('travel-load').onclick=()=>{try{const raw=localStorage.getItem(STORAGE);if(!raw)throw Error('No saved travel session.');const saved=JSON.parse(raw);validateTravel(saved.state,saved.map);onLoadMap(saved.map);key=JSON.stringify(getMap());state=saved.state;note='Saved travel session restored.';}catch(e){note=e.message;}onChange();};
 function render(){sync();
  const pace=groupPace(state.members),preview=travelPreview(state);
  $('travel-clock').textContent=formatClock(state.clock);
  $('travel-position').textContent=`Group: sector ${coord(state.position)}`+(state.progress?` → ${coord(state.route[0].to)} (${duration(state.progress)} into crossing)`:'');
  $('travel-pace').textContent=`Pace set by ${pace.name}: ${duration(pace.minutes)} land / ${duration(groupPace(state.members,true).minutes)} road per sector.`;
  $('travel-preview').textContent=state.route.length?`Destination ${coord(state.route.at(-1).to)} · ${state.route.length} sector crossings · Travel ${duration(preview.travelMinutes)} · Rest ${duration(preview.restMinutes)} (${preview.stops} stops) · Arrival ${formatClock({minutes:preview.arrivalMinutes})}`:'Select a destination on the map, then Plan route.';
  $('travel-note').textContent=note;$('travel-go').disabled=!state.route.length||state.restRequired;$('travel-plan').disabled=state.progress>0;$('travel-rest').textContent=state.restRequired?'Rest until ready':'Rest 2 hours';
  const host=$('travel-members');host.replaceChildren();
  for(const u of state.members){const row=document.createElement('div');row.className='travel-member';const label=document.createElement('label');label.textContent=u.name+' · Agility';const input=document.createElement('input');input.type='number';input.min=1;input.max=100;input.step=1;input.value=u.stats.agility;input.disabled=state.progress>0;input.setAttribute('aria-label',u.name+' agility');input.onchange=()=>action(()=>{const value=Number(input.value);if(!Number.isInteger(value)||value<1||value>100)throw Error('Agility must be a whole number from 1 to 100.');u.stats.agility=value;state.route=[];note='Agility changed. Plan a new route.';});label.append(input);const meter=document.createElement('span');meter.textContent=`Fatigue ${Math.round(fatigue(u)*10)/10}/100`;row.append(label,meter);host.append(row);}
 }
 return {render,get state(){sync();return state;}};
}

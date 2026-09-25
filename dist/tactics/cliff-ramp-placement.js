import {isRamp,rampInfo,RAMP_DIRECTIONS} from './cliff-ramps.js';
import {bankSet} from './ramp-banks.js';
import {isCliff} from './cliff-map.js';
import {propCells} from './core/environment.js';
import {edgeCells,terrainAt} from './core/maps.js';

const key=p=>[p.x,p.y,p.z||0].join(',');
export function alignedRampGroup(props,selected){
 const r=rampInfo(selected);if(!r)return [];
 const station=p=>p.low.x*r.dx+p.low.y*r.dy,cross=p=>-p.low.x*r.dy+p.low.y*r.dx;
 const rows=props.filter(isRamp).map(rampInfo).filter(q=>q.z===r.z&&q.direction===r.direction&&station(q)===station(r));
 const byLane=new Map(rows.map(q=>[cross(q),q.p]));let lo=cross(r),hi=lo;
 while(byLane.has(lo-1))lo--;while(byLane.has(hi+1))hi++;
 return Array.from({length:hi-lo+1},(_,i)=>byLane.get(lo+i));
}
export function outerRampBanks(props,selected,surface='dirt'){
 const group=alignedRampGroup(props,selected);if(!group.length)return [];
 return [...bankSet(group[0],surface).filter(p=>p.kind.includes('-left-')),...bankSet(group.at(-1),surface).filter(p=>p.kind.includes('-right-'))];
}
// A single undoable cut. Only full cliff tiles may be replaced; other authored
// objects, units and connections require the designer to move them first.
export function cutCliffRamp(source,start,{rampWidth=8,rampDirection='east',rampSurface='grass',rampBank='dirt'}={}){
 if(!Number.isInteger(rampWidth)||rampWidth<1||rampWidth>10)throw Error('Ramp width must be 1–10 tiles.');
 const dir=RAMP_DIRECTIONS[rampDirection];if(!dir||!['grass','sand','road','concrete'].includes(rampSurface)||!['grass','sand','dirt'].includes(rampBank))throw Error('Choose a ramp direction and surface.');
 const [dx,dy]=dir,z=start.z||0;if(z>=2)throw Error('Ramps need an upper level.');
 const ramps=Array.from({length:rampWidth},(_,i)=>({x:start.x-dy*i+(dx<0?-3:0),y:start.y+dx*i+(dy<0?-3:0),z,kind:`ramp-${rampSurface}-${rampDirection}`}));
 const banks=outerRampBanks(ramps,ramps[0],rampBank),cut=[...ramps.flatMap(propCells),...banks],cutKeys=new Set(cut.map(key));
 const landings=ramps.map(p=>({...rampInfo(p).exit,z})),entries=ramps.map(p=>rampInfo(p).entry);
 const touched=new Set([...cut,...landings,...entries].flatMap(p=>[key(p),key({...p,z:z+1})]));
 const map=structuredClone(source),props=map.props||[],size=(map.terrain||map.map).length;
 for(const p of [...cut,...landings,...entries])if(p.x<0||p.y<0||p.x>=size||p.y>=size)throw Error('The ramp, banks and landings must fit inside the map.');
 for(const p of cut)if(!terrainAt(map,p.x,p.y,z)||['void','water'].includes(terrainAt(map,p.x,p.y,z)))throw Error('Ramp and banks need dry supported ground.');
 for(const p of props){const cells=propCells(p);if(!cells.some(q=>touched.has(key(q))))continue;
  if(!isCliff(p)||(p.cliffMask??15)!==15||(p.z||0)!==z)throw Error('Ramp cut needs free ground or full cliff tiles; move other props first.');
  if(entries.some(q=>key(q)===key(p)))throw Error('Clear the lower approach before cutting a ramp.');
 }
 for(const p of landings)if(!props.some(q=>key(q)===key(p)&&isCliff(q)&&(q.cliffMask??15)===15))throw Error('Every lane needs a full cliff tile at its upper landing.');
 if([...(map.starts||[]),...(map.guards||[]),...(map.stairs||[])].some(p=>touched.has(key(p))||touched.has(key({...p,z:(p.z||0)+1}))))throw Error('Move characters or stairs out of the ramp footprint first.');
 if(Object.keys(map.edges||{}).some(k=>edgeCells(k).some(p=>touched.has(key(p)))))throw Error('Move walls and fences away from the ramp footprint first.');
 if((map.climbs||[]).some(p=>[p,{x:p.x+p.dx,y:p.y+p.dy,z:p.z+1}].some(q=>touched.has(key(q)))))throw Error('Remove the existing climb connection before cutting here.');
 map.props=props.filter(p=>!cutKeys.has(key(p))).map(p=>landings.some(q=>key(q)===key(p))?{...p,kind:'cliff-ledge',cliffSand:rampSurface==='sand'?1:0}:p);
 map.props.push(...ramps,...banks);
 for(const p of cut)delete map.upper[z][p.x+','+p.y];
 for(const p of landings)map.upper[z][p.x+','+p.y]='floor';
 return {map,cells:[...cut,...landings],ramps};
}

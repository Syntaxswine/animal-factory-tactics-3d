import {GRENADE} from './grenade-ballistics.js';
import {GRENADE_FLOOR} from './grenade-geometry.js';
import {TOWER_HEIGHT} from './tower-geometry.js';
import {WEAPONS} from './core/engine.js';
export function grenadeBlastFixture(kind='open',weapon='grenade'){
 const state={map:Array.from({length:18},()=>Array(18).fill('yard')),upper:[{},{},{}],edges:{},props:[],stairs:[],units:[],visible:new Set(),seen:new Set()};
 let floor=0,z=0;
 if(kind==='wall')for(let y=2;y<15;y++)state.edges[`e:9:${y}`]='wall-concrete';
 if(kind==='roof'){floor=GRENADE_FLOOR;z=1;for(let y=5;y<=11;y++)for(let x=5;x<=11;x++)state.upper[0][`${x},${y}`]='floor';}
 if(kind==='ceiling')for(let y=2;y<=14;y++)for(let x=2;x<=14;x++)state.upper[0][`${x},${y}`]='floor';
 if(kind==='cliff'){floor=2;z=1;for(let y=6;y<=10;y++)for(let x=6;x<=10;x++)state.props.push({kind:'cliff-ledge',x,y,z:0});}
 if(kind==='tower'){floor=TOWER_HEIGHT;z=3;state.props.push({kind:'wooden-spotlight-tower',x:6,y:6,z:0});}
 for(let y=0;y<18;y++)for(let x=0;x<18;x++)for(let layer=0;layer<4;layer++){const key=layer?`${x},${y},${layer}`:`${x},${y}`;state.seen.add(key);if((kind!=='fog'||x<=8)&&(kind!=='tower'||layer===0))state.visible.add(key);}
 const blast={kind:'grenade',grenade:true,x:8,y:8,h:floor+.045,z,radius:WEAPONS[weapon]?.blast||GRENADE.blast};
 if(kind==='overhang'){blast.x=4;for(let y=2;y<=14;y++)for(let x=5;x<=14;x++)state.upper[0][`${x},${y}`]='floor';}
 const launched=weapon==='rpg'||weapon==='launcher';if(launched){blast.kind=weapon==='rpg'?'rocket':'launcher';delete blast.grenade;blast.presentation={h:blast.h,level:kind==='tower'?0:z};}
 const shot={event:{...!launched&&{grenade:{release:1.92,scenery:{edges:{},props:[],tiles:[]}}},explosions:[blast],trajectories:[{...blast,fuse:4,path:[{...blast,t:0},{...blast,t:4}]}]},reduced:false};
 return {state,shot,floor};
}

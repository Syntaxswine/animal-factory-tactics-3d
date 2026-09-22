import {InspectionScene} from './editor-3d-scene.js';
export async function showTitleScene(canvas,status){
 let ready=false,disposed=false;
 const draw=()=>{if(disposed)return;const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h)scene.draw({x:8,y:7,span:Math.max(14,16*h/w),preset:'0'},w,h);};
 const scene=new InspectionScene(canvas,()=>{if(ready)draw();});scene.scene.background.set('#e8dfc9');
 const map={terrain:Array.from({length:18},(_,y)=>Array.from({length:18},(_,x)=>x>3&&x<14&&y>3&&y<13?'ground-concrete':'ground-gravel')),upper:[{},{}],props:[],edges:{},stairs:[],climbs:[],starts:[],guards:[],exits:[]};
 for(let x=4;x<14;x++)map.edges[`s:${x}:3`]=x===8?'doorway-concrete-open':'wall-brick';
 for(let y=4;y<13;y++)map.edges[`e:13:${y}`]=y%3===1?'window-brick':'wall-brick';
 for(const [x,y,kind]of [[11,5,'crate-stack'],[12,5,'crate-stack'],[11,6,'crate-wood'],[10,5,'crate-wood'],[12,7,'barrel-single'],[12,8,'barrel-single'],[10,9,'workbench-vise'],[5,5,'workbench-metal'],[6,11,'pallet'],[3,3,'tree-pine'],[14,13,'tree-broadleaf']])map.props.push({x,y,z:0,kind});
 const units=[['horse',6,7],['goat',7,8],['donkey',5,9],['sheep',8,6]].map(([species,x,y],i)=>({id:'start-'+i,role:'Worker',species,x,y,z:0,weapon:'rifle',heading:30}));
 ready=true;const observer=new ResizeObserver(draw);observer.observe(canvas);window.addEventListener('pagehide',()=>{disposed=true;observer.disconnect();scene.dispose();},{once:true});
 await scene.open({map,units});if(!disposed){status.textContent='';draw();}
}

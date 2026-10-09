export function floorBreachFixture({material='concrete',size=2,layout='block',level=1}={}){
 const z=level===2?2:1,n=Math.max(0,Math.min(5,Math.trunc(Number(size)||0))),terrain=material==='wood'?'ground-wood-planks':material==='asphalt'?'ground-asphalt':'ground-concrete';
 const state={map:Array.from({length:19},()=>Array(19).fill('ground-gravel')),upper:[{},{}],edges:{},props:[],stairs:[],units:[],visible:new Set(),seen:new Set()};
 for(let y=3;y<=13;y++)for(let x=3;x<=13;x++)state.upper[z-1][x+','+y]=terrain;
 // Two retained walls make the native room height and slab thickness legible.
 for(let x=3;x<=13;x++)state.edges['s:'+x+':2'+(z>1?':'+(z-1):'')]='wall-brick';
 for(let y=3;y<=13;y++)state.edges['e:2:'+y+(z>1?':'+(z-1):'')]='wall-brick';
 if(z===2)for(let y=3;y<=13;y++)for(let x=3;x<=13;x++)state.upper[0][x+','+y]='ground-concrete';
 // A pre-existing stairwell must keep its clean authored edges.
 delete state.upper[z-1]['4,4'];
 state.definition={upper:structuredClone(state.upper),edges:{...state.edges},props:[],stairs:[]};
 let cells=[];
 if(layout==='separated')cells=[[7,8],[9,8],[8,8],[10,8],[6,8]].slice(0,n);
 else if(layout==='island'){if(n)for(let y=8-n;y<=8+n;y++)for(let x=8-n;x<=8+n;x++)if(x!==8||y!==8)cells.push([x,y]);}
 else if(layout==='strip')cells=Array.from({length:n},(_,i)=>[6+i,8]);
 else if(layout==='elbow'){for(let i=0;i<n;i++)cells.push([7+i,7]);for(let i=1;i<n;i++)cells.push([7,7+i]);}
 else if(layout==='edge'){for(let i=0;i<n;i++)cells.push([11+i%3,7+Math.floor(i/3)]);}
 else for(let y=0;y<n;y++)for(let x=0;x<n;x++)cells.push([6+x,6+y]);
 cells=cells.filter(([x,y])=>state.upper[z-1][x+','+y]);
 for(const [x,y]of cells)delete state.upper[z-1][x+','+y];
 for(let l=0;l<3;l++)for(let y=0;y<19;y++)for(let x=0;x<19;x++){const id=x+','+y+(l?','+l:'');state.visible.add(id);state.seen.add(id);}
 return {state,level:z,removed:cells.map(([x,y])=>({x,y,z})),worker:layout==='island'&&n?{x:8,y:8,z}:{x:5,y:11,z}};
}

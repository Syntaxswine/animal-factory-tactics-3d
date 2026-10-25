import fs from 'node:fs';
import path from 'node:path';
import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {HEDGE_VERSION,HEDGE_SEED} from '../dist/tactics/hedge-data.js';

export const ID='tutorial-greek-key';
export const VARIANT='greek-key.json';
export const RINGS=Object.freeze([88,96,104,112].map(min=>({min,max:239-min,gate:min+12})));
export const FINISH={x:120,y:120,z:0};
export const ROUTE=[
 [100,158],[100,147],[92,147],[92,92],[147,92],[147,147],[108,147],
 [108,139],[100,139],[100,100],[139,100],[139,139],[116,139],
 [116,131],[108,131],[108,108],[131,108],[131,131],[124,131],
 [124,120],[120,120]
];

export function greekKeyTutorial(){
 const map=blankMap('Tutorial · Greek Key Garden'),hedges=new Map();
 for(const row of map.terrain)row.fill('ground-grass');
 const plant=(x,y)=>hedges.set(x+','+y,{kind:'hedge-short',x,y,z:0,hedgeVersion:HEDGE_VERSION,hedgeSeed:HEDGE_SEED});
 for(const {min,max,gate}of RINGS){
  for(let x=min;x<=max;x++){plant(x,min);if(Math.abs(x-gate)>2)plant(x,max);}
  for(let y=min;y<=max;y++){plant(min,y);plant(max,y);}
 }
 // Close the near side of each annulus. Its entrance and next gate lie on
 // opposite sides, so walking around the square is the only way forward.
 for(let i=0;i<RINGS.length-1;i++){
  const outer=RINGS[i],inner=RINGS[i+1];
  for(let y=inner.max;y<=outer.max;y++)plant(outer.min+16,y);
 }
 map.props=[...hedges.values()].sort((a,b)=>a.y-b.y||a.x-b.x);
 // A three-tile dirt ribbon makes the route legible without narrowing the
 // seven-tile grass corridors or the five-tile openings.
 for(let i=1;i<ROUTE.length;i++){
  const [ax,ay]=ROUTE[i-1],[bx,by]=ROUTE[i],steps=Math.abs(bx-ax)+Math.abs(by-ay);
  if(ax!==bx&&ay!==by)throw Error('The tutorial route must turn at right angles.');
  for(let n=0;n<=steps;n++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const x=ax+Math.sign(bx-ax)*n+dx,y=ay+Math.sign(by-ay)*n+dy;
   if(!hedges.has(x+','+y))map.terrain[y][x]='ground-dirt';
  }
 }
 map.starts=[[100,158],[102,158],[100,160],[102,160]].map(([x,y],i)=>({x,y,z:0,species:['horse','goat','donkey','sheep'][i],weapon:'hands',heading:270}));
 map.exits=[{...FINISH}];
 map.sectorTemplate={id:ID,role:'tutorial',status:'authored',config:{feature:null,roads:[]},transform:{turns:0,mirror:false},scope:'Standalone movement practice; open in the map editor and Playtest.',notes:[
  'Four nested square hedges. Enter at the southwest opening and follow the dirt ribbon to the central travel marker.',
  'Five-tile gates, seven-tile corridors and solid dividers force a continuous Greek key route without corner shortcuts.',
  'No enemies or scripted lessons. The four unarmed starts use free exploration; the garden is a foundation for later tutorial encounters.'
 ]};
 const errors=validateMap(map);if(errors.length)throw Error(errors.join('\n'));
 return map;
}

export function greekKeyPreview(map){
 const hedges=map.props.map(p=>`<rect x="${p.x-.5}" y="${p.y-.5}" width="1" height="1"/>`).join('');
 const dirt=[];
 for(let y=85;y<=163;y++)for(let x=85;x<=154;x++)if(map.terrain[y][x]==='ground-dirt')dirt.push(`<rect x="${x-.5}" y="${y-.5}" width="1" height="1"/>`);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="83 82 74 87" role="img" aria-labelledby="title desc"><title id="title">Greek Key Garden tutorial map</title><desc id="desc">Four square hedge enclosures with staggered south gates and dividers. The dirt path winds around each square from the squad start to the central finish.</desc><rect x="83" y="82" width="74" height="87" fill="#9baa75"/><g fill="#c5ac7e">${dirt.join('')}</g><g fill="#385836">${hedges}</g><g fill="#f8df98" stroke="#3e4932" stroke-width=".35"><circle cx="120" cy="120" r="1.8"/></g><g fill="#277c76" stroke="#fff3d2" stroke-width=".35">${map.starts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r=".7"/>`).join('')}</g><g fill="#203c30" font-family="system-ui,sans-serif" font-size="2.2" font-weight="700"><text x="120" y="116.5" text-anchor="middle">FINISH</text><text x="105" y="160">START ↑</text></g></svg>\n`;
}

export function generate(){
 const root=path.resolve(import.meta.dirname,'../dist/tactics/sector-library'),folder=path.join(root,ID),map=greekKeyTutorial();
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,VARIANT),JSON.stringify(map)+'\n');
 const preview=greekKeyPreview(map);
 fs.writeFileSync(path.join(folder,'greek-key.svg'),preview);
 // A folder library always copies preview.svg, even for an authored-only entry.
 fs.writeFileSync(path.join(folder,'preview.svg'),preview);
 const metadataPath=path.join(folder,'placeholder.json'),prior=fs.existsSync(metadataPath)?JSON.parse(fs.readFileSync(metadataPath,'utf8')):{};
 const metadata={...prior,id:ID,kind:'sector-placeholder',version:1,status:'authored',role:'tutorial',facilities:[],difficulties:['easy'],config:{feature:null,roads:[]},allowedTransforms:[{turns:0,mirror:false}],variants:[VARIANT,...(prior.variants||[]).filter(v=>v!==VARIANT&&v!=='placeholder.json')],preview:'greek-key.svg',variantDetails:{...prior.variantDetails,[VARIANT]:{status:'authored',preview:'greek-key.svg'}},notes:map.sectorTemplate.notes};
 fs.writeFileSync(metadataPath,JSON.stringify(metadata,null,2)+'\n');
 const indexPath=path.join(root,'index.json'),index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
 const row={id:ID,role:'tutorial',collectionRole:'tutorial',feature:'land',facilities:[],difficulties:['easy'],orientations:1,authoredVariants:metadata.variants.length};
 index.entries=[...index.entries.filter(e=>e.id!==ID),row].sort((a,b)=>a.id.localeCompare(b.id));
 fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
 console.log('Generated Greek Key Garden: '+map.props.length+' hedge cells, four squad starts, four gates and a central finish.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)generate();

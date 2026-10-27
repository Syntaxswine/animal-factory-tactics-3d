import fs from 'node:fs';
import path from 'node:path';
import {blankMap,validateMap} from '../dist/tactics/core/maps.js';
import {HEDGE_VERSION,HEDGE_SEED} from '../dist/tactics/hedge-data.js';
import {exportSectors} from './sector-authoring.mjs';

export const ID='tutorial-greek-key';
export const VARIANT='greek-key.json';
export const SCALE=6,REPEATS=3,ORIGIN={x:60,y:102},CORRIDOR_RADIUS=2;
// Two opposed square curls form one S. Its top-right end is also the next
// motif's top-left start, producing a repeating Greek key band.
export const MOTIF=[[0,0],[6,0],[6,4],[2,4],[2,2],[3,2],[3,3],[5,3],[5,1],[1,1],[1,5],[7,5],[7,0]];
export const ENTRANCE={x:54,y:102,z:0},FINISH={x:192,y:102,z:0};
export const ROUTE=[
 [ENTRANCE.x,ENTRANCE.y],
 ...Array.from({length:REPEATS},(_,i)=>MOTIF.slice(i?1:0).map(([x,y])=>[ORIGIN.x+(i*7+x)*SCALE,ORIGIN.y+y*SCALE])).flat(),
 [FINISH.x,FINISH.y]
];
// A cross-section through each inner curl, away from its corners.
export const GATES=Array.from({length:REPEATS},(_,i)=>({x:ORIGIN.x+(i*7+3)*SCALE,y:ORIGIN.y+2.5*SCALE,z:0}));

export function greekKeyTutorial(){
 const map=blankMap('Tutorial · Greek Key Garden'),floor=new Set(),hedges=new Map();
 for(const row of map.terrain)row.fill('ground-grass');
 const plant=(x,y)=>hedges.set(x+','+y,{kind:'hedge-short',x,y,z:0,hedgeVersion:HEDGE_VERSION,hedgeSeed:HEDGE_SEED});
 const clearing=(x,y,radius)=>{for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)floor.add((x+dx)+','+(y+dy));};
 for(let i=1;i<ROUTE.length;i++){
  const [ax,ay]=ROUTE[i-1],[bx,by]=ROUTE[i],steps=Math.abs(bx-ax)+Math.abs(by-ay);
  if(ax!==bx&&ay!==by)throw Error('The tutorial route must turn at right angles.');
  for(let n=0;n<=steps;n++)clearing(ax+Math.sign(bx-ax)*n,ay+Math.sign(by-ay)*n,CORRIDOR_RADIUS);
 }
 clearing(FINISH.x,FINISH.y,4);
 // Border both sides of the continuous path, joining shared hedge cells. The
 // finishing court is closed, so walking outside cannot skip the S sections.
 for(const cell of floor){
  const [x,y]=cell.split(',').map(Number);map.terrain[y][x]='ground-dirt';
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!floor.has((x+dx)+','+(y+dy)))plant(x+dx,y+dy);
 }
 for(let dy=-CORRIDOR_RADIUS;dy<=CORRIDOR_RADIUS;dy++)hedges.delete((ENTRANCE.x-CORRIDOR_RADIUS-1)+','+(ENTRANCE.y+dy));
 map.props=[...hedges.values()].sort((a,b)=>a.y-b.y||a.x-b.x);
 map.starts=[[54,101],[54,103],[56,101],[56,103]].map(([x,y],i)=>({x,y,z:0,species:['horse','goat','donkey','sheep'][i],weapon:'hands',heading:0}));
 map.exits=[{...FINISH}];
 map.sectorTemplate={id:ID,role:'tutorial',status:'authored',config:{feature:null,roads:[]},transform:{turns:0,mirror:false},scope:'Standalone movement practice; open in the map editor and Playtest.',notes:[
  'Three linked S-shaped square spirals form a repeating Greek key band. Enter from the west and follow the dirt course to the eastern finishing court.',
  'Five-tile corridors and joined hedge borders keep every square curl connected and prevent an outside shortcut to the finish.',
  'No enemies or scripted lessons. The four unarmed starts use free exploration; the garden is a foundation for later tutorial encounters.'
 ]};
 const errors=validateMap(map);if(errors.length)throw Error(errors.join('\n'));
 return map;
}

export function greekKeyPreview(map){
 const minX=Math.min(...map.props.map(p=>p.x))-6,maxX=Math.max(...map.props.map(p=>p.x))+6,minY=Math.min(...map.props.map(p=>p.y))-6,maxY=Math.max(...map.props.map(p=>p.y))+8;
 const bounds=`${minX} ${minY} ${maxX-minX} ${maxY-minY}`;
 const hedges=map.props.map(p=>`<rect x="${p.x-.5}" y="${p.y-.5}" width="1" height="1"/>`).join('');
 const dirt=[];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(map.terrain[y][x]==='ground-dirt')dirt.push(`<rect x="${x-.5}" y="${y-.5}" width="1" height="1"/>`);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds}" role="img" aria-labelledby="title desc"><title id="title">Greek Key Garden tutorial map</title><desc id="desc">Three linked S-shaped square spirals repeat from west to east. Hedges enclose a continuous dirt course from the squad entrance to the eastern finishing court.</desc><rect x="${minX}" y="${minY}" width="${maxX-minX}" height="${maxY-minY}" fill="#9baa75"/><g fill="#c5ac7e">${dirt.join('')}</g><g fill="#385836">${hedges}</g><g fill="#f8df98" stroke="#3e4932" stroke-width=".35"><circle cx="${FINISH.x}" cy="${FINISH.y}" r="1.8"/></g><g fill="#277c76" stroke="#fff3d2" stroke-width=".35">${map.starts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r=".7"/>`).join('')}</g><g fill="#203c30" font-family="system-ui,sans-serif" font-size="2.2" font-weight="700"><text x="${FINISH.x}" y="${FINISH.y-6}" text-anchor="middle">FINISH</text><text x="${ENTRANCE.x}" y="${ENTRANCE.y+7}" text-anchor="middle">START →</text></g></svg>\n`;
}

export function generate({runtimeRoot=path.resolve(import.meta.dirname,'../dist/tactics/sector-library'),authoringRoot=path.resolve(import.meta.dirname,'../../sectors')}={}){
 const root=runtimeRoot,folder=path.join(root,ID),sourceFolder=path.join(authoringRoot,'tutorial',ID),hasAuthoring=fs.existsSync(authoringRoot),map=greekKeyTutorial();
 fs.mkdirSync(folder,{recursive:true});
 fs.writeFileSync(path.join(folder,VARIANT),JSON.stringify(map)+'\n');
 const preview=greekKeyPreview(map);
 fs.writeFileSync(path.join(folder,'greek-key.svg'),preview);
 // A folder library always copies preview.svg, even for an authored-only entry.
 fs.writeFileSync(path.join(folder,'preview.svg'),preview);
 const metadataPath=path.join(folder,'placeholder.json'),priorPath=hasAuthoring&&fs.existsSync(path.join(sourceFolder,'placeholder.json'))?path.join(sourceFolder,'placeholder.json'):metadataPath,prior=fs.existsSync(priorPath)?JSON.parse(fs.readFileSync(priorPath,'utf8')):{};
 const metadata={...prior,id:ID,kind:'sector-placeholder',version:1,status:'authored',role:'tutorial',facilities:[],difficulties:['easy'],config:{feature:null,roads:[]},allowedTransforms:[{turns:0,mirror:false}],variants:[VARIANT,...(prior.variants||[]).filter(v=>v!==VARIANT&&v!=='placeholder.json')],preview:'greek-key.svg',variantDetails:{...prior.variantDetails,[VARIANT]:{status:'authored',preview:'greek-key.svg'}},notes:map.sectorTemplate.notes};
 fs.writeFileSync(metadataPath,JSON.stringify(metadata,null,2)+'\n');
 const indexPath=path.join(root,'index.json'),index=JSON.parse(fs.readFileSync(indexPath,'utf8'));
 const row={id:ID,role:'tutorial',collectionRole:'tutorial',feature:'land',facilities:[],difficulties:['easy'],orientations:1,authoredVariants:metadata.variants.length};
 index.entries=[...index.entries.filter(e=>e.id!==ID),row].sort((a,b)=>a.id.localeCompare(b.id));
 fs.writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
 if(hasAuthoring){
  // The organized collection is the source of the next build's catalogue.
  // Keep a copy there so an ordinary export cannot drop this runtime-only entry.
  fs.mkdirSync(sourceFolder,{recursive:true});
  for(const file of [VARIANT,'placeholder.json','greek-key.svg','preview.svg'])fs.copyFileSync(path.join(folder,file),path.join(sourceFolder,file));
  const readme=path.join(folder,'README.md');if(fs.existsSync(readme)&&!fs.existsSync(path.join(sourceFolder,'README.md')))fs.copyFileSync(readme,path.join(sourceFolder,'README.md'));
  exportSectors(authoringRoot,root);
 }
 console.log('Generated Greek Key Garden: '+REPEATS+' linked square S spirals, '+map.props.length+' hedge cells and four squad starts.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename)generate();

// Raise the existing two-tier terrain without repainting its footprint or foliage.
// Heights are zero-based: [0,2,4] doubles both cliff tiers above ground.
export function raiseTutorialPlateau(source,{heights=[0,2,4]}={}){
 if(source?.version!==2||source.levels!==3||source.upper?.length!==2)throw Error('Expected the original three-layer tutorial plateau.');
 if(heights.length!==3||heights[0]!==0||heights.some((z,i)=>!Number.isInteger(z)||z<0||i&&z<=heights[i-1]))throw Error('Choose three increasing terrain heights beginning at ground.');
 if(source.stairs?.length||source.climbs?.length||source.canopies?.length||source.landPaint||Object.keys(source.edges||{}).length||source.props?.some(p=>p.kind.startsWith('ramp-')))throw Error('Raise the closed plateau before adding access links or structures.');
 const map=structuredClone(source),floor=(x,y,z)=>z?source.upper[z-1]?.[`${x},${y}`]:source.terrain[y]?.[x];
 map.levels=heights[2]+1;map.upper=Array.from({length:map.levels-1},()=>({}));
 for(let z=1;z<3;z++)map.upper[heights[z]-1]=structuredClone(source.upper[z-1]);
 map.props=[];
 for(const original of source.props||[]){
  const z=original.z??0;if(!heights.includes(heights[z]))throw Error('Object is outside the original plateau layers.');
  if(!['cliff-ledge','cliff-crag'].includes(original.kind)){map.props.push({...structuredClone(original),z:heights[z]});continue;}
  if(z>=2)throw Error('The original cliff needs an upper terrain tier.');
  const support=floor(original.x,original.y,z);if(!support||support==='void'||support==='water')throw Error('Cliff needs a supported base before raising.');
  for(let level=heights[z];level<heights[z+1];level++){
   map.props.push({...structuredClone(original),z:level});
   if(level)map.upper[level-1][`${original.x},${original.y}`]=support;
  }
 }
 for(const field of ['starts','guards','exits'])map[field]=(source[field]||[]).map(p=>({...structuredClone(p),z:heights[p.z??0]}));
 if(source.foliage)map.foliage=Object.fromEntries(Object.entries(source.foliage).map(([key,value])=>{const [x,y,z]=key.split(',').map(Number);if(heights[z]===undefined)throw Error('Foliage is outside the original plateau layers.');return [`${x},${y},${heights[z]}`,structuredClone(value)];}));
 if(map.sectorTemplate?.plateau){const plateau=map.sectorTemplate.plateau;plateau.heightSteps=heights[2];plateau.tierHeights=heights.slice(1).map((z,i)=>z-heights[i]);if(plateau.townApproach)plateau.townApproach.level=heights[2];}
 return map;
}

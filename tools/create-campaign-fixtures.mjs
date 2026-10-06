import fs from 'node:fs';
import path from 'node:path';
import {openingDefinitions} from '../dist/tactics/campaign-opening.js';
import {sectorPreview} from '../dist/tactics/sector-variant.js';
import {exportSectors} from './sector-authoring.mjs';
const source=path.resolve(process.env.AFT_MAP_LIBRARY||'../sectors'),runtime=path.resolve('dist/tactics/sector-library');
const definitions=openingDefinitions();
for(const map of Object.values(definitions)){
 const id=map.sectorTemplate.id,folder=path.join(source,'special',id);if(fs.existsSync(folder))throw Error('Authoring folder already exists; do not overwrite edits: '+folder);
}
for(const map of Object.values(definitions)){
 const id=map.sectorTemplate.id,folder=path.join(source,'special',id);fs.mkdirSync(folder,{recursive:true});
 const entry={id,kind:'sector-placeholder',version:1,status:'in-progress',role:'special',config:map.sectorTemplate.config,facilities:[],difficulties:['easy','medium','hard'],allowedTransforms:[{turns:0,mirror:false}],variants:['foundation-1.json','placeholder.json'],variantDetails:{'foundation-1.json':{status:'in-progress',preview:'foundation-1.svg'}},preview:'foundation-1.svg',notes:['Explicit seed-42 campaign assignment, one instance. Not part of random interchangeable templates.','Paired six-tile road and ground entry corridors are validated by the campaign.']};
 fs.writeFileSync(path.join(folder,'placeholder.json'),JSON.stringify(entry,null,2)+'\n');fs.writeFileSync(path.join(folder,'foundation-1.json'),JSON.stringify(map)+'\n');fs.writeFileSync(path.join(folder,'foundation-1.svg'),sectorPreview(map));fs.writeFileSync(path.join(folder,'preview.svg'),sectorPreview(map));
 fs.writeFileSync(path.join(folder,'README.md'),`# ${map.name}\n\nTwo-sector campaign foundation fixture. Edit foundation-1.json through the sector library at orientation 0°. This is not final tutorial terrain.\n\nCampaigns retain their own snapshot after New campaign. Editing this source does not repopulate existing campaigns. Preserve the six-wide midpoint entry corridor and stable character IDs. campaignLoot records are persistent initial contents; container search state is independent of opening doors.\n`);
}
console.log('Exported '+exportSectors(source,runtime).length+' sector configurations.');

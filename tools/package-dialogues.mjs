import fs from 'node:fs';
import path from 'node:path';
import {validateDialogueManifest} from '../dist/tactics/dialogue-data.js';
import {validateDialogue} from '../dist/tactics/dialogue-schema.js';
export function packageDialogues(root,out){
 const source=path.join(root,'dist/tactics/dialogues'),dest=path.join(out,'tactics/dialogues'),manifest=validateDialogueManifest(JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8')));
 fs.mkdirSync(dest,{recursive:true});fs.copyFileSync(path.join(source,'manifest.json'),path.join(dest,'manifest.json'));
 for(const entry of manifest.dialogues){const file=entry.id+'.json',d=validateDialogue(JSON.parse(fs.readFileSync(path.join(source,file),'utf8')));if(d.id!==entry.id||d.version!==entry.version)throw Error('Dialogue manifest mismatch: '+file);fs.copyFileSync(path.join(source,file),path.join(dest,file));}
 // Strict shipped-content check. Unfinished user maps may retain unresolved refs,
 // but an enabled dialogue in a packaged map must resolve to real content.
 const known=new Set(manifest.dialogues.map(d=>d.id));
 function scan(directory){if(!fs.existsSync(directory))return;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())scan(file);else if(entry.name.endsWith('.json')){const d=JSON.parse(fs.readFileSync(file,'utf8'));for(const p of [...(Array.isArray(d.starts)?d.starts:[]),...(Array.isArray(d.guards)?d.guards:[])]){const c=p.character;if(c?.canTalk){const embedded=d.dialogueDefinitions?.[c.dialogueRef];if(embedded)validateDialogue(embedded);else if(!known.has(c.dialogueRef))throw Error('Missing dialogue '+c.dialogueRef+' in '+file);}}}}}
 scan(path.join(root,'dist/tactics/sector-library'));
}

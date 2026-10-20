export const dialogueOverrides={'engine.js':'Initialize isolated dialogue randomness and persistent speaker identities.','maps.js':'Validate embedded data-only dialogue resources.','blocks.js':'Preserve dialogue definitions when extracting modular blocks.'};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('Dialogue adapter anchor changed: '+a);return s.replace(a,b);};
export function adaptCoreDialogue(name,data){let s=data.toString();
 if(name==='engine.js'){s="import {tutorialCrateLoot} from '../tutorial-mission.js';\nimport {initializeDialogue,ensureDialogueUnitIds,pinDialogue} from '../dialogue-state.js';\n"+s;s=once(s,'const add=(team,name,species', 'initializeDialogue(s,seed);for(const d of Object.values(definition.dialogueDefinitions||{}))pinDialogue(s.dialogue,d);\n const add=(team,name,species');s=once(s,'trackMapGeometry(s);if(detect)refresh(s);','s.loot.push(...tutorialCrateLoot(definition));ensureDialogueUnitIds(s);trackMapGeometry(s);if(detect)refresh(s);');}
 if(name==='maps.js'){s="import {tutorialRoleErrors} from '../tutorial-mission.js';\nimport {dialogueMapErrors} from '../dialogue-schema.js';\n"+s;s=once(s,'...characterErrors(raw)','...characterErrors(raw),...dialogueMapErrors(raw),...tutorialRoleErrors(raw)');}
 if(name==='blocks.js')s=once(s,'if(m.characterResources)d.characterResources=structuredClone(m.characterResources);return d;', 'if(m.characterResources)d.characterResources=structuredClone(m.characterResources);if(m.dialogueDefinitions)d.dialogueDefinitions=structuredClone(m.dialogueDefinitions);return d;');
 return Buffer.from(s);
}

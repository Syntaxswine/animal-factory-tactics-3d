// Writes dist/tactics/idle-fits.js: each catalog mammal's fitted idle limits (how far its head turns, nods, looks up and
// tilts, its chest twist and its arms' swing; see createIdle in idle-motion.js), keyed by the rig's fingerprint, so the
// idle study and the game skip the 6-11 s fit. Run it after changing a rig or the fit; tests/idle-fits.test.mjs refits
// every rig and fails while the table is stale.
//   node tools/fit-idle-rigs.mjs
import fs from 'node:fs';
import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';
import {createIdle,rigKey} from '../dist/tactics/idle-motion.js';

const load=file=>JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+file,import.meta.url)));
const rows=[];
for(const profile of ANIMAL_MOTION_CATALOG.filter(p=>!p.unarmed)){
 const worker=profile.create(load(profile.file)),key=rigKey(worker),started=performance.now(),idle=createIdle(worker,{refit:true});
 const {nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding}=idle.fitted;idle.dispose();worker.dispose();
 rows.push(` // ${profile.id}\n ${JSON.stringify(key)}:${JSON.stringify({nod,up,tilt,yaw,twist,swing,ease,shrug,weightShift,rounding})},`);
 console.log(profile.id.padEnd(13),key,((performance.now()-started)/1000).toFixed(1)+' s','turn',yaw[1]+'/'+yaw[-1],'nod',nod,'up',up,'tilt',tilt,'twist',twist[1]+'/'+twist[-1],'ease',ease,'shrug',shrug,'shift',weightShift,'round',rounding,'swing',JSON.stringify(swing));
}
fs.writeFileSync(new URL('../dist/tactics/idle-fits.js',import.meta.url),`// Each catalog mammal's fitted idle limits, keyed by its rig (rigKey in idle-motion.js): written by
// tools/fit-idle-rigs.mjs, checked against a refit of every rig by tests/idle-fits.test.mjs. Do not edit by hand.
export const IDLE_FITS={
${rows.join('\n')}
};
`);
console.log('wrote dist/tactics/idle-fits.js,',rows.length,'rigs');

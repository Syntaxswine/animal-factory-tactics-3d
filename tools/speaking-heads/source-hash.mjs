// The speaking heads' sources, hashed: each built head records it (sourceHash), and
// tests/speaking-heads.test.mjs fails when a source has changed since the heads were built.
// Line endings are ignored (a Windows checkout has CRLF).
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const SPEAKING_SOURCES=['tools/speaking-heads/heads.mjs','tools/speaking-heads/mouths.mjs','tools/speaking-heads/sculpt.mjs','tools/speaking-heads/surface.mjs','tools/speaking-heads/place.mjs','tools/speaking-heads/plan.mjs','tools/speaking-heads/view.mjs','tools/build-speaking-heads.mjs','dist/tactics/grey-surface.js'];
export function speakingSourceHash(root=new URL('../../',import.meta.url)){
 const h=createHash('sha256');
 for(const file of SPEAKING_SOURCES)h.update(file+'\n').update(fs.readFileSync(new URL(file,root),'utf8').replace(/\r\n/g,'\n'));
 return h.digest('hex').slice(0,16);
}

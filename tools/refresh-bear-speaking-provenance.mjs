// The speaking source hash covers the whole roster. Adding the bear changes
// that hash without changing any existing head's build inputs. Refresh only
// that metadata after proving the edit is strictly additive; never remesh or
// alter the already reviewed twelve characters for a roster-only extension.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {HEADS} from './speaking-heads/heads.mjs';
import {SPEAKING_SOURCES,speakingSourceHash} from './speaking-heads/source-hash.mjs';
const from=process.argv.find(a=>a.startsWith('--from='))?.slice(7);assert.match(from||'',/^[a-f0-9]{7,40}$/,'Pass the previously reviewed commit with --from=SHA');
const read=file=>fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),old=file=>execFileSync('git',['show',from+':'+file],{maxBuffer:20000000,encoding:'utf8'}).replace(/\r\n/g,'\n'),compact=s=>s.replace(/\n{2,}/g,'\n'),hash=createHash('sha256');
for(const file of SPEAKING_SOURCES){
 const before=old(file);hash.update(file+'\n').update(before);let after=read(file);
 if(file.endsWith('/heads.mjs'))after=after.replace(/^function bear\(x,y,z\)\{[\s\S]*?^\}\n/m,'').replace(/^.*\{id:'bear'.*\n/m,'').replace(/^ bear:\{sheet:.*\n/m,'');
 if(file.endsWith('/mouths.mjs'))after=after.replace(/^ bear:mouth\(\{[\s\S]*?^ \}\),\n/m,'');
 assert.equal(compact(after),compact(before),'Existing speaking source changed: '+file);
}
const beforeHash=hash.digest('hex').slice(0,16),sourceHash=speakingSourceHash(),updated=[];
for(const head of HEADS)for(const level of ['author','10k']){
 const file='dist/tactics/speaking-heads/'+head.id+'-'+level+'.json',data=JSON.parse(read(file));
 if(head.id==='bear'){assert.equal(data.sourceHash,sourceHash);continue;}
 const reviewed=JSON.parse(old(file)),withoutHash=value=>{const copy={...value};delete copy.sourceHash;return copy;};
 assert.equal(reviewed.sourceHash,beforeHash,'Pinned source lineage: '+file);
 assert.deepEqual(withoutHash(data),withoutHash(reviewed),'Reviewed geometry or metadata changed: '+file);
 const partsHash=createHash('sha256').update(JSON.stringify(data.parts)).digest('hex');data.sourceHash=sourceHash;fs.writeFileSync(file,JSON.stringify(data)+'\n');
 assert.equal(createHash('sha256').update(JSON.stringify(JSON.parse(read(file)).parts)).digest('hex'),partsHash);
 updated.push({file,partsHash});
}
console.log(JSON.stringify({from,beforeHash,sourceHash,unchangedMeshes:updated.length,updated}));

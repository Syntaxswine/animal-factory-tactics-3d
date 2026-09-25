import {adaptCoreRoads,roadOverrides} from './core-road-adapter.mjs';
import {adaptCoreCharacters,characterOverrides} from './core-character-adapter.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {adaptCoreCliffs,cliffOverrides} from './core-cliff-adapter.mjs';
import {adaptCoreClock,clockOverrides} from './core-clock-adapter.mjs';

// Generated dependency: update the revision deliberately, never hand-edit core/.
const revision='e529f4b3d512d32cea522d701d01ebe8488af013';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist/tactics/core');
const check=process.argv.includes('--check');
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root});
const files={},overrides={},pending=['engine.js','world.js','editor-model.js','blocks.js'];
while(pending.length){
 const name=pending.pop();if(files[name])continue;
 if(!/^[\w-]+\.js$/.test(name))throw Error('Unexpected core dependency: '+name);
 const upstream=git('show',`${revision}:dist/tactics/${name}`),data=adaptCoreRoads(name,adaptCoreCharacters(name,adaptCoreCliffs(name,adaptCoreClock(name,upstream))));
 if(roadOverrides[name]||clockOverrides[name]||cliffOverrides[name]||characterOverrides[name])overrides[name]={reason:[roadOverrides[name],clockOverrides[name],cliffOverrides[name],characterOverrides[name]].filter(Boolean).join(' '),upstreamSha256:createHash('sha256').update(upstream).digest('hex')};
 files[name]=createHash('sha256').update(data).digest('hex');
 for(const match of data.toString().matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+)['"]/g))pending.push(match[1]);
 if(check){if(!fs.readFileSync(path.join(out,name)).equals(data))throw Error('Core differs from upstream: '+name);}
 else {fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name),data);}
}
const manifest=JSON.stringify({repository:'https://github.com/Syntaxswine/animal-factory',branch:'work/mature-tree-core',revision,overrides:Object.fromEntries(Object.entries(overrides).sort()),files:Object.fromEntries(Object.entries(files).sort())},null,2)+'\n';
if(check){if(fs.readFileSync(path.join(out,'manifest.json'),'utf8')!==manifest)throw Error('Core manifest mismatch');}
else fs.writeFileSync(path.join(out,'manifest.json'),manifest);
console.log(`${check?'Verified':'Imported'} ${Object.keys(files).length} core modules with recorded clock adapters at ${revision.slice(0,7)}.`);

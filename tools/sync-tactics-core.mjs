import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Generated dependency: update the revision deliberately, never hand-edit core/.
const revision='6e2782a4ab3dde0f8b84a8610769664335294fe0';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist/tactics/core');
const check=process.argv.includes('--check');
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],{cwd:root});
const files={},pending=['engine.js','world.js'];
while(pending.length){
 const name=pending.pop();if(files[name])continue;
 if(!/^[\w-]+\.js$/.test(name))throw Error('Unexpected core dependency: '+name);
 const data=git('show',`${revision}:dist/tactics/${name}`);
 files[name]=createHash('sha256').update(data).digest('hex');
 for(const match of data.toString().matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"]+)['"]/g))pending.push(match[1]);
 if(check){if(!fs.readFileSync(path.join(out,name)).equals(data))throw Error('Core differs from upstream: '+name);}
 else {fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name),data);}
}
const manifest=JSON.stringify({repository:'https://github.com/Syntaxswine/animal-factory',branch:'tactics-prototype',revision,files:Object.fromEntries(Object.entries(files).sort())},null,2)+'\n';
if(check){if(fs.readFileSync(path.join(out,'manifest.json'),'utf8')!==manifest)throw Error('Core manifest mismatch');}
else fs.writeFileSync(path.join(out,'manifest.json'),manifest);
console.log(`${check?'Verified':'Imported'} ${Object.keys(files).length} unmodified core modules at ${revision.slice(0,7)}.`);

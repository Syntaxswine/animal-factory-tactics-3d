// Freeze the entire deployable package, never a mixture of baseline/candidate modules.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),[label,revision]=process.argv.slice(2);
if(!/^[a-z0-9-]+$/.test(label||''))throw Error('Usage: node snapshot.mjs LABEL [COMMIT]');
const out=path.join(root,'artifacts/texture-combat-2026-10-16/builds',label);
if(fs.existsSync(out))throw Error('Snapshot already exists: '+out);
fs.mkdirSync(out,{recursive:true});
const git=(...args)=>execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),...args],{cwd:root,encoding:'utf8'});
const commit=git('rev-parse',revision||'HEAD').trim();
const source=path.join(out,'source');fs.mkdirSync(source);
if(revision){
 const archive=path.join(out,'source.tar');git('archive','--format=tar','--output='+archive,commit,'dist','tools','package.json');
 execFileSync('tar',['-xf',archive,'-C',source]);fs.unlinkSync(archive);
}else{for(const directory of ['dist','tools'])fs.cpSync(path.join(root,directory),path.join(source,directory),{recursive:true});fs.copyFileSync(path.join(root,'package.json'),path.join(source,'package.json'));
}
execFileSync(process.execPath,['tools/build-tactics-3d.mjs'],{cwd:source,stdio:'inherit',env:{...process.env,AFT_MAP_LIBRARY:path.join(out,'no-external-maps')}});
const destination=path.join(out,'package');fs.cpSync(path.join(source,'.pages-output'),destination,{recursive:true});
const files={};function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else files[path.relative(destination,p).replaceAll('\\','/')]=createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}walk(destination);
const hash=createHash('sha256').update(JSON.stringify(Object.entries(files).sort())).digest('hex');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({label,commit,dirty:revision?'':git('diff','--binary','HEAD'),builtAt:new Date().toISOString(),hash,files},null,2));
console.log(JSON.stringify({label,commit,hash,files:Object.keys(files).length}));

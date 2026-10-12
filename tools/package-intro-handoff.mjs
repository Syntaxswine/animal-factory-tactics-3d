import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Explicit, portable snapshot. Never refresh or delete an existing recipient's
// folder: it may already contain Claude's work.
const root=fileURLToPath(new URL('../',import.meta.url));
if(!process.argv[2])throw Error('Supply a new destination directory');
const output=path.resolve(process.argv[2]);
if(fs.existsSync(output))throw Error('Destination exists; choose a fresh handoff directory');
const files=new Set(),modules=new Set(),rel=p=>path.relative(root,p).replaceAll('\\','/');
function add(file){const absolute=path.resolve(root,file);if(!absolute.startsWith(path.resolve(root)+path.sep))throw Error('Source outside repository: '+file);if(!fs.statSync(absolute).isFile())throw Error('Not a source file: '+file);files.add(rel(absolute));return absolute;}
function visit(file){const absolute=add(file);if(modules.has(absolute))return;modules.add(absolute);
 for(const m of fs.readFileSync(absolute,'utf8').matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\bnew\s+URL\(\s*)['"](\.{1,2}\/[^'"]+\.m?js)['"]/g))visit(rel(path.resolve(path.dirname(absolute),m[1])));
}
for(const entry of ['dist/tactics/intro-study.js','dist/tactics/utility-helicopter-study.js','tests/intro-animation.test.mjs','tests/utility-helicopter.test.mjs'])visit(entry);
for(const file of [
 'dist/tactics/intro-study.html','dist/tactics/intro-study.css','dist/tactics/utility-helicopter-study.html','dist/tactics/vendor/THREE-LICENSE.txt',
 'dist/tactics/hen-10k-data.json','dist/tactics/horse-10k-data.json','dist/tactics/canvas-truck-10k-data.json',
 'dist/assets/environment/strategic-sites/material-atlas.png','dist/assets/environment/utility-helicopter/paint-atlas-v1.png','dist/assets/environment/utility-helicopter/reference-v1.png','dist/assets/environment/utility-helicopter/PROMPTS.json',
 'dist/assets/environment/ground-dirt.png','dist/assets/environment/painted/foliage-atlas-v1.png','dist/assets/environment/painted-study/canvas-truck-paint-v1.png',
 'dist/assets/effects/painted-fire/flame-atlas-v1.png','dist/assets/effects/painted-fire/smoke-atlas-v1.png',
 'dist/assets/characters/lowpoly-proof/hen-model-paint-v1.png','dist/assets/characters/lowpoly-proof/hen-underlay-paint-v1.png','dist/assets/characters/lowpoly-proof/hen-tail-paint-v1.png','dist/assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png',
 'docs/tactics/INTRO-CLAUDE-HANDOFF.md','docs/tactics/INTRO-ANIMATION.md','docs/tactics/UTILITY-HELICOPTER.md',
 'tools/serve-intro-study.mjs','tools/capture-intro-study.mjs','tools/site-review-browser.mjs','tools/check-module-closure.mjs',
 'tests/tactics-3d-deployment.test.mjs',
 'hybrid-review/intro-animation/REVIEW.md','hybrid-review/intro-animation/browser-checks.json','hybrid-review/intro-animation/independent-review.json','hybrid-review/intro-animation/sequence-playback.webm',
 ...['shot-02','shot-05','shot-08','shot-10','shot-12','missile-nose','missile-cutaway','exit-open'].map(n=>'hybrid-review/intro-animation/'+n+'.png')
])add(file);
for(const name of fs.readdirSync(path.join(root,'docs/tactics/intro-storyboard')))add('docs/tactics/intro-storyboard/'+name);
const sourceCommit=execFileSync('git',['-c','safe.directory='+root,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
fs.mkdirSync(output,{recursive:true});
for(const file of files){const destination=path.join(output,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination);}
fs.writeFileSync(path.join(output,'package.json'),JSON.stringify({name:'animal-factory-intro-handoff',private:true,type:'module',engines:{node:'>=22'},scripts:{test:'node --test tests/intro-animation.test.mjs tests/utility-helicopter.test.mjs'}},null,2)+'\n');
fs.writeFileSync(path.join(output,'START-HERE.md'),[
 '# Intro animation — Claude handoff',
 '',
 '**Current visual direction is unaccepted.** The user says the latest 3D version still misses the mark and is considering animated sprites. Prior 9/10 reviews establish useful mechanical work, not final user art approval.',
 '',
 'Start with [the handoff and checklist](docs/tactics/INTRO-CLAUDE-HANDOFF.md). It distinguishes current assets from the proposed, still-unbuilt three-keyframe sprite proof.',
 '',
 '1. Inspect [the circled crash location](docs/tactics/intro-storyboard/crash-sector-reference.png).',
 '2. Open the existing painted sheets: [approach/ambush](docs/tactics/intro-storyboard/01-approach-and-ambush-v2.png) and [descent/crash](docs/tactics/intro-storyboard/02-hit-and-landing-v3.png). Their nearby SAM/relay geography is superseded.',
 '3. Watch [the 35-second animation test](hybrid-review/intro-animation/sequence-playback.webm).',
 '4. Use the included source and tests as reference for a new composition pass.',
 '',
 '## Run the included motion/model tests',
 '',
 'From this extracted directory, with Node.js 22 or later:',
 '',
 '    npm test',
 '',
 'This runs 25 tests using the bundled JavaScript dependencies and truck data. No npm install is needed. The two distribution tests are copied for reference; they require the full game checkout and are excluded from this package test command.',
 '',
 '## Interactive studies',
 '',
 'The existing local preview is http://127.0.0.1:4476/tactics/intro-study.html and expires October 13, 2026 at 1:37 p.m. Eastern. Prefer it while available.',
 '',
 'For a deliberate new preview, choose a free port and follow the ownership/registration instructions in the handoff. The included read-only server serves this package and has a real 24-hour shutdown timer. For example, after confirming that 4476 is free:',
 '',
 '    node tools/serve-intro-study.mjs 4476',
 '',
 'Then open /tactics/intro-study.html or /tactics/utility-helicopter-study.html. Opening the HTML directly from disk does not load the modules correctly. No helper starts merely by opening or extracting this package.',
 '',
 'The two viewers and their assets are included. Related-study navigation (for example the separate factory-truck page), older linked project reviews and full-game build tools remain in the complete repository. The browser capture utility needs the optional machine-installed Playwright/Edge runtime; the included test command does not.',
 '',
 '## Contents and provenance',
 '',
 'The docs, source and evidence preserve their repository-relative paths. This folder is a focused snapshot, not a new canonical checkout. Do not overwrite another agent’s active copy. MANIFEST.json records source revision, sizes and SHA-256 hashes for transfer verification. The old storyboard variants are historical; the current two sheets above and marked map have precedence.',
 '',
 'No Git metadata, credentials, private helper logs or installed dependencies are included. Nothing has been sent to Claude automatically.',
 ''
].join('\n'));
const generated=['START-HERE.md','package.json'];
const manifest={createdAt:new Date().toISOString(),sourceCommit,animationBaseline:'934911b5db0b0b3150056ad19fcb16080c228c33',branch:'work/utility-helicopter',scope:'Intro reference package; user visual acceptance outstanding; sprite proof not created',modules:modules.size,files:[...files,...generated].sort().map(file=>{const bytes=fs.readFileSync(path.join(output,file));return {file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),origin:generated.includes(file)?'generated handoff wrapper':'repository'};})};
fs.writeFileSync(path.join(output,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({output,files:manifest.files.length,modules:modules.size,bytes:manifest.files.reduce((n,f)=>n+f.bytes,0),sourceCommit}));

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {presetCatalog,filterPresets,loadPreset,nextVariantName,variantPath,presetSearch} from '../dist/tactics/sector-presets.js';
import {prepareVariant} from '../dist/tactics/sector-variant.js';
import {EditingDocument} from '../dist/tactics/editor-3d-controller.js';
const root=new URL('../dist/tactics/',import.meta.url);
const fetcher=async(url,options)=>{assert.equal(options.cache,'no-store');try{return {ok:true,json:async()=>JSON.parse(await fs.readFile(new URL(url,root),'utf8'))};}catch{return {ok:false,status:404};}};
const entries=await presetCatalog({fetcher});

test('preset browser includes every published configuration, tutorial map, and special map',async()=>{
 const index=JSON.parse(await fs.readFile(new URL('sector-library/index.json',root),'utf8'));
 assert.deepEqual(entries.map(e=>e.id),index.entries.map(e=>e.id));
 for(const role of ['town','village','city','countryside','fortress','tutorial','special'])assert.ok(filterPresets(entries,{role}).length,role);
 for(let step=1;step<=4;step++)assert.ok(entries.find(e=>e.id==='tutorial-step-'+step).variants.includes('rough-plateau.json'));
 assert.ok(entries.find(e=>e.id==='tutorial-step-5').variants.includes('rough-plateau.json'));
});
test('search combines role, terrain, facilities and variant names',()=>{
 const rivers=filterPresets(entries,{role:'city',feature:'river',query:'factory workshop'});assert.ok(rivers.length);
 assert.ok(rivers.every(e=>e.role==='city'&&e.config.feature.kind==='river'));
 assert.equal(filterPresets(entries,{query:'rough plateau'}).length,5);
 assert.equal(filterPresets(entries,{query:'not-a-real-sector'}).length,0);
});
test('opening a base layout preserves geometry through editing and a new variant',async()=>{
 const entry=entries.find(e=>e.role==='town'&&e.config.feature?.kind==='river'),before=JSON.stringify(entry);
 const map=await loadPreset({id:entry.id},{fetcher}),doc=new EditingDocument().open(JSON.stringify(map));
 assert.deepEqual(doc.map.sectorTemplate.config,entry.config);assert.equal(doc.size,240);
 assert.ok(doc.apply({tool:'texture',start:{x:30,y:30,z:0},options:{groundKind:'ground-concrete'}}).ok);
 const saved=prepareVariant(entry,{id:entry.id,name:nextVariantName(entry),map:JSON.parse(doc.export())});
 assert.equal(saved.map.terrain[30][30],'ground-concrete');assert.deepEqual(saved.map.sectorTemplate.config,entry.config);
 assert.equal(JSON.stringify(entry),before);assert.equal(map.terrain[30][30],'yard');
 assert.equal(variantPath(entry,'market'),entry.role+'/'+entry.id+'/market.json');
});
test('authored tutorial copies keep their terrain and cannot be independently rotated',async()=>{
 const map=await loadPreset({id:'tutorial-step-1',variant:'rough-plateau.json'},{fetcher});
 const original=JSON.parse(await fs.readFile(new URL('sector-library/tutorial-step-1/rough-plateau.json',root),'utf8'));
 assert.deepEqual(map.terrain,original.terrain);assert.deepEqual(map.upper,original.upper);assert.equal(map.sectorTemplate.id,'tutorial-step-1');
 await assert.rejects(loadPreset({id:'tutorial-step-1',variant:'rough-plateau.json',orientation:1},{fetcher}),/saved orientation/);
});
test('variant naming advances within its own configuration and URLs retain the folder source',()=>{
 const entry={variants:['placeholder.json','variant-01.json','variant-02.json','market-01.json']};
 assert.equal(nextVariantName(entry),'variant-03');assert.equal(nextVariantName(entry,'market-01.json'),'market-02');
 const params=new URLSearchParams(presetSearch({id:'town--land-road-e',variant:'market-02.json',source:'folder'}));
 assert.equal(params.get('library'),'folder');assert.equal(params.get('variant'),'market-02.json');assert.equal(params.get('orientation'),'0');
});
test('loading an authored copy does not relabel rotated geometry as a canonical variant',async()=>{
 const original=await loadPreset({id:'tutorial-step-1',variant:'rough-plateau.json'},{fetcher});
 original.sectorTemplate.transform={turns:1,mirror:false};original.sectorTemplate.config={...original.sectorTemplate.config,roads:['east']};
 const rotated=await loadPreset({id:'tutorial-step-1',variant:'rough-plateau.json'},{fetcher:(url,options)=>url.endsWith('/rough-plateau.json')?{ok:true,json:async()=>structuredClone(original)}:fetcher(url,options)});
 assert.deepEqual(rotated.sectorTemplate,original.sectorTemplate);
 assert.throws(()=>prepareVariant(entries.find(e=>e.id==='tutorial-step-1'),{id:'tutorial-step-1',name:'rotated-copy',map:rotated}),/0°/);
});
test('unsafe, unregistered and invalid-orientation loads fail before replacing the document',async()=>{
 let fetched=false;await assert.rejects(loadPreset({id:'../outside'},{fetcher:()=>{fetched=true;}}),/path/);assert.equal(fetched,false);
 await assert.rejects(loadPreset({id:'town--land-road-e',variant:'../outside.json'},{fetcher}),/path/);
 await assert.rejects(loadPreset({id:'town--land-road-e',variant:'missing.json'},{fetcher}),/registered/);
 await assert.rejects(loadPreset({id:'town--land-road-e',orientation:99},{fetcher}),/orientation/);
});

import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const input=process.argv[2];
if(!input)throw Error('Usage: node tools/prepare-battle-sfx.mjs <Babble Lab audition/animal-factory/sfx>');
const report=JSON.parse(fs.readFileSync(path.join(input,'report.json'))),out=new URL('../dist/assets/audio/babble-sfx/',import.meta.url);
if(!Array.isArray(report.results)||report.results.length!==11||new Set(report.results.map(e=>e.id)).size!==11||report.results.some(e=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.id)))throw Error('Expected eleven unique, safe sound-effect IDs');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function pcm(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Expected a RIFF WAV');
 let fmt,data;for(let i=12;i+8<=bytes.length;){const size=bytes.readUInt32LE(i+4),chunk=bytes.subarray(i+8,i+8+size);if(i+8+size>bytes.length)throw Error('Truncated WAV');if(bytes.toString('ascii',i,i+4)==='fmt ')fmt=chunk;if(bytes.toString('ascii',i,i+4)==='data')data=chunk;i+=8+size+(size%2);}
 if(!fmt||!data||fmt.readUInt16LE(0)!==1||fmt.readUInt16LE(2)!==1||fmt.readUInt32LE(4)!==44100||fmt.readUInt16LE(14)!==16||data.length%2)throw Error('Expected 44.1 kHz mono 16-bit PCM');
 return data;
}
function singleReport(bytes){
 const source=pcm(bytes),frames=Math.round(.135*44100),data=Buffer.from(source.subarray(0,frames*2)),fade=Math.round(.015*44100);
 for(let i=0;i<fade;i++){const at=(frames-fade+i)*2;data.writeInt16LE(Math.round(data.readInt16LE(at)*(1-i/(fade-1))),at);}
 const result=Buffer.alloc(44+data.length);result.write('RIFF');result.writeUInt32LE(result.length-8,4);result.write('WAVEfmt ',8);result.writeUInt32LE(16,16);result.writeUInt16LE(1,20);result.writeUInt16LE(1,22);result.writeUInt32LE(44100,24);result.writeUInt32LE(88200,28);result.writeUInt16LE(2,32);result.writeUInt16LE(16,34);result.write('data',36);result.writeUInt32LE(data.length,40);data.copy(result,44);return result;
}
fs.mkdirSync(out,{recursive:true});
const entries=[];
for(const effect of report.results){
 const recipe=effect.recipe;if(recipe.settings.amount!==.7||recipe.sliceLayer.level!==.2)throw Error('Expected the reviewed 70/20 treatment');
 const original=fs.readFileSync(path.join(input,effect.id+'.wav'));pcm(original);
 const bytes=effect.id==='ak47-burst'?singleReport(original):original,file=(effect.id==='ak47-burst'?'ak47-shot':effect.id)+'.wav';
 fs.writeFileSync(new URL(file,out),bytes);
 entries.push({id:effect.id==='ak47-burst'?'ak47-shot':effect.id,file,sha256:sha(bytes),frames:pcm(bytes).length/2,input:{id:effect.id,sha256:sha(original)},preparation:effect.id==='ak47-burst'?{from:0,seconds:.135,fadeOutSeconds:.015,note:'First report only; each committed automatic-weapon discharge plays one report, never the entire recorded burst.'}:null,recipe});
}
const manifest={version:1,source:'Babble Lab 0df4be4, Animal Factory sound audition',sampleRate:44100,channels:1,treatment:report.defaults,bank:report.bank,usage:'In-game effects; not a standalone sound library. Each source retains the licence recorded in its recipe. The music bank retains its owner-provided non-commercial source note.',effects:entries};
fs.writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared ${entries.length} game effects; ${entries.reduce((n,e)=>n+e.frames*2+44,0)} PCM WAV bytes.`);

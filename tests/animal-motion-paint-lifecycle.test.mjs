import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from '../dist/tactics/vendor/three.module.js';import {ANIMAL_MOTION_CATALOG} from '../dist/tactics/animal-motion-catalog.js';import {createAnimalPaint} from '../dist/tactics/animal-motion-paint.js';

function harness(id){
 const document=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(16).fill(255)})})})};
 const profile=ANIMAL_MOTION_CATALOG.find(p=>p.id===id),worker=profile.create(JSON.parse(fs.readFileSync(new URL('../dist/tactics/'+profile.file,import.meta.url)))),created=new Set(),live=new Set();let current=null;
 const renderer={capabilities:{getMaxAnisotropy:()=>1},getRenderTarget:()=>current,getClearColor:c=>c,getClearAlpha:()=>1,getViewport:v=>v,getScissor:v=>v,getScissorTest:()=>false,getPixelRatio:()=>1,setClearColor(){},setScissorTest(){},clear(){},setViewport(){},setScissor(){},render(){},setRenderTarget(t){current=t;if(t&&!created.has(t)){created.add(t);live.add(t);t.addEventListener('dispose',()=>live.delete(t));}}};
 return {profile,worker,renderer,created,live,dispose(){for(const t of live)t.dispose();worker.skeleton.dispose();worker.dispose();if(document===undefined)delete globalThis.document;else globalThis.document=document;}};
}
for(const [id,failedTexture,count]of [['horse','red-hat-uniform',1],['hen','hen-red-hat',3]])test(id+': failed outfit painting releases earlier projection targets',async()=>{
 const h=harness(id),textures=[],disposed=new Set(),loader={async loadAsync(url){if(url.includes(failedTexture))throw Error('Injected outfit load failure');const t=new T.Texture({width:2,height:2});textures.push(t);t.addEventListener('dispose',()=>disposed.add(t));return t;}};
 try{await assert.rejects(createAnimalPaint(h.renderer,h.worker,h.profile,loader,'red-hats'),/Injected/);assert.equal(h.created.size,count);assert.equal(h.live.size,0);assert.equal(disposed.size,textures.length);}finally{h.dispose();}
});
test('a late hen texture is released after its parallel sibling fails',async()=>{
 const h=harness('hen'),disposed=new Set(),main=new T.Texture({width:2,height:2}),late=new T.Texture({width:2,height:2});for(const t of [main,late])t.addEventListener('dispose',()=>disposed.add(t));let finish;
 const loader={loadAsync(url){if(url.includes('hen-underlay'))return Promise.reject(Error('Injected underlay failure'));if(url.includes('hen-tail'))return new Promise(resolve=>{finish=resolve;});return Promise.resolve(main);}};
 try{await assert.rejects(createAnimalPaint(h.renderer,h.worker,h.profile,loader),/Injected/);assert.equal(h.live.size,0);finish(late);await Promise.resolve();await Promise.resolve();assert.deepEqual(disposed,new Set([main,late]));}finally{h.dispose();}
});

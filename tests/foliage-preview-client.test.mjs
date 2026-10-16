import test from 'node:test';
import assert from 'node:assert/strict';
import {FoliagePreviewClient} from '../dist/tactics/editor-foliage-preview-client.js';

test('preview coalesces dragging, rejects stale results and retires its worker on cancel',t=>{
 let now=1000,serial=0;const timers=new Map(),workers=[],shown=[];
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(fn,delay)=>{const id=++serial;timers.set(id,{fn,at:now+delay});return id;});
 t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const previous=globalThis.Worker;
 globalThis.Worker=class{constructor(){this.messages=[];workers.push(this);}postMessage(message){this.messages.push(message);}terminate(){this.terminated=true;}};
 t.after(()=>{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous;});
 const advance=ms=>{now+=ms;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}};
 const client=new FoliagePreviewClient(result=>shown.push(result)),document={revision:1,size:240,editor:{map:{foliage:{}}}};
 client.request(document,{x:1});client.request(document,{x:2});advance(0);
 assert.equal(workers.length,1);const worker=workers[0];assert.equal(worker.messages.length,2);assert.deepEqual(worker.messages[1].command,{x:2});
 const firstId=worker.messages[1].id;
 client.request(document,{x:3});client.request(document,{x:4});worker.onmessage({data:{id:firstId,result:'obsolete'}});
 assert.deepEqual(shown,[]);advance(124);assert.equal(worker.messages.length,2);advance(1);
 assert.equal(worker.messages.length,3);assert.deepEqual(worker.messages[2].command,{x:4});
 worker.onmessage({data:{id:worker.messages[2].id,result:'current'}});assert.deepEqual(shown,['current']);
 document.revision++;client.request(document,{x:5});advance(125);assert.equal(worker.messages.length,5);assert.ok(worker.messages[3].map);
 client.request(document,{x:6});client.stop();advance(125);assert.equal(worker.terminated,true);assert.equal(timers.size,0);assert.equal(client.worker,null);assert.equal(worker.messages.length,5);
 client.request(document,{x:7});advance(125);assert.equal(workers.length,2);assert.ok(workers[1].messages[0].map);
 worker.onmessage({data:{id:firstId,result:'retired'}});worker.onerror({message:'retired'});assert.equal(client.worker,workers[1]);assert.equal(client.inflight,true);assert.deepEqual(shown,['current']);
 client.stop();assert.equal(workers[1].terminated,true);
});

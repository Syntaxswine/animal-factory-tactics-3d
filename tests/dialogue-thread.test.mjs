import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueThread,DialogueReplyGate,dialogueTurn} from '../dist/tactics/dialogue-thread.js';

test('a message thread preserves both sides and the merc who actually chose each reply',()=>{
 const thread=new DialogueThread();thread.line('intro','Plateau guide','Did you bring the explosives?');
 const reply=thread.reply('Misha','We do not have them.');thread.settle(reply.id,true);
 thread.line('crate','Plateau guide','There is a crate in the crash sector.');
 // A later conversation's speaker must not rewrite a previous sent message.
 const other=thread.reply('Anya','We will get them.');thread.settle(other.id,true);
 assert.deepEqual(thread.entries.map(e=>[e.side,e.who,e.text]),[
  ['npc','Plateau guide','Did you bring the explosives?'],['merc','Misha','We do not have them.'],
  ['npc','Plateau guide','There is a crate in the crash sector.'],['merc','Anya','We will get them.']
 ]);
});

test('Replay and choice refresh do not duplicate a line; a new visit with identical text does',()=>{
 const thread=new DialogueThread();thread.line('visit/1','Guide','Hello.');
 assert.equal(thread.line('visit/1','Guide','Hello.'),null);assert.equal(thread.entries.length,1);
 thread.line('visit/2','Guide','Hello.');assert.equal(thread.entries.length,2);
 thread.clear();assert.equal(thread.entries.length,0);assert.ok(thread.line('visit/1','Guide','Hello.'));
});

test('a failed checkpoint is never marked sent, and retry updates the existing bubble once',()=>{
 const thread=new DialogueThread(),reply=thread.reply('Misha','I can disarm it.');
 assert.equal(reply.state,'pending');thread.settle(reply.id,false,true);assert.equal(reply.state,'unsaved');
 thread.retry(reply.id);assert.equal(reply.state,'pending');thread.settle(reply.id,true);
 assert.equal(reply.state,'sent');assert.equal(thread.entries.length,1);
 // A late callback after leaving cannot attach itself to a new message history.
 thread.clear();const fresh=thread.reply('Anya','A different conversation.');thread.settle(reply.id,true);
 assert.equal(fresh.state,'pending');assert.notEqual(fresh.id,reply.id);
});

test('rejected choices remain visibly unsent, and bounded history keeps the latest exchange',()=>{
 const thread=new DialogueThread(4);thread.line('first','Guide','Hello.');
 const reply=thread.reply('Misha','Wait.');thread.settle(reply.id,false);assert.equal(reply.state,'failed');
 for(let i=0;i<5;i++)thread.line('line/'+i,'Guide','Message '+i);
 assert.equal(thread.entries.length,4);assert.equal(thread.entries.at(-1).text,'Message 4');
});

test('the speaking portrait follows playback, then hands the floor to the replying merc',()=>{
 assert.equal(dialogueTurn({status:'playing',hasReplies:true}).side,'npc');
 assert.equal(dialogueTurn({status:'playing',side:'merc',busy:true,hasReplies:true}).side,'merc');
 assert.equal(dialogueTurn({status:'playing',side:'merc'}).merc,'Speaking');
 assert.equal(dialogueTurn({status:'done',hasReplies:true}).side,'merc');
 assert.equal(dialogueTurn({status:'fallback',hasReplies:true}).merc,'Your reply');
 assert.equal(dialogueTurn({status:'paused',hasReplies:true}).side,null);
 assert.equal(dialogueTurn({status:'done',hasReplies:false}).side,null);
});

test('NPC responses wait for both the merc performance and commit, in either completion order',()=>{
 for(const first of ['speech','commit']){
  const gate=new DialogueReplyGate();assert.equal(gate.start(1),true);assert.equal(gate.start(2),false);
  if(first==='speech')gate.speech(1,'done');else gate.settle(1);
  assert.equal(gate.release(),false);
  if(first==='speech')gate.settle(1);else gate.speech(1,'done');
  assert.equal(gate.release(),true);assert.equal(gate.release(),false);assert.equal(gate.active,false);
 }
});
test('pause/loading do not advance replies; Skip or unavailable audio can; close rejects late completions',()=>{
 const gate=new DialogueReplyGate();gate.start(1);gate.settle(1);
 for(const state of ['loading','playing','paused']){gate.speech(1,state);assert.equal(gate.release(),false);}
 gate.speech(1,'fallback');assert.equal(gate.release(),true);
 gate.start(2);gate.clear();gate.start(3);gate.settle(2);gate.speech(2,'done');assert.equal(gate.release(),false);
 gate.settle(3);gate.speech(3,'done');assert.equal(gate.release(),true);
});

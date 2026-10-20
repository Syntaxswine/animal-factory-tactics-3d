import test from 'node:test';
import assert from 'node:assert/strict';
import {DialogueThread,dialogueTurn} from '../dist/tactics/dialogue-thread.js';

test('a message thread preserves both sides and the merc who actually chose each reply',()=>{
 const thread=new DialogueThread();thread.line('intro','Plateau guide','Did you bring the explosives?');
 const reply=thread.reply('Misha','We do not have them.');thread.settle(reply.id,true);
 thread.line('crate','Plateau guide','There is a crate in the crash sector.');
 // The current merc picker is now Anya; it must not rewrite Misha's sent message.
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
 assert.equal(dialogueTurn({status:'playing',busy:true,hasReplies:true}).side,'merc');
 assert.equal(dialogueTurn({status:'done',hasReplies:true}).side,'merc');
 assert.equal(dialogueTurn({status:'fallback',hasReplies:true}).merc,'Your reply');
 assert.equal(dialogueTurn({status:'paused',hasReplies:true}).side,null);
 assert.equal(dialogueTurn({status:'done',hasReplies:false}).side,null);
});

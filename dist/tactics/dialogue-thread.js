// Presentation-only message history. It never rolls, checkpoints or changes a node.
export class DialogueThread {
 constructor(limit=80){this.limit=limit;this.serial=0;this.clear();}
 clear(){this.entries=[];this.lineKey=null;}
 line(key,who,text){
  if(key===this.lineKey)return null;
  this.lineKey=key;
  return this.append({side:'npc',who,text,key,state:'received'});
 }
 reply(who,text){return this.append({side:'merc',who,text,state:'pending'});}
 append(entry){const message={...entry,id:++this.serial};this.entries.push(message);this.entries=this.entries.slice(-this.limit);return message;}
 settle(id,accepted,retryable=false){const entry=this.entries.find(e=>e.id===id);if(entry?.side==='merc')entry.state=accepted?'sent':retryable?'unsaved':'failed';}
 retry(id){const entry=this.entries.find(e=>e.id===id);if(entry?.state==='unsaved')entry.state='pending';}
}

// Hand over the visual floor to the replying merc after the NPC's line ends.
// Pause/failure never masquerades as ongoing speech, including with muted voices.
export function dialogueTurn({status,busy=false,hasReplies=false}={}){
 if(busy)return {side:'merc',npc:'Listening',merc:'Sending reply',label:'Sending your reply…'};
 if(status==='playing')return {side:'npc',npc:'Speaking',merc:'Listening',label:'Speaking'};
 if(status==='loading')return {side:'npc',npc:'Preparing to speak',merc:'Listening',label:'Incoming message'};
 if(status==='paused')return {side:null,npc:'Paused',merc:'Replying as',label:'Conversation paused'};
 if(hasReplies)return {side:'merc',npc:'Listening',merc:'Your reply',label:'Choose a reply'};
 return {side:null,npc:'Finished speaking',merc:'Replying as',label:'Conversation complete'};
}

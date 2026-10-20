import {STAT_DEFINITIONS} from './character-stats.js';
import {DialogueSession} from './dialogue-session.js';
import {DIALOGUE_COLOURS,dialogueReadiness} from './dialogue-rules.js';
import {dialogueActorId} from './dialogue-state.js';
import {hudPortrait} from './battle-hud-model.js';
import {readSettings,motionPreference} from './settings-3d.js';
import {createDialoguePreferences} from './dialogue-preferences.js';
import {resolvePresentation} from './dialogue-presentation-manifest.js';
import {DialoguePerformance,dialogueAudio} from './dialogue-performance.js';
import {DialogueThread,dialogueTurn} from './dialogue-thread.js';

const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
const messageStatus={pending:'Sending…',sent:'Sent',unsaved:'Not saved · retry below',failed:'Not sent'};

export function createBattleDialogue(options){
 const css=el('link');css.rel='stylesheet';css.href=new URL('./battle-dialogue.css',import.meta.url).href;document.head.append(css);
 const dialog=el('dialog',undefined,'battle-dialogue');dialog.id='dialogue-popup';dialog.setAttribute('aria-labelledby','dialogue-title');document.body.append(dialog);
 const session=new DialogueSession({...options,onChange:()=>{render();options.onChange?.();}}),thread=new DialogueThread();
 let player,portrait,portraitLoading=false,generation=0,lineKey=null,words=[],lastState,lastView,settings=readSettings(),context,pendingReply=null,lastTurn=null;

 const header=el('header',undefined,'dialogue-header'),heading=el('div'),eyebrow=el('small','AF / FIELD TERMINAL','dialogue-eyebrow'),title=el('h2','Conversation');title.id='dialogue-title';
 const close=button('×',leave);close.setAttribute('aria-label','Leave dialogue');heading.append(eyebrow,title);header.append(heading,close);

 const participants=el('div',undefined,'dialogue-participants'),npcCard=el('section',undefined,'dialogue-participant dialogue-participant-npc'),mercCard=el('section',undefined,'dialogue-participant dialogue-participant-merc');
 const face=el('div',undefined,'dialogue-face'),fallback=el('img'),faceStatus=el('small');fallback.alt='';face.append(fallback,faceStatus);
 const npcName=el('h3'),npcRole=el('small','Speaking','dialogue-role');npcCard.append(face,npcName,npcRole);
 const mercFace=el('div',undefined,'dialogue-face dialogue-merc-face'),mercImage=el('img');mercImage.alt='';mercFace.append(mercImage);
 const replyRow=el('label',undefined,'dialogue-reply'),replyLabel=el('span','Replying as'),picker=el('select'),mercRole=el('small','Listening','dialogue-role');
 picker.id='dialogue-speaker';picker.setAttribute('aria-label','Replying as');picker.onchange=()=>session.switchSpeaker(picker.value);replyRow.append(replyLabel,picker);mercCard.append(mercFace,replyRow,mercRole);
 const connection=el('div',undefined,'dialogue-connection'),turnLabel=el('span','Local conversation'),signal=el('span','↔','dialogue-signal');signal.setAttribute('aria-hidden','true');connection.append(signal,turnLabel);
 participants.append(npcCard,connection,mercCard);

 const transcript=el('section',undefined,'dialogue-transcript');transcript.setAttribute('aria-label','Conversation messages');transcript.tabIndex=0;
 const currentMessage=el('article',undefined,'dialogue-message dialogue-message-npc dialogue-message-current'),messageName=el('small',undefined,'dialogue-message-name');
 const speech=el('p',undefined,'dialogue-speech'),accessible=el('span',undefined,'dialogue-accessible'),visible=el('span');accessible.setAttribute('aria-live','polite');visible.setAttribute('aria-hidden','true');speech.append(accessible,visible);
 const playback=el('div',undefined,'dialogue-playback'),skip=button('Show full line',()=>player?.skip()),replay=button('Replay',()=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;if(player){player.context=context;player.replay(readSettings());}}),resume=button('Continue',()=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;if(player){player.context=context;player.resume();}}),playbackStatus=el('small');
 playbackStatus.setAttribute('role','status');playback.append(skip,replay,resume,playbackStatus);
 const response=el('p',undefined,'dialogue-result');currentMessage.append(messageName,speech,playback,response);
 const composer=el('section',undefined,'dialogue-composer'),composerTitle=el('h3','Choose a reply'),choices=el('div',undefined,'dialogue-choices'),notes=el('div');composerTitle.id='dialogue-reply-title';composer.setAttribute('aria-labelledby',composerTitle.id);composer.append(composerTitle,choices,notes);
 const last=el('details',undefined,'dialogue-last'),lastText=el('p');last.append(el('summary','Last saved response'),lastText);
 const prefsPane=el('details',undefined,'dialogue-options'),prefs=createDialoguePreferences({onChange:next=>{settings=next;if(next.dialogueVolume>0){context=dialogueAudio();if(player)player.context=context;}player?.settingsChanged(next);paintFrame(lastState);}});prefsPane.append(el('summary','Conversation options'),prefs.root);
 prefsPane.addEventListener('toggle',()=>{if(prefsPane.open)player?.pause();paintFrame(lastState);});
 const footer=el('footer',undefined,'dialogue-footer'),meta=el('small','Time paused · No AP cost'),exit=button('Leave',leave);footer.append(meta,exit);
 dialog.append(header,participants,transcript,composer,last,prefsPane,footer);

 function stopPresentation(){generation++;portrait?.dispose();portrait=null;portraitLoading=false;player?.dispose();player=null;lineKey=null;lastState=lastView=null;pendingReply=null;lastTurn=null;}
 function leave(){session.close();}
 function endSession(){stopPresentation();if(dialog.open)dialog.close();prefsPane.open=false;}
 const guard=e=>{if(session.busy&&!dialog.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}};
 for(const type of ['pointerdown','pointerup','click','contextmenu','keydown'])document.addEventListener(type,guard,true);
 dialog.addEventListener('cancel',e=>{e.preventDefault();leave();});
 for(const type of ['pointerdown','pointerup','click','contextmenu'])dialog.addEventListener(type,e=>{e.stopPropagation();if(type==='contextmenu')e.preventDefault();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();leave();}e.stopPropagation();});
 const hidden=()=>{if(document.hidden)player?.pause();};document.addEventListener('visibilitychange',hidden);

 function preparePortrait(npc){
  fallback.src=hudPortrait(npc);fallback.hidden=false;faceStatus.textContent='Preparing portrait…';
  if(portrait){portrait.setCharacter(npc);return;}if(portraitLoading)return;portraitLoading=true;const mine=generation;
  import('./dialogue-portrait.js').then(({DialoguePortrait})=>{if(mine!==generation||!session.open)return;
   portrait=new DialoguePortrait(face,{onStatus:status=>{if(status==='fallback')player?.skip();fallback.hidden=['ready','static'].includes(status);faceStatus.textContent=status==='loading'?'Preparing portrait…':status==='fallback'?'Static portrait':status==='static'?'Static portrait · mouth unavailable':'';}});return portrait.setCharacter(npc);
  }).catch(()=>{if(mine===generation){faceStatus.textContent='Static portrait';player?.skip();}}).finally(()=>{if(mine===generation)portraitLoading=false;});
 }

 function newLine(view){
  lineKey=view.presentationKey;accessible.textContent=view.line;messageName.textContent=view.npc.name;visible.replaceChildren();words=[];
  // Reserve bold widths before playback; message bubbles never reflow on a cue.
  for(const match of view.line.matchAll(/\S+|\s+/g)){
   if(/^\s+$/.test(match[0])){visible.append(document.createTextNode(match[0]));continue;}
   const wrap=el('span',undefined,'dialogue-word'),space=el('strong',match[0],'dialogue-word-space'),ink=el('span',match[0],'dialogue-word-ink');wrap.append(space,ink);visible.append(wrap);words.push({wrap,ink,c0:match.index,c1:match.index+match[0].length});
  }
  thread.line(lineKey,view.npc.name,view.line);updateTranscript(true);
  player??=new DialoguePerformance({context,onFrame:paintFrame});
  const lineIndex=Array.isArray(view.definition.nodes[view.nodeId]?.npc)?view.definition.nodes[view.nodeId].npc.indexOf(view.line):0;
  player.begin({key:lineKey,text:view.line,profile:resolvePresentation(view.npc,view.definition,view.nodeId,view.line,lineIndex),settings});if(document.hidden||prefsPane.open)player.pause();
 }

 function updateTurn(){
  const turn=dialogueTurn({status:lastState?.status,busy:session.busy,hasReplies:!!lastView?.choices.length});
  const reduced=settings.dialoguePortraits==='static'||!!motionPreference()?.matches,signature=JSON.stringify([turn,reduced]);if(signature===lastTurn)return;lastTurn=signature;
  npcCard.classList.toggle('is-active',turn.side==='npc');mercCard.classList.toggle('is-active',turn.side==='merc');
  npcRole.textContent=turn.npc;mercRole.textContent=turn.merc;turnLabel.textContent=turn.label;
  dialog.classList.toggle('dialogue-reduced-motion',reduced);
 }

 function paintFrame(frame){
  if(!frame||!session.open)return;lastState=frame;
  for(const w of words){const shown=!settings.dialogueTextAnimation||frame.revealed>w.c0||['done','fallback'].includes(frame.status);w.ink.style.visibility=shown?'visible':'hidden';const active=settings.dialogueTextAnimation&&frame.active&&w.c0<frame.active.c1&&w.c1>frame.active.c0;w.ink.classList.toggle('active',!!active);}
  const animate=settings.dialoguePortraits!=='static'&&!motionPreference()?.matches;portrait?.draw(animate?frame.opening:0);
  skip.hidden=['done','fallback','idle'].includes(frame.status);resume.hidden=frame.status!=='paused';replay.disabled=session.busy;resume.disabled=session.busy||prefsPane.open;
  const message=frame.error||(frame.status==='loading'?'Preparing voice; the full line is available.':frame.status==='paused'?'Paused · Continue or Replay when ready.':'');if(playbackStatus.textContent!==message)playbackStatus.textContent=message;
  updateTurn();
 }

 function updateTranscript(follow=false){
  const atEnd=transcript.scrollHeight-transcript.scrollTop-transcript.clientHeight<40,offset=transcript.scrollTop;
  transcript.replaceChildren();
  for(const entry of thread.entries){
   if(entry.side==='npc'&&entry.key===lineKey){transcript.append(currentMessage);continue;}
   const row=el('article',undefined,'dialogue-message dialogue-message-'+entry.side),name=el('small',entry.who,'dialogue-message-name'),text=el('p',entry.text,'dialogue-message-text');row.append(name,text);
   if(entry.side==='merc'){const status=el('small',messageStatus[entry.state],'dialogue-message-state');row.dataset.state=entry.state;row.append(status);}
   transcript.append(row);
  }
  // A long incoming message starts at its first line, not at its last word.
  // Follow only new messages and explicit replies, never individual word frames.
  if(follow){
   const latest=transcript.lastElementChild;
   if(latest&&latest.offsetHeight>transcript.clientHeight-32)transcript.scrollTop+=latest.getBoundingClientRect().top-transcript.getBoundingClientRect().top-16;
   else transcript.scrollTop=transcript.scrollHeight;
  }else transcript.scrollTop=atEnd?transcript.scrollHeight:offset;
 }

 async function sendReply(view,p,retry=false){
  if(session.busy)return;
  player?.pause();const mine=generation;
  if(retry)thread.retry(pendingReply);else pendingReply=thread.reply(view.speaker.name,p.choice.text).id;
  const id=pendingReply;updateTranscript(true);
  const accepted=await (retry?session.retry():session.choose(p.choice.id,p.token));
  if(mine!==generation||!session.open)return;
  thread.settle(id,accepted,!!session.pending);if(accepted||!session.pending)pendingReply=null;
  updateTranscript();updateTurn();
 }

 function render(){
  if(!session.open){endSession();return;}
  const focus=document.activeElement?.dataset?.choice,view=session.refresh(),{state,busy}=options.source();lastView=view;settings=readSettings();npcName.textContent=view.npc?.name||'Unavailable';
  if(!session.busy&&!session.pending&&thread.entries.find(e=>e.id===pendingReply)?.state==='unsaved'){thread.settle(pendingReply,false);pendingReply=null;updateTranscript();}
  if(!dialog.open){thread.clear();generation++;prefs.refresh();dialog.showModal();close.focus();if(view.npc)preparePortrait(view.npc);}
  if(view.ready.ok&&lineKey!==view.presentationKey)newLine(view);
  else if(!view.ready.ok){player?.skip();accessible.textContent=view.ready.reason;visible.textContent=view.ready.reason;messageName.textContent=view.npc?.name||'Conversation';words=[];if(!currentMessage.isConnected)transcript.append(currentMessage);}
  const receipt=view.receipt;response.hidden=!receipt;response.textContent=receipt?.roll?'Rolled '+receipt.roll+'; needed '+receipt.check.chance+' or less — '+receipt.outcome+(receipt.roll===1?' · Natural 1':receipt.roll===100?' · Natural 100':''):receipt?'Response remembered.':'';
  mercImage.src=view.speaker?hudPortrait(view.speaker):'';picker.replaceChildren();picker.disabled=session.busy;
  for(const u of state.units.filter(u=>u.team==='squad')){const ready=dialogueReadiness(state,view.npc,u,{busy}),o=el('option',u.name+(ready.ok?'':' — '+ready.reason));o.value=dialogueActorId(u);o.disabled=!ready.ok;picker.append(o);}picker.value=session.speakerId;
  choices.replaceChildren();notes.replaceChildren();
  for(const p of view.choices){
   const c=p.choice,row=el('div',undefined,'dialogue-choice'),b=button('',()=>sendReply(view,p));b.dataset.choice=c.id;b.disabled=session.busy;
   if(c.requires?.archetype){const badge=el('span',c.requires.archetype+(c.check?'':' · no roll'),'dialogue-badge');badge.style.backgroundColor=DIALOGUE_COLOURS[c.requires.archetype];b.append(badge);}b.append(el('span',c.text));
   const sendIcon=el('span','↵','dialogue-send-icon');sendIcon.setAttribute('aria-hidden','true');b.append(sendIcon);
   if(p.check){
    b.append(el('strong',(STAT_DEFINITIONS.find(([id])=>id===c.check.skill)?.[1]||c.check.skill)+' · '+p.check.chance+'%','dialogue-odds'));
    const details=el('details');details.append(el('summary','How this chance is calculated'),el('p','Skill '+p.check.skill+' · Minimum '+p.check.minimum+' · Difficulty '+p.check.difficulty+(p.check.modifiers.length?' · '+p.check.modifiers.map(m=>m.id.replace(/[_-]+/g,' ')+': '+(m.add>0?'+':'')+m.add).join(', '):'')+' · One attempt for the team.'));row.append(b,details);
   }else row.append(b);choices.append(row);
  }
  composerTitle.textContent=view.choices.length?'Choose a reply':'End of conversation';composerTitle.hidden=!view.choices.length;
  if(view.ready.ok&&!view.choices.length)notes.append(el('p','No further replies. You can leave whenever you are ready.','dialogue-meta'));
  last.hidden=!view.lastResponse;lastText.textContent=view.lastResponse?.response||'';
  for(const text of view.diagnostics)notes.append(el('p',text,'dialogue-error'));
  if(session.busy){player?.pause();notes.append(el('p','Saving the conversation…','dialogue-meta'));}
  if(session.error){
   const error=el('p',session.error,'dialogue-error');error.setAttribute('role','alert');notes.append(error);
   if(session.pending){const retry=button('Retry checkpoint',()=>sendReply(view,null,true));retry.disabled=session.busy;notes.append(retry);}
   if(/Another tab|latest checkpoint/i.test(session.error))notes.append(button('Load latest checkpoint',()=>{leave();options.onLoadLatest?.();}));
  }
  composer.hidden=view.ready.ok&&!view.choices.length&&!view.diagnostics.length&&!session.busy&&!session.error;
  dialog.classList.toggle('dialogue-thread-complete',composer.hidden);
  // A removed choice never hands a held Space/Enter to the next choice.
  if(focus){const next=[...choices.querySelectorAll('[data-choice]')].find(b=>b.dataset.choice===focus);(next&&!next.disabled?next:close).focus();}
  paintFrame(lastState);updateTurn();
 }
 const cleanup=()=>{endSession();document.removeEventListener('visibilitychange',hidden);for(const type of ['pointerdown','pointerup','click','contextmenu','keydown'])document.removeEventListener(type,guard,true);};
 addEventListener('pagehide',cleanup,{once:true});
 return {get open(){return session.open;},get busy(){return session.busy;},session,show:(npc,speaker)=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;session.show(npc,speaker);},close:leave,refresh:render,get presentationResources(){return {audio:player?.resources||null,portrait:portrait?.resources||null};}};
}

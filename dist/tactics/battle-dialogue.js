import {STAT_DEFINITIONS} from './character-stats.js';
import {DialogueSession} from './dialogue-session.js';
import {DIALOGUE_COLOURS,dialogueReadiness} from './dialogue-rules.js';
import {dialogueActorId} from './dialogue-state.js';
import {hudPortrait} from './battle-hud-model.js';
import {readSettings,motionPreference} from './settings-3d.js';
import {createDialoguePreferences} from './dialogue-preferences.js';
import {resolvePresentation} from './dialogue-presentation-manifest.js';
import {DialoguePerformance,dialogueAudio} from './dialogue-performance.js';
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
export function createBattleDialogue(options){
 const css=el('link');css.rel='stylesheet';css.href=new URL('./battle-dialogue.css',import.meta.url).href;document.head.append(css);
 const dialog=el('dialog',undefined,'battle-dialogue');dialog.id='dialogue-popup';dialog.setAttribute('aria-labelledby','dialogue-title');document.body.append(dialog);
 const session=new DialogueSession({...options,onChange:()=>{render();options.onChange?.();}});
 let player,portrait,portraitLoading=false,generation=0,lineKey=null,words=[],history=[],lastState,settings=readSettings(),context;
 const header=el('header'),title=el('h2','Conversation');title.id='dialogue-title';const close=button('×',leave);close.setAttribute('aria-label','Leave dialogue');header.append(title,close);
 const layout=el('div',undefined,'dialogue-layout'),face=el('div',undefined,'dialogue-face'),fallback=el('img'),faceStatus=el('small');fallback.alt='';face.append(fallback,faceStatus);
 const body=el('section',undefined,'dialogue-body'),npcName=el('h3'),speech=el('p',undefined,'dialogue-speech'),accessible=el('span',undefined,'dialogue-accessible'),visible=el('span');accessible.setAttribute('aria-live','polite');visible.setAttribute('aria-hidden','true');speech.append(accessible,visible);
 const playback=el('div',undefined,'dialogue-playback'),skip=button('Show full line',()=>player?.skip()),replay=button('Replay',()=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;if(player){player.context=context;player.replay(readSettings());}}),resume=button('Continue',()=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;if(player){player.context=context;player.resume();}}),playbackStatus=el('small');playbackStatus.setAttribute('role','status');playback.append(skip,replay,resume,playbackStatus);
 const response=el('p',undefined,'dialogue-result'),replyRow=el('label',undefined,'dialogue-reply'),mercImage=el('img'),replyLabel=el('span','Replying as'),picker=el('select');picker.id='dialogue-speaker';picker.setAttribute('aria-label','Replying as');picker.onchange=()=>session.switchSpeaker(picker.value);mercImage.alt='';replyRow.append(mercImage,replyLabel,picker);
 const choices=el('div',undefined,'dialogue-choices'),notes=el('div'),last=el('details'),lastText=el('p');last.append(el('summary','Last saved response'),lastText);
 const historyView=el('details'),historyBody=el('div');historyView.append(el('summary','Conversation history'),historyBody);
 body.append(npcName,speech,playback,response,replyRow,choices,notes,last,historyView);layout.append(face,body);
 const prefsPane=el('details',undefined,'dialogue-options'),prefs=createDialoguePreferences({onChange:next=>{settings=next;if(next.dialogueVolume>0){context=dialogueAudio();if(player)player.context=context;}player?.settingsChanged(next);paintFrame(lastState);}});prefsPane.append(el('summary','Conversation options'),prefs.root);
 prefsPane.addEventListener('toggle',()=>{if(prefsPane.open)player?.pause();paintFrame(lastState);});
 const footer=el('footer'),meta=el('small','Time paused · No AP cost'),exit=button('Leave',leave);footer.append(meta,exit);dialog.append(header,layout,prefsPane,footer);
 function stopPresentation(){generation++;portrait?.dispose();portrait=null;portraitLoading=false;player?.dispose();player=null;lineKey=null;lastState=null;}
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
  lineKey=view.presentationKey;accessible.textContent=view.line;visible.replaceChildren();words=[];
  // Each word reserves its bold width before reveal; hidden text still lays out normally.
  for(const match of view.line.matchAll(/\S+|\s+/g)){if(/^\s+$/.test(match[0])){visible.append(document.createTextNode(match[0]));continue;}const wrap=el('span',undefined,'dialogue-word'),space=el('strong',match[0],'dialogue-word-space'),ink=el('span',match[0],'dialogue-word-ink');wrap.append(space,ink);visible.append(wrap);words.push({wrap,ink,c0:match.index,c1:match.index+match[0].length});}
  history.push({who:view.npc.name,text:view.line});history=history.slice(-80);updateHistory();
  player??=new DialoguePerformance({context,onFrame:paintFrame});
  const lineIndex=Array.isArray(view.definition.nodes[view.nodeId]?.npc)?view.definition.nodes[view.nodeId].npc.indexOf(view.line):0;
  player.begin({key:lineKey,text:view.line,profile:resolvePresentation(view.npc,view.definition,view.nodeId,view.line,lineIndex),settings});if(document.hidden||prefsPane.open)player.pause();
 }
 function paintFrame(frame){if(!frame||!session.open)return;lastState=frame;for(const w of words){const shown=!settings.dialogueTextAnimation||frame.revealed>w.c0||['done','fallback'].includes(frame.status);w.ink.style.visibility=shown?'visible':'hidden';const active=settings.dialogueTextAnimation&&frame.active&&w.c0<frame.active.c1&&w.c1>frame.active.c0;w.ink.classList.toggle('active',!!active);}
  const animate=settings.dialoguePortraits!=='static'&&!motionPreference()?.matches;portrait?.draw(animate?frame.opening:0);
  skip.hidden=['done','fallback','idle'].includes(frame.status);resume.hidden=frame.status!=='paused';replay.disabled=session.busy;resume.disabled=session.busy||prefsPane.open;
  const message=frame.error||(frame.status==='loading'?'Preparing voice; the full line is available.':frame.status==='paused'?'Paused · Continue or Replay when ready.':'');if(playbackStatus.textContent!==message)playbackStatus.textContent=message;
 }
 function updateHistory(){historyBody.replaceChildren();for(const entry of history){const p=el('p');p.append(el('strong',entry.who+': '),document.createTextNode(entry.text));historyBody.append(p);}historyView.hidden=history.length<2;}
 function render(){
  if(!session.open){endSession();return;}
  const focus=document.activeElement?.dataset?.choice,view=session.refresh(),{state,busy}=options.source();settings=readSettings();npcName.textContent=view.npc?.name||'Unavailable';
  if(!dialog.open){history=[];generation++;prefs.refresh();dialog.showModal();close.focus();if(view.npc)preparePortrait(view.npc);}
  if(view.ready.ok&&lineKey!==view.presentationKey)newLine(view);
  else if(!view.ready.ok){player?.skip();accessible.textContent=view.ready.reason;visible.textContent=view.ready.reason;words=[];}
  const receipt=view.receipt;response.hidden=!receipt;response.textContent=receipt?.roll?'Rolled '+receipt.roll+'; needed '+receipt.check.chance+' or less — '+receipt.outcome+(receipt.roll===1?' · Natural 1':receipt.roll===100?' · Natural 100':''):receipt?'Response remembered.':'';
  mercImage.src=view.speaker?hudPortrait(view.speaker):'';picker.replaceChildren();picker.disabled=session.busy;
  for(const u of state.units.filter(u=>u.team==='squad')){const ready=dialogueReadiness(state,view.npc,u,{busy}),o=el('option',u.name+(ready.ok?'':' — '+ready.reason));o.value=dialogueActorId(u);o.disabled=!ready.ok;picker.append(o);}picker.value=session.speakerId;
  choices.replaceChildren();notes.replaceChildren();
  for(const p of view.choices){const c=p.choice,row=el('div',undefined,'dialogue-choice'),b=button('',async()=>{player?.pause();const before=history.slice();history.push({who:view.speaker.name,text:c.text});if(!await session.choose(c.id,p.token)){history=before;updateHistory();}});b.dataset.choice=c.id;b.disabled=session.busy;
   if(c.requires?.archetype){const badge=el('span',c.requires.archetype+(c.check?'':' · no roll'),'dialogue-badge');badge.style.backgroundColor=DIALOGUE_COLOURS[c.requires.archetype];b.append(badge);}b.append(el('span',c.text));
   if(p.check){b.append(el('strong',(STAT_DEFINITIONS.find(([id])=>id===c.check.skill)?.[1]||c.check.skill)+' · '+p.check.chance+'%','dialogue-odds'));const details=el('details');details.append(el('summary','How this chance is calculated'),el('p','Skill '+p.check.skill+' · Minimum '+p.check.minimum+' · Difficulty '+p.check.difficulty+(p.check.modifiers.length?' · '+p.check.modifiers.map(m=>m.id.replace(/[_-]+/g,' ')+': '+(m.add>0?'+':'')+m.add).join(', '):'')+' · One attempt for the team.'));row.append(b,details);}else row.append(b);choices.append(row);
  }
  if(view.ready.ok&&!view.choices.length)notes.append(el('p','No further replies. You can leave whenever you are ready.','dialogue-meta'));
  last.hidden=!view.lastResponse;lastText.textContent=view.lastResponse?.response||'';
  for(const text of view.diagnostics)notes.append(el('p',text,'dialogue-error'));
  if(session.busy){player?.pause();notes.append(el('p','Saving the conversation…','dialogue-meta'));}
  if(session.error){const error=el('p',session.error,'dialogue-error');error.setAttribute('role','alert');notes.append(error);if(session.pending){const retry=button('Retry checkpoint',()=>session.retry());retry.disabled=session.busy;notes.append(retry);}if(/Another tab|latest checkpoint/i.test(session.error))notes.append(button('Load latest checkpoint',()=>{leave();options.onLoadLatest?.();}));}
  // A removed choice never hands a held Space/Enter to the next choice.
  if(focus){const next=[...choices.querySelectorAll('[data-choice]')].find(b=>b.dataset.choice===focus);(next&&!next.disabled?next:close).focus();}
  paintFrame(lastState);
 }
 const cleanup=()=>{endSession();document.removeEventListener('visibilitychange',hidden);for(const type of ['pointerdown','pointerup','click','contextmenu','keydown'])document.removeEventListener(type,guard,true);};
 addEventListener('pagehide',cleanup,{once:true});
 return {get open(){return session.open;},get busy(){return session.busy;},session,show:(npc,speaker)=>{context=readSettings().dialogueVolume>0?dialogueAudio():null;session.show(npc,speaker);},close:leave,refresh:render,get presentationResources(){return {audio:player?.resources||null,portrait:portrait?.resources||null};}};
}

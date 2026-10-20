import {STAT_DEFINITIONS} from './character-stats.js';
import {DialogueSession} from './dialogue-session.js';
import {DIALOGUE_COLOURS,dialogueReadiness} from './dialogue-rules.js';
import {dialogueActorId} from './dialogue-state.js';
import {hudPortrait} from './battle-hud-model.js';
const el=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function createBattleDialogue(options){
 const css=el('link');css.rel='stylesheet';css.href=new URL('./battle-dialogue.css',import.meta.url).href;document.head.append(css);
 const dialog=el('dialog',undefined,'battle-dialogue');dialog.id='dialogue-popup';dialog.setAttribute('aria-labelledby','dialogue-title');document.body.append(dialog);
 const session=new DialogueSession({...options,onChange:()=>{render();options.onChange?.();}});
 // Leave remains available during storage, but closing a pending checkpoint must
 // not let a world/inventory command race the candidate that is being saved.
 for(const type of ['pointerdown','pointerup','click','contextmenu','keydown'])document.addEventListener(type,e=>{if(session.busy&&!dialog.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
 function leave(){session.close();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();leave();});
 for(const type of ['pointerdown','pointerup','click','contextmenu'])dialog.addEventListener(type,e=>{e.stopPropagation();if(type==='contextmenu')e.preventDefault();});
 dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();leave();}e.stopPropagation();});
 function portrait(u){const image=el('img');image.src=hudPortrait(u);image.alt='';image.width=64;image.height=76;return image;}
 function render(){
  if(!session.open){if(dialog.open)dialog.close();return;}
  const focus=document.activeElement?.dataset?.choice,view=session.refresh(),{state,busy}=options.source();dialog.replaceChildren();
  const header=el('header'),title=el('h2','Conversation');title.id='dialogue-title';const close=el('button','×');close.type='button';close.setAttribute('aria-label','Leave dialogue');close.onclick=leave;header.append(title,close);dialog.append(header);
  const people=el('div',undefined,'dialogue-people');for(const [label,u]of [['Speaking',view.speaker],['Listening',view.npc]]){const person=el('div');if(u)person.append(portrait(u));person.append(el('small',label),el('strong',u?.name||'Unavailable'));people.append(person);}dialog.append(people);
  const label=el('label','Speaker '),picker=el('select');picker.id='dialogue-speaker';picker.setAttribute('aria-label','Speaker');picker.disabled=session.busy;
  for(const u of state.units.filter(u=>u.team==='squad')){const ready=dialogueReadiness(state,view.npc,u,{busy}),o=el('option',u.name+(ready.ok?'':' — '+ready.reason));o.value=dialogueActorId(u);o.disabled=!ready.ok;picker.append(o);}picker.value=session.speakerId;picker.onchange=()=>session.switchSpeaker(picker.value);label.append(picker);dialog.append(label);
  dialog.append(el('p','Time paused · No AP cost · Replies use this merc’s skills and personality.', 'dialogue-meta'));
  const speech=el('p',view.ready.ok?view.line:view.ready.reason,'dialogue-speech');speech.setAttribute('aria-live','polite');dialog.append(speech);
  if(view.receipt){const r=view.receipt;dialog.append(el('p',r.roll?'Rolled '+r.roll+'; needed '+r.check.chance+' or less — '+r.outcome+(r.roll===1?' · Natural 1':r.roll===100?' · Natural 100':''):'Response remembered.','dialogue-result'));}
  if(view.ready.ok){const choices=el('div',undefined,'dialogue-choices');
   for(const p of view.choices){const c=p.choice,button=el('button');button.type='button';button.dataset.choice=c.id;button.disabled=session.busy;
    if(c.requires?.archetype){const badge=el('span',c.requires.archetype+(c.check?'':' · no roll'),'dialogue-badge');badge.style.backgroundColor=DIALOGUE_COLOURS[c.requires.archetype];button.append(badge);}
    button.append(el('span',c.text));if(p.check){button.append(el('strong',(STAT_DEFINITIONS.find(([id])=>id===c.check.skill)?.[1]||c.check.skill)+' · '+p.check.chance+'%','dialogue-odds'));button.append(el('small','Skill '+p.check.skill+' · Minimum '+p.check.minimum+' · Difficulty '+p.check.difficulty+(p.check.modifiers.length?' · '+p.check.modifiers.map(m=>m.id.replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase())+': '+(m.add>0?'+':'')+m.add).join(', '):'')+' · One attempt for the team.'));}
    button.onclick=()=>session.choose(c.id,p.token);choices.append(button);
   }dialog.append(choices);if(!view.choices.length)dialog.append(el('p','No further replies available for this speaker. You can always leave.','dialogue-meta'));
   if(view.lastResponse){const details=el('details'),summary=el('summary','Last response');details.append(summary,el('p',view.lastResponse.response));dialog.append(details);}
  }
  for(const text of view.diagnostics)dialog.append(el('p',text,'dialogue-error'));
  if(session.busy)dialog.append(el('p','Saving the conversation…','dialogue-meta'));
  if(session.error){const error=el('p',session.error,'dialogue-error');error.setAttribute('role','alert');dialog.append(error);if(session.pending){const retry=el('button','Retry checkpoint');retry.disabled=session.busy;retry.onclick=()=>session.retry();dialog.append(retry);}if(/Another tab|latest checkpoint/i.test(session.error)){const latest=el('button','Load latest checkpoint');latest.onclick=()=>{leave();options.onLoadLatest?.();};dialog.append(latest);}}
  const footer=el('footer'),exit=el('button','Leave');exit.onclick=leave;footer.append(exit);dialog.append(footer);
  if(!dialog.open){dialog.showModal();close.focus();}else if(focus){const button=[...dialog.querySelectorAll('[data-choice]')].find(b=>b.dataset.choice===focus);(button&&!button.disabled?button:close).focus();}
 }
 return {get open(){return session.open;},get busy(){return session.busy;},session,show:(npc,speaker)=>session.show(npc,speaker),close:leave,refresh:render};
}

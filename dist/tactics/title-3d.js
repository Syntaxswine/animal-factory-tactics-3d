import {createDialoguePreferences} from './dialogue-preferences.js';
import {createSoundPreferences} from './sound-preferences.js';
import {createQuickPlayMenu} from './quickplay-menu.js';
import {createSavePanel} from './save-panel.js';
const saves=createSavePanel({onLoad:async id=>{location.href=new URL('battle-3d.html?load='+encodeURIComponent(id),document.baseURI).href;}});
import {readSettings,saveSettings} from './settings-3d.js';
const $=id=>document.getElementById(id),panel=$('panel');
const quickplay=createQuickPlayMenu($('quickplay-panel'),{onLaunch:team=>{saveSettings({...readSettings(),quickPlayTeam:team});const url=new URL('battle-3d.html',document.baseURI);url.searchParams.set('team',team.join(','));location.href=url.href;}});
const dialoguePreferences=createDialoguePreferences();$('options-form').insertBefore(dialoguePreferences.root,$('options-form').querySelector('button[type=submit]'));
const soundPreferences=createSoundPreferences();$('options-form').insertBefore(soundPreferences.root,dialoguePreferences.root);
function summary(){const s=readSettings();$('preference-summary').textContent=`Quick Fight: ${s.difficulty==='easy'?'Easy':'Standard'} · ${s.motion==='system'?'Device motion preference':s.motion==='reduced'?'Reduced motion':'Full motion'}`;}
summary();
const titles={quickplay:['Quick Fight / Factory test','Choose your four'],campaign:['Story mode','Campaign'],saves:['Game progress','Save / Load'],options:['Make it yours','Options']};
for(const button of document.querySelectorAll('[data-panel]'))button.onclick=()=>{const name=button.dataset.panel;if(name==='saves'){saves.show();return;}for(const id of Object.keys(titles))$(id+'-panel').hidden=id!==name;panel.classList.toggle('quickplay-open',name==='quickplay');[$('panel-kicker').textContent,$('panel-title').textContent]=titles[name];if(name==='quickplay')quickplay.setTeam(readSettings().quickPlayTeam);if(name==='options'){dialoguePreferences.refresh();soundPreferences.refresh();const s=readSettings();$('option-difficulty').value=s.difficulty;$('option-motion').value=s.motion;$('option-blood').value=s.blood;$('options-status').textContent='';}panel.showModal();};
$('options-form').onsubmit=e=>{e.preventDefault();const ok=saveSettings({...readSettings(),...dialoguePreferences.value(),...soundPreferences.value(),difficulty:$('option-difficulty').value,motion:$('option-motion').value,blood:$('option-blood').value});$('options-status').textContent=ok?'Options saved. Sound and conversation preferences apply immediately; difficulty applies to your next Quick Fight.':'Your browser could not save options. Allow site storage and try again.';summary();};
panel.addEventListener('click',e=>{if(e.target!==panel)return;const b=panel.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)panel.close();});
import('./title-3d-scene.js').then(m=>m.showTitleScene($('diorama'),$('scene-status'))).catch(()=>{$('scene-status').textContent='';});

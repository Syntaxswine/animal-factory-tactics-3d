import {createSavePanel} from './save-panel.js';
const saves=createSavePanel({onLoad:async id=>{location.href=new URL('battle-3d.html?load='+encodeURIComponent(id),document.baseURI).href;}});
import {readSettings,saveSettings} from './settings-3d.js';
const $=id=>document.getElementById(id),panel=$('panel');
function summary(){const s=readSettings();$('preference-summary').textContent=`Quick Fight: ${s.difficulty==='easy'?'Easy':'Standard'} · ${s.motion==='system'?'Device motion preference':s.motion==='reduced'?'Reduced motion':'Full motion'}`;}
summary();
const titles={campaign:['Story mode','Campaign'],saves:['Game progress','Save / Load'],options:['Make it yours','Options']};
for(const button of document.querySelectorAll('[data-panel]'))button.onclick=()=>{const name=button.dataset.panel;if(name==='saves'){saves.show();return;}for(const id of Object.keys(titles))$(id+'-panel').hidden=id!==name;[$('panel-kicker').textContent,$('panel-title').textContent]=titles[name];if(name==='options'){const s=readSettings();$('option-difficulty').value=s.difficulty;$('option-motion').value=s.motion;$('options-status').textContent='';}panel.showModal();};
$('options-form').onsubmit=e=>{e.preventDefault();const ok=saveSettings({difficulty:$('option-difficulty').value,motion:$('option-motion').value});$('options-status').textContent=ok?'Options saved. They apply to your next Quick Fight.':'Your browser could not save options. Allow site storage and try again.';summary();};
panel.addEventListener('click',e=>{if(e.target!==panel)return;const b=panel.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)panel.close();});
import('./title-3d-scene.js').then(m=>m.showTitleScene($('diorama'),$('scene-status'))).catch(()=>{$('scene-status').textContent='';});

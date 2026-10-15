import {HANDLER_LINE,LINE_SPEECH} from './ambush.js';

// User-selected Babble Lab take, 2026-10-15. The WAV starts at the first
// syllable; the audition's one-second scene preroll is not part of this clip.
export const HEN_VOICE=Object.freeze({
 src:new URL('./audio/bright-hen.wav',import.meta.url).href,
 start:LINE_SPEECH.start,duration:2.93,text:HANDLER_LINE,
 label:'Bright hen · placeholder voice',volume:.7,
});

// One media element follows the existing visual timeline. No audio synthesis,
// extra animation loop or changes to the approved sprite frames are needed.
export function createIntroVoice(audio,{track=HEN_VOICE,onUnavailable=()=>{},onAvailable=()=>{}}={}){
 let active=false,attempt=0,disposed=false;
 audio.src=track.src;audio.preload='auto';audio.volume=track.volume;
 audio.preservesPitch=true;
 const failed=()=>onUnavailable('Voice unavailable; the animation can still play.');
 audio.addEventListener('error',failed);
 function sync(t,{playing=false,rate=1,muted=false}={}){
  if(disposed)return;
  audio.muted=muted;audio.playbackRate=rate;
  const wanted=playing&&t>=track.start&&t<track.start+track.duration;
  if(!wanted){
   if(active||!audio.paused){attempt++;audio.pause();}
   active=false;return;
  }
  const offset=t-track.start;
  if(!active){
   active=true;const token=++attempt;
   audio.currentTime=offset;
   try{
    Promise.resolve(audio.play()).then(()=>{
     // A pending play may settle after a pause, seek away or page exit.
     if(!active||disposed)audio.pause();
     else if(token===attempt)onAvailable();
    },error=>{
     if(token===attempt&&active&&error?.name!=='AbortError')failed();
    });
   }catch{failed();}
  }else if(!audio.paused&&Math.abs(audio.currentTime-offset)>.12){
   // Recover from buffering or a long render frame without seeking every tick.
   audio.currentTime=offset;
  }
 }
 return {sync,dispose(){
  disposed=true;active=false;attempt++;audio.pause();
  audio.removeEventListener('error',failed);
 }};
}

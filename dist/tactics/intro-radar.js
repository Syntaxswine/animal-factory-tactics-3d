// A separate radar insert: deterministic sweep/contact timing for the edit.
export function createIntroRadar(canvas){
 const c=canvas.getContext('2d');canvas.width=canvas.height=640;
 function update(time){const t=Math.max(0,time-12);c.fillStyle='#131f17';c.fillRect(0,0,640,640);c.save();c.translate(320,320);c.strokeStyle='#3d6441';c.lineWidth=2;
  for(const r of [66,132,198,264]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}for(const a of [0,Math.PI/2]){c.save();c.rotate(a);c.beginPath();c.moveTo(-264,0);c.lineTo(264,0);c.stroke();c.restore();}
  const angle=-.9+t*.9;for(let i=0;i<36;i++){c.strokeStyle='rgba(115,231,129,'+(.3*(1-i/36))+')';c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(angle-i*.012)*264,Math.sin(angle-i*.012)*264);c.stroke();}
  if(t>.55){c.fillStyle='#c2ffc2';c.shadowColor='#9cff9a';c.shadowBlur=18;c.beginPath();c.arc(175-t*7,-56+t*2,6,0,7);c.fill();c.shadowBlur=0;c.font='18px monospace';c.fillText('AIR CONTACT',42,-99);c.strokeStyle='#bbfbc1';c.beginPath();c.moveTo(160,-60);c.lineTo(126,-86);c.stroke();}c.restore();c.fillStyle='#b8cbb0';c.font='20px monospace';c.fillText('PLATEAU AIR DEFENCE',25,36);c.font='16px monospace';c.fillText('SEARCH / TRACK',25,608);
 }
 return {update,dispose(){canvas.width=canvas.height=1;}};
}

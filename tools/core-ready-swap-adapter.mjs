// Keep the authored two-AP ready-weapon swap reproducible in the pinned core.
export const readySwapOverrides={'engine.js':'Charge two combat AP to draw a ready weapon; backpack draws remain three AP.'};
export function adaptCoreReadySwap(name,data){
 if(name!=='engine.js')return data;
 let s=data.toString();
 const anchor='export function equip(s,u,id,slot=1){',cost='cost=stored?3:0;';
 if(s.split(anchor).length!==2||s.split(cost).length!==2)throw Error('Ready-swap adapter anchor changed');
 s=s.replace(anchor,"export const READY_SWAP_AP=2;\nexport function equipCost(s,u,id){return !combatCosts(s)||id==='hands'||u.weapon===id?0:!u.slots.includes(id)?3:READY_SWAP_AP;}\n"+anchor).replace(cost,'cost=equipCost(s,u,id);');
 return Buffer.from(s);
}

// Skin holds: a worker's skin put back in the order it was taken, whatever order its controllers are disposed in.
//
// A controller that rewrites a worker's skin while it runs (the ladder motion's climbing weights, the idle's neck bone and
// cloth weights) saves it when it is made and puts back what it saved when it is disposed. Two of them on one worker
// therefore compose only last in, first out: dispose the earlier one first and it puts back the skin from before both,
// pulling the later one's weights out from under it while it still runs; then the later one puts back what it saved,
// which is the earlier one's skin, and that stays for good.
//
// A hold takes the restores out of the hands of the dispose order. Each controller takes one when it is made (the newest
// on top) and releases it when it is disposed. A released hold puts its skin back only once every hold taken after it has
// been released too, so the restores always run newest first; until then the skin stays as the later controllers built
// on it. A controller that would rewrite the skin while a later one holds it (the ladder's apply under an idle) refuses
// instead.
const HOLDS=new WeakMap();
export function holdSkin(worker,owner,restore){
 if(typeof restore!=='function')throw Error('A skin hold needs a function that puts the skin back');
 let stack=HOLDS.get(worker);if(!stack)HOLDS.set(worker,stack=[]);
 const hold={owner,restore,released:false};stack.push(hold);
 return {
  owner,
  get released(){return hold.released;},
  // no hold taken after this one is still on the worker, live or waiting to put its skin back
  get top(){return stack.at(-1)===hold;},
  // the controllers holding the skin above this one, newest first
  above(){const i=stack.indexOf(hold);return i<0?[]:stack.slice(i+1).reverse().map(h=>h.owner);},
  // put the skin back now if this is the newest hold, and with it every released hold under it; otherwise when the holds
  // above are released. A restore that throws does not stop the ones under it; its error is thrown afterwards.
  release(){if(hold.released)return;hold.released=true;let failure=null;
   while(stack.length&&stack.at(-1).released){const h=stack.pop();try{h.restore();}catch(error){failure??=error;}}
   if(!stack.length&&HOLDS.get(worker)===stack)HOLDS.delete(worker);if(failure)throw failure;}
 };
}
// The controllers holding a worker's skin, oldest first, and whether each has been released (is waiting to put it back).
export const skinHolds=worker=>(HOLDS.get(worker)||[]).map(h=>({owner:h.owner,released:h.released}));

// Diagnostic-only counters, separated from low-overhead timing runs.
let current=null;const totals={};const stack=[];
export function profileCount(name){for(const table of current?[totals,current]:[totals]){const row=table[name]??={count:0,total:0,self:0,max:0};row.count++;}}
export function profileCall(name,fn,args){const start=performance.now(),entry={children:0};stack.push(entry);try{return fn(...args);}finally{const elapsed=performance.now()-start;stack.pop();if(stack.length)stack.at(-1).children+=elapsed;for(const table of current?[totals,current]:[totals]){const row=table[name]??={count:0,total:0,self:0,max:0};row.count++;row.total+=elapsed;row.self+=elapsed-entry.children;row.max=Math.max(row.max,elapsed);}}}
globalThis.cpuDiagnostic={begin(){current={};},end(){const result=current;current=null;return result;},report(){return totals;}};

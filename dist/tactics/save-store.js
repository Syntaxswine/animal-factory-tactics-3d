export const SAVE_SLOTS=[['slot-1','Slot 1'],['slot-2','Slot 2'],['slot-3','Slot 3'],['quick','Quicksave'],['auto','Autosave']];
const valid=id=>{if(!SAVE_SLOTS.some(([key])=>key===id))throw Error('Choose a valid save slot.');};
const DB='animal-factory-tactics-3d-saves-v1',TABLE='saves';
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(TABLE,{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Browser storage is unavailable.'));r.onblocked=()=>reject(Error('Close other game tabs and try again.'));});}
async function transaction(mode,work){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(TABLE,mode),req=work(tx.objectStore(TABLE));let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error||Error('Could not write the save.'));tx.onabort=()=>reject(tx.error||Error('Save cancelled.'));});}finally{db.close();}}
export const listSaves=()=>transaction('readonly',s=>s.getAll());
export const getSave=id=>{valid(id);return transaction('readonly',s=>s.get(id));};
export const putSave=(id,record)=>{valid(id);return transaction('readwrite',s=>s.put({...record,id}));};

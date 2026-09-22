const KEY='animal-factory-tactics-3d:options:v1';
export function normalizeSettings(value){return {difficulty:['easy','standard'].includes(value?.difficulty)?value.difficulty:'easy',motion:['system','reduced','full'].includes(value?.motion)?value.motion:'system'};}
export function readSettings(){try{return normalizeSettings(JSON.parse(localStorage.getItem(KEY)));}catch{return normalizeSettings(null);}}
export function saveSettings(value){try{localStorage.setItem(KEY,JSON.stringify(normalizeSettings(value)));return true;}catch{return false;}}
export function motionPreference(){const {motion}=readSettings();return motion==='system'?globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'):{matches:motion==='reduced'};}

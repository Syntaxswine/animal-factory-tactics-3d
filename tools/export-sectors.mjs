import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {exportSectors} from './sector-authoring.mjs';
const source=process.env.AFT_MAP_LIBRARY||fileURLToPath(new URL('../../sectors/',import.meta.url)),runtime=fileURLToPath(new URL('../dist/tactics/sector-library/',import.meta.url));
if(fs.existsSync(source))console.log('Exported '+exportSectors(source,runtime).length+' sector configurations from organized authoring folders.');
else console.log('Organized authoring folders unavailable; using committed sector export.');

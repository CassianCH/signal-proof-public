import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {collectCommitments} from '../lib/commitments.js';
const source=process.env.SOURCE_WORKER_URL;
if(!source||new URL(source).protocol!=='https:')throw Error('Set HTTPS SOURCE_WORKER_URL');
const trust={config:JSON.parse(readFileSync('config.json','utf8')),key:readFileSync('trust/public-key.txt','utf8').trim(),root:readFileSync('trust/freetsa-root.pem','utf8')};
async function fetchJson(path){
 for(let i=0;i<6;i++)try{
  const r=await fetch(source.replace(/\/$/,'')+path,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Source HTTP '+r.status+' at '+path);return r.json();
 }catch(error){if(i===5)throw error;await new Promise(resolve=>setTimeout(resolve,5000));}
}
const items=await collectCommitments(JSON.parse(readFileSync('data/commitments.json','utf8')),trust,fetchJson);
writeFileSync('data/commitments.json.tmp',JSON.stringify(items,null,2)+'\n');renameSync('data/commitments.json.tmp','data/commitments.json');
console.log(JSON.stringify({archived_commitments:items.length}));

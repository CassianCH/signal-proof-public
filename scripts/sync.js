import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {collectReleased} from '../lib/archive.js';
const config=JSON.parse(readFileSync('config.json','utf8'));
const source=process.env.SOURCE_WORKER_URL;
if(!source || new URL(source).protocol!=='https:')throw Error('Set SOURCE_WORKER_URL to the existing HTTPS Worker base URL');
const trust={config,key:readFileSync('trust/public-key.txt','utf8').trim(),root:readFileSync('trust/freetsa-root.pem','utf8')};
const existing=JSON.parse(readFileSync('data/records.json','utf8'));
async function fetchJson(path){
 for(let attempt=0;attempt<6;attempt++){
   try{
     const response=await fetch(source.replace(/\/$/,'')+path,{signal:AbortSignal.timeout(20000)});
     if(!response.ok)throw Error('Worker HTTP '+response.status+' at '+path);
     return await response.json();
   }catch(error){
     if(attempt===5)throw error;
     await new Promise(resolve=>setTimeout(resolve,5000));
   }
 }
}
const result=await collectReleased(existing,trust,fetchJson);
for(const [path,value] of [['data/records.json',result.records],['data/manifest.json',result.manifest]]){
 writeFileSync(path+'.tmp',JSON.stringify(value,null,2)+'\n'); renameSync(path+'.tmp',path);
}
console.log(JSON.stringify({archived_records:result.records.length,new_records:result.records.length-existing.length}));

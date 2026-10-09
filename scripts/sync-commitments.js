import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {collectCommitments} from '../lib/commitments.js';
import {sourceClient,actionMask} from './source.js';
const fetchJson=sourceClient(process.env.SOURCE_URL,{mask:actionMask});
const trust={config:JSON.parse(readFileSync('config.json','utf8')),key:readFileSync('trust/public-key.txt','utf8').trim(),root:readFileSync('trust/freetsa-root.pem','utf8')};
const items=await collectCommitments(JSON.parse(readFileSync('data/commitments.json','utf8')),trust,fetchJson);
writeFileSync('data/commitments.json.tmp',JSON.stringify(items,null,2)+'\n');renameSync('data/commitments.json.tmp','data/commitments.json');
console.log(JSON.stringify({archived_commitments:items.length}));

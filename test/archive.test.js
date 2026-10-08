import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectReleased,verifyArchive,verifyRecord,ZERO} from '../lib/archive.js';
const config=JSON.parse(readFileSync(new URL('../config.json',import.meta.url),'utf8'));
const trust={config,key:readFileSync(new URL('../trust/public-key.txt',import.meta.url),'utf8').trim(),root:readFileSync(new URL('../trust/freetsa-root.pem',import.meta.url),'utf8')};
test('Pinned empty archive is explicit, not a verified signal',async()=>{
 const result=await verifyArchive([],trust);assert.equal(result.verified_records,0);assert.equal(result.chain_hash,ZERO);
});
test('Tampered trust roots and keys rejected',async()=>{
 await assert.rejects(verifyArchive([],{...trust,root:trust.root+'x'}));
 await assert.rejects(verifyArchive([],{...trust,key:'AAAA'}));
});
test('Empty public source remains empty without reading ingestion endpoints',async()=>{
 const calls=[];const result=await collectReleased([],trust,async path=>{calls.push(path);return {seq:0,chain_hash:ZERO};});
 assert.deepEqual(calls,['/head']);assert.equal(result.records.length,0);
});
test('Pending TSA blocks prefix; later records are not silently skipped',async()=>{
 const calls=[];const result=await collectReleased([],trust,async path=>{calls.push(path);return path==='/head'?{seq:2,chain_hash:'a'.repeat(64)}:{tsa:{status:'pending'}};});
 assert.deepEqual(calls,['/head','/records/1']);assert.equal(result.records.length,0);
});
test('Source invalid head or inconsistent empty chain fails closed',async()=>{
 await assert.rejects(collectReleased([],trust,async()=>({seq:-1,chain_hash:ZERO})));
 await assert.rejects(collectReleased([],trust,async()=>({seq:0,chain_hash:'a'.repeat(64)})));
});
test('Unexpected public receipt fields rejected before hashing',async()=>{
 await assert.rejects(verifyRecord({reason:'private'},1,ZERO,trust),/Unexpected receipt fields/);
});

import assert from './check.js';
import {canonical,digest,verifyReceipt,from64,hex} from './protocol.js';
import {verifyTimestamp} from './tsa.js';
export const ZERO='0'.repeat(64);
const SIGNAL_KEYS=['schema_version','strategy','version','deployment_id','symbol','timeframe','signal_time','action','target_position','target_exposure'].sort();
const RECORD_KEYS=['domain','stream_id','deployment_id','seq','received_at','payload_hash','previous_hash','key_id'].sort();
export async function verifyTrust(config,key,root){
 assert.equal(hex(await crypto.subtle.digest('SHA-256',from64(key))),config.public_key_spki_sha256,'Public key pin mismatch');
 // Published root file hash includes its terminating newline.
 assert.equal(await digest(root),config.tsa_root_file_sha256,'TSA root pin mismatch');
}
export async function verifyRecord(receipt,seq,previous,trust,now=Date.now()){
 const {config,key,root}=trust;
 assert.deepEqual(Object.keys(receipt).sort(),['chain_hash','record','release_at','signal','signature','tsa'].sort(),'Unexpected receipt fields');
 assert.deepEqual(Object.keys(receipt.signal).sort(),SIGNAL_KEYS,'Unexpected signal fields');
 assert.deepEqual(Object.keys(receipt.record).sort(),RECORD_KEYS,'Unexpected record fields');
 assert.deepEqual(Object.keys(receipt.tsa).sort(),['status','provider','query_b64','response_b64','gen_time','policy','serial','revocation_status'].sort(),'Unexpected TSA fields');
 assert.equal(receipt.record.seq,seq,'Missing or reordered record');
 assert.equal(receipt.record.previous_hash,previous,'Broken chain');
 assert.equal(receipt.record.domain,'signal-proof-v1');
 assert.equal(receipt.record.stream_id,config.stream_id,'Synthetic or other stream');
 assert.equal(receipt.record.deployment_id,config.deployment_id);
 assert.equal(receipt.signal.deployment_id,config.deployment_id);
 assert.equal(receipt.record.key_id,config.key_id);
 assert.equal(receipt.signal.strategy,'signal'); assert.equal(receipt.signal.version,'1');
 assert.equal(receipt.signal.symbol,'BINANCE:BTCUSDT.P'); assert.equal(receipt.signal.timeframe,'5');
 const received=Date.parse(receipt.record.received_at);
 assert.ok(Number.isFinite(received));
 const release=received+config.publication_delay_ms;
 assert.equal(receipt.release_at,new Date(release).toISOString(),'Release policy mismatch');
 assert.ok(now>=release,'Record is not yet public');
 assert.equal(await verifyReceipt(receipt,key),true,'Invalid Ed25519 receipt');
 assert.equal(receipt.tsa.status,'verified','TSA pending');
 assert.equal(receipt.tsa.provider,'FreeTSA');
 const tsa=await verifyTimestamp(from64(receipt.tsa.response_b64).buffer,from64(receipt.tsa.query_b64).buffer,root,canonical(receipt.record));
 for(const field of ['gen_time','policy','serial','revocation_status']) assert.equal(receipt.tsa[field],tsa[field],'TSA metadata mismatch');
 return receipt.chain_hash;
}
export async function verifyArchive(records,trust,now=Date.now()){
 assert.ok(Array.isArray(records));
 await verifyTrust(trust.config,trust.key,trust.root);
 let previous=ZERO;
 for(let i=0;i<records.length;i++) previous=await verifyRecord(records[i],i+1,previous,trust,now);
 return {verified_records:records.length,chain_hash:previous,revocation_status:'not_checked'};
}
export async function collectReleased(existing,trust,fetchJson,now=Date.now()){
 const verified=await verifyArchive(existing,trust,now);
 const head=await fetchJson('/head');
 assert.ok(Number.isSafeInteger(head.seq)&&head.seq>=existing.length,'Source head moved backwards');
 assert.match(head.chain_hash,/^[0-9a-f]{64}$/);
 const result=[...existing]; let previous=verified.chain_hash;
 if(head.seq===existing.length) assert.equal(head.chain_hash,previous,'Source changed archived head');
 // Recheck the immutable signed part of the last published record.
 if(existing.length){const live=await fetchJson('/records/'+existing.length);assert.equal(canonical(live),canonical(existing.at(-1)),'Source rewrote archived record');}
 const limit=Math.min(head.seq,existing.length+100);
 for(let seq=existing.length+1;seq<=limit;seq++){
   const receipt=await fetchJson('/records/'+seq);
   if(receipt.tsa?.status==='pending') break; // Do not skip a hole; retry next run.
   previous=await verifyRecord(receipt,seq,previous,trust,now);
   result.push(receipt);
 }
 if(result.length===head.seq) assert.equal(previous,head.chain_hash,'Source head mismatch');
 return {records:result,manifest:{schema_version:1,published_seq:result.length,chain_hash:previous,last_checked_utc_date:new Date(now).toISOString().slice(0,10)}};
}

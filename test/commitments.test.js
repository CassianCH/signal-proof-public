import{test}from'node:test';import assert from'node:assert/strict';
import{readFileSync}from'node:fs';import{canonical,digest,b64,hex}from'../lib/protocol.js';
import{verifyCommitments,collectCommitments,matchDisclosures}from'../lib/commitments.js';
import{ZERO}from'../lib/archive.js';
async function fixture(){
 const pair=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']);const spki=await crypto.subtle.exportKey('spki',pair.publicKey);
 const root=readFileSync(new URL('../trust/freetsa-root.pem',import.meta.url),'utf8');
 const config={stream_id:'signal-production',deployment_id:'signal-production-v1',key_id:'key-v1',public_key_spki_sha256:hex(await crypto.subtle.digest('SHA-256',spki)),tsa_root_file_sha256:await digest(root)};
 const record={domain:'signal-proof-v1',stream_id:config.stream_id,deployment_id:config.deployment_id,key_id:config.key_id,seq:1,received_at:new Date().toISOString(),payload_hash:'a'.repeat(64),previous_hash:ZERO};
 const chain_hash=await digest(canonical(record));const signature=b64(await crypto.subtle.sign('Ed25519',pair.privateKey,Uint8Array.from(chain_hash.match(/../g),x=>parseInt(x,16))));
 return{trust:{config,key:b64(spki),root},commitment:{record,chain_hash,signature,tsa:{status:'pending',attempts:0}}};
}
test('Immediate commitment verifies without disclosing signal; pending is not a TSA proof',async()=>{
 const{trust,commitment}=await fixture();const result=await verifyCommitments([commitment],trust);assert.equal(result.pending_tsa,1);assert.equal(result.verified_tsa,0);
 await assert.rejects(verifyCommitments([{...commitment,signal:{action:'buy'}}],trust));
 await assert.rejects(verifyCommitments([{...commitment,record:{...commitment.record,seq:2}}],trust));
});
test('Archived commitment cannot regress or be rewritten and disclosure must match',async()=>{
 const{trust,commitment}=await fixture();
 await assert.rejects(collectCommitments([commitment],trust,async()=>({seq:0,chain_hash:ZERO})));
 const changed={...commitment,chain_hash:'b'.repeat(64)};
 await assert.rejects(collectCommitments([commitment],trust,async path=>path==='/commitments/head'?{seq:1,chain_hash:commitment.chain_hash}:changed));
 assert.throws(()=>matchDisclosures([changed],[commitment]));
});

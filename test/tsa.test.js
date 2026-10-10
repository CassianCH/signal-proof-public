import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as asn1 from 'asn1js';
import * as pki from 'pkijs';
import {verifyTimestamp} from '../lib/tsa.js';
import {digest,unhex,canonical,from64} from '../lib/protocol.js';
import {verifyArchive,collectReleased,ZERO} from '../lib/archive.js';
import {verifyCommitments} from '../lib/commitments.js';
const receipt=JSON.parse(readFileSync(new URL('./fixtures/timestamp.json',import.meta.url),'utf8'));
const root=readFileSync(new URL('../trust/freetsa-root.pem',import.meta.url),'utf8');
const config=JSON.parse(readFileSync(new URL('../config.json',import.meta.url),'utf8'));
const trust={config:{...config,stream_id:receipt.record.stream_id,deployment_id:receipt.record.deployment_id},root,key:readFileSync(new URL('../trust/public-key.txt',import.meta.url),'utf8').trim()};
const disclosed={...receipt,release_at:new Date(Date.parse(receipt.record.received_at)+config.publication_delay_ms).toISOString()};
const now=Date.parse(disclosed.release_at)+1000;
test('Recorded isolated sample verifies end to end; altered signal and TSA binding fail',async()=>{
 const result=await verifyArchive([disclosed],trust,now);
 assert.equal(result.verified_records,1);assert.equal(result.timely_tsa,1);assert.equal(result.late_tsa,0);
 const {signal,...commitment}=receipt;
 assert.equal((await verifyCommitments([commitment],trust,now)).timely_tsa,1);
 await assert.rejects(verifyArchive([{...disclosed,signal:{...signal,action:'buy'}}],trust,now));
 await assert.rejects(verifyTimestamp(from64(receipt.tsa.response_b64).buffer,from64(receipt.tsa.query_b64).buffer,root,canonical({...receipt.record,payload_hash:ZERO}),from64(receipt.tsa.crl_b64).buffer),/TSA imprint mismatch/);
 const collected=await collectReleased([],trust,async path=>path==='/head'?{seq:1,chain_hash:receipt.chain_hash}:disclosed,now);
 assert.equal(collected.records.length,1);
});
// Unsigned parser fixtures exercise the explicit binding check before certificate validation.
async function fixture(preimage,requestHash){
 const hash=await digest(preimage);
 const imprint=value=>new pki.MessageImprint({hashAlgorithm:new pki.AlgorithmIdentifier({algorithmId:'2.16.840.1.101.3.4.2.1'}),hashedMessage:new asn1.OctetString({valueHex:unhex(value).buffer})});
 const nonce=new asn1.Integer({value:123});
 const request=new pki.TimeStampReq({version:1,messageImprint:imprint(requestHash||hash),nonce});
 const info=new pki.TSTInfo({version:1,policy:'1.2.3.4',messageImprint:imprint(hash),serialNumber:new asn1.Integer({value:1}),genTime:new Date('2026-01-01T00:00:00Z'),nonce});
 const signed=new pki.SignedData({version:3,encapContentInfo:new pki.EncapsulatedContentInfo({eContentType:'1.2.840.113549.1.9.16.1.4',eContent:new asn1.OctetString({valueHex:info.toSchema().toBER(false)})})});
 const response=new pki.TimeStampResp({status:new pki.PKIStatusInfo({status:0}),timeStampToken:new pki.ContentInfo({contentType:'1.2.840.113549.1.7.2',content:signed.toSchema()})});
 return [response.toSchema().toBER(false),request.toSchema().toBER(false),''];
}
test('Matching imprint proceeds to certificate checks, not automatic acceptance',async()=>{
 await assert.rejects(verifyTimestamp(...await fixture('record'),'record'),/invalid TSA EKU/);
});
test('Timestamp for another record and mismatched request imprint are rejected explicitly',async()=>{
 await assert.rejects(verifyTimestamp(...await fixture('record'),'record '),/TSA imprint mismatch/);
 await assert.rejects(verifyTimestamp(...await fixture('record','00'.repeat(32)),'record'),/TSA imprint mismatch/);
});

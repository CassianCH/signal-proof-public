import {verifyArchive} from '../lib/archive.js';
import {verifyCommitments,matchDisclosures} from '../lib/commitments.js';
const el=id=>document.getElementById(id);
const state=el('verification-status');
async function load(path,json=true){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Download failed: '+path);return json?r.json():r.text();}
function date(value){return new Date(value).toISOString().replace('T',' ').replace('.000Z','');}
try{
 const [config,key,root,records,manifest]=await Promise.all([load('config.json'),load('trust/public-key.txt',false),load('trust/freetsa-root.pem',false),load('data/records.json'),load('data/manifest.json')]);
 const trust={config,key:key.trim(),root};
 const commitments=await load('data/commitments.json');
 el('commitment-count').textContent=commitments.length;
 el('count').textContent=records.length;el('updated').textContent=manifest.last_checked_utc_date||'Not synced yet';el('fingerprint').textContent=config.public_key_spki_sha256;
 el('empty').hidden=records.length!==0;
 for(const receipt of [...records].reverse()){
  const tr=document.createElement('tr');
  for(const value of [receipt.record.seq,date(receipt.signal.signal_time),receipt.signal.action+' / '+receipt.signal.target_position,receipt.signal.target_exposure,date(receipt.tsa.gen_time)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const td=document.createElement('td');for(const ext of ['json','tsq','tsr']){const a=document.createElement('a');a.href='data/records/'+receipt.record.seq+'.'+ext;a.download='signal-'+receipt.record.seq+'.'+ext;a.textContent=ext.toUpperCase();td.append(a);}tr.append(td);el('records').append(tr);
 }
 state.textContent='Receipts loaded. Cryptographic verification has not been run yet.';el('verify').disabled=false;
 el('verify').addEventListener('click',async()=>{
  el('verify').disabled=true;state.className='';state.textContent='Verifying hashes, signatures and TSA proofs locally…';
  try{
   const result=await verifyArchive(records,trust);
   const committed=await verifyCommitments(commitments,trust);matchDisclosures(records,commitments);
   if(result.verified_records!==manifest.published_seq||result.chain_hash!==manifest.chain_hash)throw Error('Manifest mismatch');
   state.className='success';state.textContent=result.verified_records?result.verified_records+' records verified: hashes / Ed25519 / TSA / hash chain / signed CRL at issuance. Confirm identity through an independently trusted fingerprint.':'Trust-anchor checks passed. There are 0 disclosed records; no disclosed signal proof has been verified.';
   state.textContent+=' Commitments: '+committed.commitments+'; TSA verified: '+committed.verified_tsa+'; pending: '+committed.pending_tsa+'; TSA delayed over 15 minutes: '+committed.late_tsa+'.';
  }catch(error){state.className='error';state.textContent='Verification failed: '+error.message;}finally{el('verify').disabled=false;}
 });
}catch(error){state.className='error';state.textContent='Loading failed: '+error.message;}

import {verifyArchive} from '../lib/archive.js';
const el=id=>document.getElementById(id);
const state=el('verification-status');
async function load(path,json=true){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('Download failed: '+path);return json?r.json():r.text();}
function date(value){return new Date(value).toISOString().replace('T',' ').replace('.000Z','');}
try{
 const [config,key,root,records,manifest]=await Promise.all([load('config.json'),load('trust/public-key.txt',false),load('trust/freetsa-root.pem',false),load('data/records.json'),load('data/manifest.json')]);
 const trust={config,key:key.trim(),root};
 el('count').textContent=records.length;el('updated').textContent=manifest.last_checked_utc_date||'尚未同步';el('fingerprint').textContent=config.public_key_spki_sha256;
 el('empty').hidden=records.length!==0;
 for(const receipt of [...records].reverse()){
  const tr=document.createElement('tr');
  for(const value of [receipt.record.seq,date(receipt.signal.signal_time),receipt.signal.action+' / '+receipt.signal.target_position,receipt.signal.target_exposure,date(receipt.tsa.gen_time)]){const td=document.createElement('td');td.textContent=value;tr.append(td);}
  const td=document.createElement('td');for(const ext of ['json','tsq','tsr']){const a=document.createElement('a');a.href='data/records/'+receipt.record.seq+'.'+ext;a.download='signal-'+receipt.record.seq+'.'+ext;a.textContent=ext.toUpperCase();td.append(a);}tr.append(td);el('records').append(tr);
 }
 state.textContent='记录已载入，尚未进行密码学验证。';el('verify').disabled=false;
 el('verify').addEventListener('click',async()=>{
  el('verify').disabled=true;state.className='';state.textContent='正在本地验证哈希、签名和 TSA…';
  try{
   const result=await verifyArchive(records,trust);
   if(result.verified_records!==manifest.published_seq||result.chain_hash!==manifest.chain_hash)throw Error('Manifest mismatch');
   state.className='success';state.textContent=result.verified_records?result.verified_records+' 条记录验证通过：哈希 / Ed25519 / TSA / 哈希链。未检查证书吊销；身份须另行核对指纹。':'信任材料校验通过；目前 0 条记录，未验证任何信号或 TSA。';
  }catch(error){state.className='error';state.textContent='验证失败：'+error.message;}finally{el('verify').disabled=false;}
 });
}catch(error){state.className='error';state.textContent='载入失败：'+error.message;}

import{test}from'node:test';import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{checkPublicTree,checkPublicText}from'../scripts/privacy.js';
import{sourceClient}from'../scripts/source.js';
const source=['https:','','private-source.invalid'].join('/');
test('Every public file passes privacy policy; verification pages have no source connection',()=>{
 assert.ok(checkPublicTree()>20);
 assert.throws(()=>checkPublicText(source,'fixture'),/Unapproved/);
 const browser=readFileSync('site/app.js','utf8');assert.equal(browser.includes('SOURCE_URL'),false);
 const tsa=readFileSync('lib/tsa.js','utf8');assert.equal(/\bfetch\s*\(/.test(tsa),false);
});
test('Source failures never expose URL, hostname, response body or nested errors',async()=>{
 for(const fetcher of [async()=>{throw Error('DNS '+source);},async()=>({ok:false}),async()=>({ok:true,json:async()=>{throw Error('body '+source);}})]){
  const masks=[];const client=sourceClient(source,{fetcher,attempts:1,mask:v=>masks.push(v)});
  await assert.rejects(client('/head'),e=>e.message==='Archive download failed'&&!e.cause&&!e.stack.includes(source));
  assert.ok(masks.includes(new URL(source).hostname));
 }
 assert.throws(()=>sourceClient(source+'?sensitive=value'),e=>e.message==='Archive source configuration invalid');
});
test('Source client permits only archive reads and rejects redirects',async()=>{
 const calls=[];const client=sourceClient(source,{fetcher:async(url,options)=>{calls.push(options);return{ok:true,json:async()=>({seq:0})};}});
 await assert.rejects(client('/private'),/Archive path invalid/);assert.equal(calls.length,0);
 assert.deepEqual(await client('/head'),{seq:0});assert.equal(calls[0].redirect,'error');
});

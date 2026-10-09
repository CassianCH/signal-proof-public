import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Public page, runtime messages and downloaded README are English with publisher attribution',()=>{
 for(const name of ['site/index.html','site/app.js','README.md']){
  const text=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.equal(/[\u3400-\u9fff]/u.test(text),false,name+' contains Chinese text');
 }
 const html=readFileSync(new URL('../site/index.html',import.meta.url),'utf8');
 assert.ok(html.includes('lang="en"'));
 assert.ok(html.includes('https://x.com/EdwardForst379'));
 assert.ok(html.includes('A copied page or profile link alone does not prove ownership.'));
});
test('Observer README contains the public site and no source or operational disclosure',()=>{
 const text=readFileSync(new URL('../README.md',import.meta.url),'utf8');
 assert.ok(text.includes('https://cassianch.github.io/signal-proof-public/'));
 assert.ok(text.includes('npm run verify'));
 assert.equal(/does not prove|does not establish|does not guarantee|not prove ownership|profitability|not an independent timestamp/i.test(text),false);
 assert.equal(/tradingview|SOURCE_WORKER_URL|\/ingest|signalToken|strategy\.order|cloudflare|\bmrs\b|mcstruct|\bmcs\b/i.test(text),false);
});

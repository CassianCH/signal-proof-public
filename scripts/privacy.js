import{readFileSync,readdirSync}from'node:fs';
import{join}from'node:path';
const allowedHosts=new Set(['github.com','cassianch.github.io','x.com','registry.npmjs.org','paulmillr.com','freetsa.org','www.freetsa.org']);
export function checkPublicText(text,label){
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw Error('Private key in '+label);
 if(/\/(?:Users|home)\/[^/\s]+\//.test(text))throw Error('Local path in '+label);
 if(/[A-Z0-9._%+-]+@(?:gmail|icloud|hotmail|outlook)\.[A-Z]+/i.test(text))throw Error('Personal email in '+label);
 for(const raw of text.match(/https?:\/\/[A-Za-z0-9][A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]*/g)||[]){
  let url;try{url=new URL(raw);}catch{throw Error('Invalid public URL in '+label);}
  if(!allowedHosts.has(url.hostname)||url.username||url.password)throw Error('Unapproved public URL in '+label);
 }
}
export function checkPublicTree(root='.'){
 const files=['README.md','config.json','package.json','package-lock.json','.gitignore'];
 const walk=dir=>{for(const entry of readdirSync(join(root,dir),{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Public symlink');if(entry.isDirectory())walk(path);else files.push(path);}};
 for(const dir of ['.github','data','lib','scripts','site','test','trust'])walk(dir);
 for(const file of files)checkPublicText(readFileSync(join(root,file),'utf8'),file);
 return files.length;
}
export function checkPublishedFiles(root,sequences=[]){
 const allowed=new Set(['index.html','app.js','styles.css','README.md','config.json','trust/public-key.txt','trust/freetsa-root.pem','data/records.json','data/commitments.json','data/manifest.json']);
 for(const seq of sequences){if(!Number.isSafeInteger(seq)||seq<1)throw Error('Invalid published sequence');for(const ext of ['json','tsq','tsr'])allowed.add('data/records/'+seq+'.'+ext);}
 let count=0;
 const walk=dir=>{for(const e of readdirSync(join(root,dir),{withFileTypes:true})){const f=join(dir,e.name);if(e.isSymbolicLink())throw Error('Public symlink');if(e.isDirectory())walk(f);else{if(!allowed.has(f))throw Error('Unexpected published file');if(!/\.(?:tsq|tsr)$/.test(f))checkPublicText(readFileSync(join(root,f),'utf8'),f);count++;}}};
 walk('');if(count!==allowed.size)throw Error('Missing published file');return count;
}

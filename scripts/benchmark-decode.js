'use strict';
// Reproducible relative microbenchmark. This is not an Android/device benchmark.
const old=require('../test/fixtures/legacy-codec.js');
const current=require('../codec.js');
const {performance}=require('node:perf_hooks');
const enc=new TextEncoder(), dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
function measure(fn){for(let i=0;i<3;i++)fn();let count=1;while(count<4096){let start=performance.now();for(let i=0;i<count;i++)fn();if(performance.now()-start>=40)break;count*=2}let times=[];for(let i=0;i<7;i++){let t=performance.now();for(let j=0;j<count;j++)fn();times.push((performance.now()-t)/count)}return times.sort((a,b)=>a-b)[3]}
console.log('Node',process.version,process.platform,process.arch,require('node:os').cpus()[0].model);
for(const [name,text] of [['persian','این یک متن فارسی برای بررسی اندازه و سرعت خواندن است.\n'.repeat(1000)],['mixed','سلام دنیا! Hello world 123 😀\n'.repeat(1000)],['english','The quick brown fox jumps over the lazy dog.\n'.repeat(1000)]]){
 const raw=enc.encode(text),p=current.encode(raw);if(!Buffer.from(current.decode(p)).equals(Buffer.from(raw)))throw Error('roundtrip failed');
 let a=measure(()=>dec.decode(old.decode(p))),b=measure(()=>dec.decode(current.decode(p))),c=measure(()=>dec.decode(raw));
 console.log(JSON.stringify({name,raw_bytes:raw.length,p6tx_bytes:p.length,legacy_ms:a,optimized_ms:b,utf8_ms:c,old_over_new:a/b,new_over_utf8:b/c}));
}

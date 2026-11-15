'use strict';
const before=require('../test/fixtures/decoder-v1.1.js'),after=require('../codec.js');
const {performance}=require('node:perf_hooks'),utf8=new TextEncoder(),text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
function bench(fn){for(let i=0;i<3;i++)fn();let count=1;while(count<4096){const t=performance.now();for(let i=0;i<count;i++)fn();if(performance.now()-t>=40)break;count*=2}const a=[];for(let i=0;i<7;i++){let t=performance.now();for(let j=0;j<count;j++)fn();a.push((performance.now()-t)/count)}return a.sort((a,b)=>a-b)[3]}
// 38,558 table tokens and 5,748 escape tokens, distributed throughout. This
// approximates the reported counts, not the unknown user's actual characters.
let s='',table=0,esc=0;for(let i=0;i<44306;i++){if(Math.floor((i+1)*5748/44306)>Math.floor(i*5748/44306)){s+='پ';esc++}else{s+='س';table++}}
const input=utf8.encode(s),encoded=after.encode(input);if(!Buffer.from(after.decode(encoded)).equals(Buffer.from(input))||!Buffer.from(before.decode(encoded)).equals(Buffer.from(input)))throw Error('incorrect result');
const a=bench(()=>text.decode(before.decode(encoded))),b=bench(()=>text.decode(after.decode(encoded))),c=bench(()=>text.decode(input));
console.log(JSON.stringify({runtime:process.version,cpu:require('node:os').cpus()[0].model,input_bytes:input.length,encoded_bytes:encoded.length,table_tokens:table,escape_tokens:esc,previous_ms:a,optimized_ms:b,baseline_ms:c,speedup:a/b},null,2));

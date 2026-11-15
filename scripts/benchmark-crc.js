'use strict';
const before=require('../test/fixtures/decoder-v1.3.js'),after=require('../codec.js'),{performance}=require('node:perf_hooks');
function bench(fn){for(let i=0;i<5;i++)fn();let n=1;while(n<8192){let t=performance.now();for(let i=0;i<n;i++)fn();if(performance.now()-t>=50)break;n*=2}let a=[];for(let i=0;i<7;i++){let t=performance.now();for(let j=0;j<n;j++)fn();a.push((performance.now()-t)/n)}return a.sort((x,y)=>x-y)[3]}
const raw=new TextEncoder().encode('این یک متن فارسی با پ و متن انگلیسی است.\n'.repeat(1600)),encoded=after.encode(raw);if(before.crc32(raw)!==after.crc32(raw))throw Error('CRC mismatch');
const oldCRC=bench(()=>before.crc32(raw)),newCRC=bench(()=>after.crc32(raw)),oldTotal=bench(()=>before.decodeUtf8(before.decode(encoded))),newTotal=bench(()=>after.decodeUtf8(after.decode(encoded)));
console.log(JSON.stringify({node:process.version,cpu:require('node:os').cpus()[0].model,bytes:raw.length,old_crc_ms:oldCRC,new_crc_ms:newCRC,crc_speedup:oldCRC/newCRC,old_total_ms:oldTotal,new_total_ms:newTotal,total_speedup:oldTotal/newTotal},null,2));

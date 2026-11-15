(function(root){
'use strict';
// Diagnostic decoder: kept separate from the production decoder so that per-escape
// timer calls do not contaminate the primary benchmark. Its timings are estimates.
const P=typeof module!=='undefined'&&module.exports?require('./codec.js'):root.P6TX;
const enc=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const chars=Array.from(P.TABLE), ids=new Set(chars), tableBytes=chars.map(c=>enc.encode(c));
function profile(record,maxOutput=32*1024*1024){
 const totalStart=performance.now();
 if(record.length<17||record[0]!==80||record[1]!==54||record[2]!==84||record[3]!==88||record[4]!==1)throw Error('قالب یا نسخه نامعتبر است');
 const view=new DataView(record.buffer,record.byteOffset,record.byteLength), big=view.getBigUint64(5);
 if(big>BigInt(maxOutput)*6n||big>BigInt(Number.MAX_SAFE_INTEGER))throw Error('اندازه بیش از حد مجاز است');
 const bits=Number(big),data=record.subarray(17);
 if(data.length!==Math.ceil(bits/8))throw Error('اندازه نامعتبر است');
 if(bits%8&&(data[data.length-1]&((1<<(8-bits%8))-1)))throw Error('بیت پرکننده نامعتبر است');
 const out=new Uint8Array(Math.min(maxOutput,Math.ceil(bits/6)*3));let pos=0,total=0,escapes=0,tableTokens=0,escapeMs=0;
 function get(k){if(pos+k>bits)throw Error('داده ناقص است');const index=Math.floor(pos/8),off=pos%8,word=(data[index]<<8)|(data[index+1]||0);const value=(word>>>(16-off-k))&((1<<k)-1);pos+=k;return value}
 const loopStart=performance.now();
 while(pos<bits){
  const id=get(6);let b,escapeStart=0;
  if(id<63){b=tableBytes[id];tableTokens++}
  else{escapeStart=performance.now();escapes++;const len=get(2)+1;b=new Uint8Array(len);for(let j=0;j<len;j++)b[j]=get(8);const c=decoder.decode(b);if(Array.from(c).length!==1||ids.has(c))throw Error('فرار نامعتبر است')}
  if(total+b.length>maxOutput)throw Error('خروجی بیش از حد مجاز است');
  for(let j=0;j<b.length;j++)out[total++]=b[j];
  if(id===63)escapeMs+=performance.now()-escapeStart;
 }
 const loopMs=performance.now()-loopStart;
 const result=out.subarray(0,total);
 const crcStart=performance.now();if(P.crc32(result)!==view.getUint32(13))throw Error('خطای CRC');const crcMs=performance.now()-crcStart;
 const textStart=performance.now();const text=P.decodeUtf8(result);const utf8Ms=performance.now()-textStart;
 return {bytes:result,text,timings:{loop_ms:loopMs,escape_ms:escapeMs,non_escape_loop_ms:Math.max(0,loopMs-escapeMs),crc_ms:crcMs,utf8_ms:utf8Ms,instrumented_total_ms:performance.now()-totalStart},counts:{table_tokens:tableTokens,escape_tokens:escapes}};
}
const api={profile};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.P6TXProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this);

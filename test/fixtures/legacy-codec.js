(function(root){
'use strict';
const TABLE = 'ابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'+' '+'۰۱۲۳۴۵۶۷۸۹'+'0123456789'+'،.؟!:\n\u200c-()/';
const chars=Array.from(TABLE), ids=new Map(chars.map((c,i)=>[c,i]));
const utf8=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i&1)?(0xedb88320^(i>>>1)):(i>>>1);return i>>>0});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
function decodeUtf8(bytes){return decoder.decode(bytes)}
function encode(raw){
 const text=decodeUtf8(raw), out=[]; let acc=0,n=0,bits=0;
 function put(v,k){acc=(acc<<k)|v;n+=k;bits+=k;while(n>=8){n-=8;out.push((acc>>>n)&255);acc&=(1<<n)-1}}
 for(const c of text){const id=ids.get(c);if(id!==undefined)put(id,6);else{const b=utf8.encode(c);put(63,6);put(b.length-1,2);for(const x of b)put(x,8)}}
 if(n)out.push(acc<<(8-n));
 const record=new Uint8Array(17+out.length), view=new DataView(record.buffer);record.set([80,54,84,88,1]);view.setBigUint64(5,BigInt(bits));view.setUint32(13,crc32(raw));record.set(out,17);return record;
}
function decode(record,maxOutput=32*1024*1024){
 if(record.length<17)throw Error('سرآیند ناقص است');
 if(record[0]!==80||record[1]!==54||record[2]!==84||record[3]!==88||record[4]!==1)throw Error('قالب یا نسخه نامعتبر است');
 const v=new DataView(record.buffer,record.byteOffset,record.byteLength), big=v.getBigUint64(5);
 if(big>BigInt(maxOutput)*6n||big>BigInt(Number.MAX_SAFE_INTEGER))throw Error('اندازه بیش از حد مجاز است');
 const bits=Number(big), data=record.subarray(17);if(data.length!==Math.ceil(bits/8))throw Error('اندازه نامعتبر است');
 if(bits%8&&(data[data.length-1]&((1<<(8-bits%8))-1)))throw Error('بیت پرکننده نامعتبر است');
 let pos=0;function get(k){if(pos+k>bits)throw Error('داده ناقص است');let x=0;for(let j=0;j<k;j++){x=(x<<1)|((data[pos>>3]>>(7-(pos&7)))&1);pos++}return x}
 const pieces=[];let total=0;
 while(pos<bits){let id=get(6), b;if(id<63)b=utf8.encode(chars[id]);else{let len=get(2)+1;b=new Uint8Array(len);for(let j=0;j<len;j++)b[j]=get(8);const c=decodeUtf8(b);if(Array.from(c).length!==1||ids.has(c))throw Error('فرار نامعتبر است')}
 total+=b.length;if(total>maxOutput)throw Error('خروجی بیش از حد مجاز است');pieces.push(b);
 }
 const result=new Uint8Array(total);let offset=0;for(const b of pieces){result.set(b,offset);offset+=b.length}
 if(crc32(result)!==v.getUint32(13))throw Error('خطای CRC');return result;
}
const api={encode,decode,decodeUtf8,crc32,TABLE};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.P6TX=api;
})(typeof globalThis!=='undefined'?globalThis:this);

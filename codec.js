(function(root){
'use strict';
const TABLE = 'ابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'+' '+'۰۱۲۳۴۵۶۷۸۹'+'0123456789'+'،.؟!:\n\u200c-()/';
const chars=Array.from(TABLE), ids=new Map(chars.map((c,i)=>[c,i]));
const utf8=new TextEncoder(), decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
// Cache the UTF-8 bytes once, instead of allocating a typed array per character.
const tableBytes=chars.map(c=>utf8.encode(c));
const tableCodePoints=new Set(chars.map(c=>c.codePointAt(0)));
// Validate exactly one canonical UTF-8 scalar and reject escapes for table characters.
function validateEscape(a,b,c,d,n){
 let cp;
 if(n===1){if(a>0x7f)return false;cp=a}
 else if(n===2){if(a<0xc2||a>0xdf||(b&0xc0)!==0x80)return false;cp=((a&31)<<6)|(b&63)}
 else if(n===3){if(a<0xe0||a>0xef||(b&0xc0)!==0x80||(c&0xc0)!==0x80||(a===0xe0&&b<0xa0)||(a===0xed&&b>=0xa0))return false;cp=((a&15)<<12)|((b&63)<<6)|(c&63)}
 else if(n===4){if(a<0xf0||a>0xf4||(b&0xc0)!==0x80||(c&0xc0)!==0x80||(d&0xc0)!==0x80||(a===0xf0&&b<0x90)||(a===0xf4&&b>=0x90))return false;cp=((a&7)<<18)|((b&63)<<12)|((c&63)<<6)|(d&63)}
 else return false;
 return !tableCodePoints.has(cp);
}
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
 const bits=Number(big), data=record.subarray(17);
 if(data.length!==Math.ceil(bits/8))throw Error('اندازه نامعتبر است');
 if(bits%8&&(data[data.length-1]&((1<<(8-bits%8))-1)))throw Error('بیت پرکننده نامعتبر است');
 // Each table token yields at most 3 bytes for 6 bits; escaped tokens yield less.
 // This is an upper bound, limited to the configured maximum output size.
 const out=new Uint8Array(Math.min(maxOutput,Math.ceil(bits/6)*3));
 let pos=0,total=0;
 function get(k){
  if(pos+k>bits)throw Error('داده ناقص است');
  const index=Math.floor(pos/8), off=pos%8;
  const word=(data[index]<<8)|(data[index+1]||0);
  const value=(word>>>(16-off-k))&((1<<k)-1);
  pos+=k;return value;
 }
 while(pos<bits){
  const id=get(6);
  if(id<63){
   const b=tableBytes[id];if(total+b.length>maxOutput)throw Error('خروجی بیش از حد مجاز است');
   for(let j=0;j<b.length;j++)out[total++]=b[j];
  }else{
   const len=get(2)+1,a=get(8),b=len>1?get(8):0,c=len>2?get(8):0,d=len>3?get(8):0;
   if(!validateEscape(a,b,c,d,len))throw Error('فرار نامعتبر است');
   if(total+len>maxOutput)throw Error('خروجی بیش از حد مجاز است');
   out[total++]=a;if(len>1)out[total++]=b;if(len>2)out[total++]=c;if(len>3)out[total++]=d;
  }
 }
 const result=out.subarray(0,total);
 if(crc32(result)!==v.getUint32(13))throw Error('خطای CRC');
 return result;
}
const api={encode,decode,decodeUtf8,crc32,TABLE,_validateEscape:validateEscape};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.P6TX=api;
})(typeof globalThis!=='undefined'?globalThis:this);

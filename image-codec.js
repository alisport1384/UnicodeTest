(function(root){'use strict';
const P=typeof module!=='undefined'&&module.exports?require('./codec.js'):root.P6TX;
const MAX=8*1024*1024;
// Image container: IMX1, method u8, original length u32be, CRC32 u32be, then payload.
async function streamTransform(data,stream,max){
 const reader=new Blob([data]).stream().pipeThrough(stream).getReader();let parts=[],length=0;
 try{while(true){const x=await reader.read();if(x.done)break;length+=x.value.length;if(length>max){await reader.cancel();throw Error('خروجی بیش از حد مجاز است')}parts.push(x.value)}}finally{reader.releaseLock()}
 const out=new Uint8Array(length);let off=0;for(const b of parts){out.set(b,off);off+=b.length}return out;
}
async function encode(raw){
 if(raw.length>MAX)throw Error('تصویر بیش از ۸ مگابایت است');let body=raw,method=0;
 if(typeof CompressionStream==='function'&&typeof DecompressionStream==='function'){
  const packed=await streamTransform(raw,new CompressionStream('gzip'),MAX+65536);
  if(packed.length<raw.length){body=packed;method=1}
 }
 const frame=new Uint8Array(13+body.length),v=new DataView(frame.buffer);frame.set([73,77,88,49,method]);v.setUint32(5,raw.length);v.setUint32(9,P.crc32(raw));frame.set(body,13);return frame;
}
async function decode(frame){
 if(frame.length<13||frame[0]!==73||frame[1]!==77||frame[2]!==88||frame[3]!==49)throw Error('فرمت عکس نامعتبر است');
 const v=new DataView(frame.buffer,frame.byteOffset,frame.byteLength),length=v.getUint32(5),crc=v.getUint32(9),method=frame[4],payload=frame.subarray(13);
 if(length>MAX)throw Error('خروجی بیش از حد مجاز است');let out;
 if(method===0){if(payload.length!==length)throw Error('طول داده نامعتبر است');out=payload.slice()}
 else if(method===1){if(typeof DecompressionStream!=='function')throw Error('مرورگر از gzip پشتیبانی نمی‌کند');out=await streamTransform(payload,new DecompressionStream('gzip'),length)}
 else throw Error('روش ذخیره نامعتبر است');
 if(out.length!==length||P.crc32(out)!==crc)throw Error('خطای صحت یا اندازهٔ تصویر');return out;
}
const api={encode,decode,MAX};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ImageCodec=api;
})(globalThis);

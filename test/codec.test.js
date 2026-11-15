const test=require('node:test'),assert=require('node:assert/strict'),P=require('../codec.js');
const enc=new TextEncoder();
test('exact P6TX golden vector and CRC',()=>{const raw=enc.encode('سلام');assert.equal(Buffer.from(P.encode(raw)).toString('hex'),'5036545801000000000000001822ef6f2235901a');assert.equal(P.crc32(enc.encode('123456789')),0xcbf43926);assert.deepEqual(P.decode(P.encode(raw)),raw)});
test('lossless edge cases and BOM',()=>{for(const s of ['', 'سلام', 'پژوهش يک ك', '\ufefftext', '\0\r\n', 'می\u200cروم 😀🌍', 'a\u0301', 'الف'.repeat(1000)]){const raw=enc.encode(s);assert.deepEqual(P.decode(P.encode(raw)),raw)}});
test('random unicode roundtrip',()=>{let x=2026;for(let i=0;i<1000;i++){let s='';for(let j=0;j<i%40;j++){x=(Math.imul(x,1664525)+1013904223)>>>0;let n=x%0x110000;if(n>=0xd800&&n<=0xdfff)n=0x20;s+=String.fromCodePoint(n)}const b=enc.encode(s);assert.deepEqual(P.decode(P.encode(b)),b)}});
test('reject malformed and invalid UTF-8',()=>{const b=P.encode(enc.encode('سلام'));for(const bad of [b.slice(0,-1),Uint8Array.from([...b,0]),Uint8Array.from([0,...b.slice(1)]),Uint8Array.from(b,(x,i)=>i===13?x^1:x)])assert.throws(()=>P.decode(bad));const p=P.encode(enc.encode('س'));p[p.length-1]|=1;assert.throws(()=>P.decode(p));for(const raw of [[255],[0xc0,0x80],[0xed,0xa0,0x80]])assert.throws(()=>P.encode(Uint8Array.from(raw)))});

test('new decoder matches legacy on valid and mutated records',()=>{
  const old=require('./fixtures/legacy-codec.js');let seed=0x12345678;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed};
  function outcome(codec,record,limit){try{return {ok:true,bytes:Buffer.from(codec.decode(record,limit)).toString('hex')}}catch{return {ok:false}}}
  for(let i=0;i<2000;i++){
    let s='';const len=random()%80;
    for(let j=0;j<len;j++){let cp=random()%0x110000;if(cp>=0xd800&&cp<=0xdfff)cp=32;s+=String.fromCodePoint(cp)}
    if(i%3===0)s+='سلام پ می\u200cروم 0123😀';
    let record=P.encode(enc.encode(s));
    assert.deepEqual(outcome(P,record,10000),outcome(old,record,10000));
    if(record.length){const bad=record.slice();const at=random()%bad.length;bad[at]^=1<<(random()%8);assert.deepEqual(outcome(P,bad,10000),outcome(old,bad,10000));}
    assert.deepEqual(outcome(P,record,random()%120),outcome(old,record,seed%120));
  }
});

test('malformed escapes, invalid UTF-8, limits, and nonzero offsets',()=>{
  function record(payload,bits,output='') {const result=new Uint8Array(17+payload.length);result.set([80,54,84,88,1]);let v=new DataView(result.buffer);v.setBigUint64(5,BigInt(bits));v.setUint32(13,P.crc32(enc.encode(output)));result.set(payload,17);return result}
  // Escape followed by an ASCII byte that belongs to the fixed table: noncanonical.
  assert.throws(()=>P.decode(record([0xfc,0x30],16,'0')));
  // Invalid UTF-8 byte in an escape, as well as incomplete escape.
  assert.throws(()=>P.decode(record([0xfc,0xff],16)));
  assert.throws(()=>P.decode(record([0xfc],6)));
  const source=P.encode(enc.encode('سلام 😀'));const wrapped=new Uint8Array(source.length+5);wrapped.set(source,3);
  assert.deepEqual(P.decode(wrapped.subarray(3,3+source.length)),enc.encode('سلام 😀'));
  assert.throws(()=>P.decode(source,1));
});

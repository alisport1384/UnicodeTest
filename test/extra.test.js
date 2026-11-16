const test=require('node:test'),assert=require('node:assert/strict'),P=require('../codec.js'),E=require('../english-codec.js'),I=require('../image-codec.js');
const utf8=new TextEncoder();
test('english table has distinct versioned magic, roundtrips Unicode, and is incompatible with P6TX',()=>{
 assert.equal(E.TABLE.length,63);for(const s of ['', 'English text! 123\n', 'سلام and emoji 😀', 'The quick brown fox. '.repeat(500)]){const raw=utf8.encode(s),b=E.encode(raw);assert.equal(Buffer.from(b.subarray(0,4)).toString(),'P6TE');assert.deepEqual(E.decode(b),raw);assert.throws(()=>P.decode(b));assert.throws(()=>E.decode(P.encode(raw)));}
});
test('english malformed data and CRC are rejected',()=>{const b=E.encode(utf8.encode('hello'));b[13]^=1;assert.throws(()=>E.decode(b));assert.throws(()=>E.decode(b.subarray(0,b.length-1)))});
test('image codec recovers exact bytes and checks CRC; gzip when worthwhile',async()=>{
 const raw=Uint8Array.from({length:10000},(_,i)=>i%5);const frame=await I.encode(raw);assert.equal(frame[4],1);assert.ok(frame.length<raw.length);assert.deepEqual(await I.decode(frame),raw);
 const corrupt=frame.slice();corrupt[9]^=1;await assert.rejects(I.decode(corrupt));const bad=frame.slice();bad[4]=2;await assert.rejects(I.decode(bad));
});
test('image codec raw fallback, malformed headers, bounds',async()=>{
 const raw=Uint8Array.from([137,80,78,71,13,10,26,10,11,22,33]);const frame=await I.encode(raw);assert.equal(frame[4],0);assert.deepEqual(await I.decode(frame),raw);await assert.rejects(I.decode(frame.slice(0,-1)));const bad=frame.slice();new DataView(bad.buffer).setUint32(5,I.MAX+1);await assert.rejects(I.decode(bad));
});
test('image decoder limits expanded output regardless of claimed length',async()=>{const a=await I.encode(new Uint8Array(10000));let h=a.slice();new DataView(h.buffer).setUint32(5,1);await assert.rejects(I.decode(h));});

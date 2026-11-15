const test=require('node:test'),assert=require('node:assert/strict'),P=require('../codec.js'),profile=require('../profile.js').profile,enc=new TextEncoder();
test('profile decoder matches production and records counts',()=>{
 for(const s of ['', 'سلام', 'پژوهش می\u200cکنم 😀 X', '\ufeff\0\r\n', 'A'.repeat(500)]){
  const bytes=enc.encode(s),record=P.encode(bytes),r=profile(record);
  assert.deepEqual(r.bytes,bytes);assert.equal(r.text,s);assert.deepEqual(r.bytes,P.decode(record));
  assert.equal(r.counts.table_tokens+r.counts.escape_tokens,Array.from(s).length);
  for(const value of Object.values(r.timings))assert.ok(Number.isFinite(value)&&value>=0);
 }
});
test('profile rejects corrupt records and output limits',()=>{
 const record=P.encode(enc.encode('سلام😀'));const bad=record.slice();bad[13]^=1;
 assert.throws(()=>profile(bad));assert.throws(()=>profile(record.slice(0,-1)));assert.throws(()=>profile(record,1));
});
test('profile and production agree across random unicode',()=>{
 let x=2026;for(let i=0;i<500;i++){let s='';for(let j=0;j<i%25;j++){x=(Math.imul(x,1664525)+1013904223)>>>0;let n=x%0x110000;if(n>=0xd800&&n<=0xdfff)n=32;s+=String.fromCodePoint(n)}const raw=enc.encode(s),p=P.encode(raw);assert.deepEqual(profile(p).bytes,P.decode(p))}
});

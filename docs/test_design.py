import struct,zlib,random,time,statistics
T='ابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'+' '+'۰۱۲۳۴۵۶۷۸۹'+'0123456789'+'،.؟!:\n\u200c-()/'
assert len(T)==63 and len(set(T))==63
M={c:i for i,c in enumerate(T)}
HEADER=struct.Struct('>4sBQI')
def encode(raw):
 s=raw.decode('utf-8','strict'); acc=0; n=0; bits=0; out=bytearray()
 def put(v,k):
  nonlocal acc,n,bits
  acc=(acc<<k)|v; n+=k; bits+=k
  while n>=8:
   n-=8; out.append((acc>>n)&255); acc &= (1<<n)-1
 for c in s:
  if c in M: put(M[c],6)
  else:
   b=c.encode('utf-8'); put(63,6); put(len(b)-1,2)
   for x in b: put(x,8)
 if n: out.append(acc<<(8-n))
 return HEADER.pack(b'P6TX',1,bits,zlib.crc32(raw))+out

def decode(blob, limit=10_000_000):
 if len(blob)<HEADER.size: raise ValueError('header')
 magic,ver,bits,checksum=HEADER.unpack_from(blob)
 if magic!=b'P6TX' or ver!=1: raise ValueError('format')
 if bits>limit*6: raise ValueError('limit')
 data=blob[HEADER.size:]
 if len(data)!=(bits+7)//8: raise ValueError('size')
 if bits%8 and data[-1]&((1<<(8-bits%8))-1): raise ValueError('padding')
 pos=0
 def get(n):
  nonlocal pos
  if pos+n>bits: raise ValueError('truncated token')
  x=0
  for _ in range(n):
   x=(x<<1)|((data[pos//8]>>(7-pos%8))&1); pos+=1
  return x
 out=bytearray()
 while pos<bits:
  v=get(6)
  if v<63: b=T[v].encode('utf-8')
  else:
   length=get(2)+1; b=bytes(get(8) for _ in range(length))
   try: c=b.decode('utf-8','strict')
   except UnicodeDecodeError: raise ValueError('invalid utf8')
   if len(c)!=1 or c in M: raise ValueError('noncanonical')
  out.extend(b)
  if len(out)>limit: raise ValueError('output limit')
 if zlib.crc32(out)!=checksum: raise ValueError('checksum')
 return bytes(out)

def reject(x):
 try: decode(x)
 except (ValueError, UnicodeError): return
 raise AssertionError('not rejected')

samples=['','سلام','متن فارسی با نیم\u200cفاصله، عدد ۱۲۳ و 123.','پژوهش و کیك و يک آزمون!','English text 100%','😀🌍','\x00\r\n','الف\u0301','آزمایش' * 1000]
for s in samples: assert decode(encode(s.encode()))==s.encode()
r=random.Random(2026)
for _ in range(1000):
 chars=[]
 for _ in range(r.randrange(100)):
  c=r.randrange(0x110000)
  if not 0xd800<=c<=0xdfff: chars.append(chr(c))
 b=''.join(chars).encode(); assert decode(encode(b))==b
v=encode('سلام'.encode()); assert v[17:].hex()=='35901a'
reject(v[:-1]); reject(v+b'\x00'); reject(b'XXXX'+v[4:]); q=bytearray(v);q[13]^=1;reject(q)
p=bytearray(encode('س'.encode()));p[-1]|=1;reject(p)
for raw in [b'\xff',b'\xc0\x80',b'\xed\xa0\x80']:
 try: encode(raw)
 except UnicodeDecodeError: pass
 else: raise AssertionError('invalid input')
print('PASS: 9 fixed cases, 1000 randomized Unicode roundtrips, 5 malformed containers, 3 invalid UTF-8 cases')
for name,s in [('سلام','سلام'),('فارسی تکراری','این یک متن فارسی برای بررسی اندازه و سرعت خواندن است.\n'*10000),('ترکیبی','سلام دنیا! Hello world 123 😀\n'*10000),('انگلیسی','The quick brown fox jumps over the lazy dog.\n'*10000)]:
 raw=s.encode(); t=time.perf_counter(); b=encode(raw); enc=time.perf_counter()-t
 times=[]
 for _ in range(3):
  t=time.perf_counter(); res=decode(b); times.append(time.perf_counter()-t); assert res==raw
 d=statistics.median(times)
 print(f'{name}: input={len(raw)} output={len(b)} payload={len(b)-17} change={(len(b)/len(raw)-1)*100:.2f}% encode_s={enc:.3f} decode_median_s={d:.3f} decoded_MB_s={len(raw)/d/1e6:.3f}')
print('سلام bytes:',v.hex(), 'table len:',len(T))

/* Gerador de ZIP sem compressão (CRC32 + estrutura ZIP) */

const CRC_TAB = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TAB[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

// zip sem compressão (suficiente para um xlsx pequeno)
function zip(arquivos) {
  const enc = new TextEncoder();
  const partes = [], central = [];
  let off = 0;
  arquivos.forEach(([nome, conteudo]) => {
    const n = enc.encode(nome), d = enc.encode(conteudo), crc = crc32(d);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, d.length, true); lh.setUint32(22, d.length, true);
    lh.setUint16(26, n.length, true); lh.setUint16(28, 0, true);
    partes.push(new Uint8Array(lh.buffer), n, d);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, d.length, true); ch.setUint32(24, d.length, true);
    ch.setUint16(28, n.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), n);
    off += 30 + n.length + d.length;
  });
  const tamCentral = central.reduce((a, x) => a + x.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, arquivos.length, true); eo.setUint16(10, arquivos.length, true);
  eo.setUint32(12, tamCentral, true); eo.setUint32(16, off, true);
  const todos = [...partes, ...central, new Uint8Array(eo.buffer)];
  const out = new Uint8Array(todos.reduce((a, x) => a + x.length, 0));
  let p = 0; todos.forEach(x => { out.set(x, p); p += x.length; });
  return out;
}

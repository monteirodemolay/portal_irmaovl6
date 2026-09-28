/*
 * cripta-core.js
 * Núcleo criptográfico da Cripta. Funciona no navegador (offline) e no Node 18+.
 *
 * Formato do arquivo lacrado (.lacre), versão CRIPTA/2:
 *
 *   "CRIPTA02" (8 bytes)
 *   u32 BE     tamanho do cabeçalho público
 *   cabeçalho público (JSON UTF-8, sem nada sigiloso)
 *   área de dados: cada item cifrado em blocos AES-256-GCM
 *   índice cifrado (JSON com a lista de itens, também AES-256-GCM)
 *   rodapé (32 bytes): u32 BE offsetÍndiceAlto | u32 BE offsetÍndiceBaixo |
 *                      u32 BE tamanhoÍndice | 12 bytes IV do índice | "CRIPTAFI"
 *
 * A chave (32 bytes) nunca é gravada no arquivo. Ela é dividida em partes
 * (Shamir, GF(256)): uma parte em cada pen drive e uma no envelope lacrado
 * do Termo. Com k partes quaisquer a chave é reconstruída.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CriptaCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const cryptoObj = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle)
    ? globalThis.crypto
    : require('crypto').webcrypto;
  const subtle = cryptoObj.subtle;

  const MAGIC = 'CRIPTA02';
  const MAGIC_FIM = 'CRIPTAFI';
  const FORMATO = 'CRIPTA/2';
  const TAM_BLOCO = 16 * 1024 * 1024;      // 16 MB por bloco cifrado
  const TAM_BLOCO_HASH = 64 * 1024 * 1024; // 64 MB por bloco na impressão digital
  const X_ENVELOPE = 200;                  // número da parte guardada no envelope do Termo

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------------- utilidades ---------------- */
  function aleatorio(n) { const b = new Uint8Array(n); cryptoObj.getRandomValues(b); return b; }
  function paraHex(b) { return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); }
  function deHex(h) {
    const s = h.replace(/[^0-9a-f]/gi, '');
    if (s.length % 2) throw new Error('Hexadecimal inválido');
    const out = new Uint8Array(s.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }
  function paraB64(b) {
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deB64(s) { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function concat(partes) {
    const total = partes.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(total); let o = 0;
    for (const p of partes) { out.set(p, o); o += p.length; }
    return out;
  }
  function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; }
  function lerU32(b, o) { return new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o); }
  async function sha256(bytes) { return new Uint8Array(await subtle.digest('SHA-256', bytes)); }

  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I
  function codigoAleatorio(n) { const r = aleatorio(n); return Array.from(r, (x) => ALFABETO[x % 32]).join(''); }
  function gerarCodigoLacracao(ano) { return `LAC-${ano}-${codigoAleatorio(4)}`; }
  function codigoPenDrive(codigoLacracao, indice) {
    const letra = String.fromCharCode(65 + indice);
    const sufixo = codigoLacracao.split('-').pop();
    return `PD-${letra}-${sufixo}-${String(indice + 1).padStart(2, '0')}`;
  }

  /* ---------------- Shamir em GF(256) ---------------- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x ^= (x << 1) ^ ((x & 0x80) ? 0x1b : 0); // multiplica por 3
      x &= 0xff;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }
  function gdiv(a, b) { if (b === 0) throw new Error('divisão por zero'); return a === 0 ? 0 : EXP[(LOG[a] + 255 - LOG[b]) % 255]; }

  // Coeficientes independentes e aleatórios; nunca derivados da chave.
  function gerarCoeficientes(chave, k) {
    if (!(chave instanceof Uint8Array) || chave.length !== 32 || !Number.isInteger(k) || k < 2 || k > 255)
      throw new Error('Parâmetros da divisão da chave inválidos');
    return Array.from({ length: k - 1 }, () => aleatorio(chave.length));
  }
  function parteDaChave(chave, x, k, coefs) {
    if (!Number.isInteger(x) || x < 1 || x > 255 || !Array.isArray(coefs) || coefs.length !== k - 1)
      throw new Error('Parte da chave inválida');
    const y = new Uint8Array(chave.length);
    for (let j = 0; j < chave.length; j++) {
      let acc = chave[j], xp = 1;
      for (let d = 0; d < coefs.length; d++) { xp = gmul(xp, x); acc ^= gmul(coefs[d][j], xp); }
      y[j] = acc;
    }
    return y;
  }
  function interpolarParte(partes, x) {
    if (!Number.isInteger(x) || x < 1 || x > 255 || !partes.length || new Set(partes.map((p) => p.x)).size !== partes.length)
      throw new Error('Partes da chave inválidas');
    if (partes.some((p) => p.y.length !== partes[0].y.length || p.x < 1 || p.x > 255)) throw new Error('Partes incompatíveis');
    const presente = partes.find((p) => p.x === x);
    if (presente) return presente.y.slice();
    const out = new Uint8Array(partes[0].y.length);
    for (let j = 0; j < out.length; j++) {
      for (let i = 0; i < partes.length; i++) {
        let peso = 1;
        for (let m = 0; m < partes.length; m++) if (m !== i) peso = gmul(peso, gdiv(x ^ partes[m].x, partes[i].x ^ partes[m].x));
        out[j] ^= gmul(partes[i].y[j], peso);
      }
    }
    return out;
  }
  function combinarPartes(partes) {
    // partes: [{x, y: Uint8Array}]
    const xs = partes.map((p) => p.x);
    if (new Set(xs).size !== xs.length) throw new Error('Partes repetidas');
    const len = partes[0].y.length;
    const out = new Uint8Array(len);
    for (let j = 0; j < len; j++) {
      let acc = 0;
      for (let i = 0; i < partes.length; i++) {
        let num = 1, den = 1;
        for (let m = 0; m < partes.length; m++) {
          if (m === i) continue;
          num = gmul(num, partes[m].x);
          den = gmul(den, partes[m].x ^ partes[i].x);
        }
        acc ^= gmul(partes[i].y[j], gdiv(num, den));
      }
      out[j] = acc;
    }
    return out;
  }
  async function codificarParte(codigoLacracao, x, k, y) {
    const corpo = `CRIPTA2:${codigoLacracao}:x=${x}:k=${k}:${paraHex(y)}`;
    const cs = paraHex((await sha256(enc.encode(corpo))).subarray(0, 4));
    return `${corpo}:${cs}`;
  }
  async function decodificarParte(texto) {
    const t = texto.trim();
    const m = t.match(/^CRIPTA2:([A-Z0-9-]+):x=(\d+):k=(\d+):([0-9a-f]+):([0-9a-f]{8})$/i);
    if (!m) throw new Error('Parte da chave em formato inválido');
    const corpo = t.slice(0, t.lastIndexOf(':'));
    const cs = paraHex((await sha256(enc.encode(corpo))).subarray(0, 4));
    if (cs !== m[5].toLowerCase()) throw new Error('Parte da chave com erro de digitação (verificador não confere)');
    const x = +m[2], k = +m[3], y = deHex(m[4]);
    if (x < 1 || x > 255 || k < 2 || k > 255 || y.length !== 32) throw new Error('Parte da chave inválida');
    return { codigoLacracao: m[1], x, k, y };
  }
  async function reconstruirChave(textosPartes, codigoEsperado, verificadorChave) {
    const partes = [];
    for (const t of textosPartes) {
      const p = await decodificarParte(t);
      if (codigoEsperado && p.codigoLacracao !== codigoEsperado) throw new Error(`Parte de outra lacração (${p.codigoLacracao})`);
      if (partes.length && p.k !== partes[0].k) throw new Error('Partes com limites diferentes');
      if (!partes.some((q) => q.x === p.x)) partes.push(p);
    }
    if (!partes.length) throw new Error('Nenhuma parte informada');
    const k = partes[0].k;
    if (partes.length < k) throw new Error(`São necessárias ${k} partes diferentes; informadas ${partes.length}`);
    const chave = combinarPartes(partes.slice(0, k));
    if (verificadorChave && (await verificadorDaChave(chave)) !== verificadorChave) throw new Error('As partes não formam a chave correta');
    return chave;
  }
  async function verificadorDaChave(chave) { return paraHex((await sha256(concat([enc.encode('CRIPTA-VERIF'), chave]))).subarray(0, 8)); }

  /* ---------------- AES-256-GCM em blocos ---------------- */
  async function importarChave(chave) { return subtle.importKey('raw', chave, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  function ivDoBloco(ivBase, i) { const iv = ivBase.slice(); const dv = new DataView(iv.buffer); dv.setUint32(8, dv.getUint32(8) ^ i); return iv; }
  function aad(codigoLacracao, itemId, i) { return enc.encode(`${codigoLacracao}|${itemId}|${i}`); }

  async function cifrarItem(ck, codigoLacracao, itemId, bytes) {
    const ivBase = aleatorio(12); const blocos = [];
    const n = Math.max(1, Math.ceil(bytes.length / TAM_BLOCO));
    for (let i = 0; i < n; i++) {
      const parte = bytes.subarray(i * TAM_BLOCO, Math.min(bytes.length, (i + 1) * TAM_BLOCO));
      const c = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ivDoBloco(ivBase, i), additionalData: aad(codigoLacracao, itemId, i) }, ck, parte));
      blocos.push(c);
    }
    return { ivBase, blocos };
  }
  async function decifrarItem(ck, codigoLacracao, entrada, ler, inicioDados) {
    const ivBase = deB64(entrada.iv); const partes = []; let o = inicioDados + entrada.offset;
    for (let i = 0; i < entrada.blocos.length; i++) {
      const c = await ler(o, entrada.blocos[i]); o += entrada.blocos[i];
      partes.push(new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: ivDoBloco(ivBase, i), additionalData: aad(codigoLacracao, entrada.id, i) }, ck, c)));
    }
    return concat(partes);
  }

  /* ---------------- criação do pacote ---------------- */
  /**
   * itens: [{ meta: {tipo:'carta'|'anexo', codigoCarta, codigoIrmao, membroId, nomeIrmao, nome, mime, ...},
   *           obterBytes: async () => Uint8Array }]
   * Retorna { partes: Uint8Array[], tamanho, cabecalho, chave, resumo }.
   */
  async function criarPacote({ codigoLacracao, loja, itens, k, nPenDrives, aoProgredir }) {
    const chave = aleatorio(32);
    const ck = await importarChave(chave);
    const cabecalho = {
      formato: FORMATO, codigoLacracao, loja: loja || '', criadoEm: new Date().toISOString(),
      totalItens: itens.length,
      totalCartas: itens.filter((i) => i.meta.tipo === 'carta').length,
      totalIrmaos: new Set(itens.map((i) => i.meta.codigoIrmao)).size,
      cifra: 'AES-256-GCM', tamanhoBloco: TAM_BLOCO,
      chave: { esquema: 'Shamir GF(256)', k, partesPenDrive: nPenDrives, parteEnvelope: X_ENVELOPE, verificador: await verificadorDaChave(chave) },
    };
    const cabBytes = enc.encode(JSON.stringify(cabecalho));
    const partes = [enc.encode(MAGIC), u32(cabBytes.length), cabBytes];
    const indice = []; let offset = 0;
    for (let n = 0; n < itens.length; n++) {
      const it = itens[n];
      const bytes = await it.obterBytes();
      const id = `i${String(n + 1).padStart(5, '0')}`;
      const { ivBase, blocos } = await cifrarItem(ck, codigoLacracao, id, bytes);
      indice.push({ ...it.meta, id, tamanho: bytes.length, offset, iv: paraB64(ivBase), blocos: blocos.map((b) => b.length), sha256: paraHex(await sha256(bytes)) });
      for (const b of blocos) { partes.push(b); offset += b.length; }
      if (aoProgredir) aoProgredir(n + 1, itens.length, it.meta);
    }
    const ivIdx = aleatorio(12);
    const idxCif = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ivIdx, additionalData: aad(codigoLacracao, '__indice__', 0) }, ck, enc.encode(JSON.stringify(indice))));
    partes.push(idxCif);
    const rodape = concat([u32(Math.floor(offset / 2 ** 32)), u32(offset % 2 ** 32), u32(idxCif.length), ivIdx, enc.encode(MAGIC_FIM)]);
    partes.push(rodape);
    const tamanho = partes.reduce((a, p) => a + p.length, 0);
    return { partes, tamanho, cabecalho, chave };
  }

  /* ---------------- leitura ---------------- */
  // ler(offset, tamanho) => Promise<Uint8Array>; permite ler arquivos grandes por partes.
  async function lerCabecalho(ler, tamanhoArquivo) {
    const ini = await ler(0, 12);
    if (dec.decode(ini.subarray(0, 8)) !== MAGIC) throw new Error('Não é um arquivo da Cripta');
    const hlen = lerU32(ini, 8);
    const cabecalho = JSON.parse(dec.decode(await ler(12, hlen)));
    const rod = await ler(tamanhoArquivo - 32, 32);
    if (dec.decode(rod.subarray(24, 32)) !== MAGIC_FIM) throw new Error('Arquivo incompleto ou corrompido (rodapé ausente)');
    const offIdx = lerU32(rod, 0) * 2 ** 32 + lerU32(rod, 4);
    return { cabecalho, inicioDados: 12 + hlen, offIdx, lenIdx: lerU32(rod, 8), ivIdx: rod.slice(12, 24) };
  }
  async function abrirIndice(ler, tamanhoArquivo, chave) {
    const info = await lerCabecalho(ler, tamanhoArquivo);
    const ck = await importarChave(chave);
    const idxCif = await ler(info.inicioDados + info.offIdx, info.lenIdx);
    let indice;
    try {
      indice = JSON.parse(dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv: info.ivIdx, additionalData: aad(info.cabecalho.codigoLacracao, '__indice__', 0) }, ck, idxCif)));
    } catch (e) { throw new Error('Chave incorreta ou índice corrompido'); }
    return { ...info, ck, indice };
  }
  async function extrairItem(aberto, ler, entrada) {
    const bytes = await decifrarItem(aberto.ck, aberto.cabecalho.codigoLacracao, entrada, ler, aberto.inicioDados);
    if (paraHex(await sha256(bytes)) !== entrada.sha256) throw new Error(`Item ${entrada.id} não confere com a impressão digital`);
    return bytes;
  }

  /* ---------------- impressão digital do arquivo ---------------- */
  // SHA-256 da concatenação dos SHA-256 de cada bloco de 64 MB (funciona com arquivos grandes).
  async function impressaoDigital(ler, tamanho, aoProgredir) {
    const hs = [];
    for (let o = 0; o < tamanho; o += TAM_BLOCO_HASH) {
      const n = Math.min(TAM_BLOCO_HASH, tamanho - o);
      hs.push(await sha256(await ler(o, n)));
      if (aoProgredir) aoProgredir(Math.min(o + n, tamanho), tamanho);
    }
    return paraHex(await sha256(concat([enc.encode(`CRIPTA-HASH|${tamanho}|`), ...hs])));
  }
  function leitorDeBytes(bytes) { return async (o, n) => bytes.subarray(o, o + n); }
  function leitorDePartes(partes) { const b = concat(partes); return leitorDeBytes(b); }

  return {
    FORMATO, X_ENVELOPE, TAM_BLOCO,
    aleatorio, paraHex, deHex, paraB64, deB64, concat, sha256,
    gerarCodigoLacracao, codigoPenDrive, codigoAleatorio,
    gerarCoeficientes, parteDaChave, interpolarParte, combinarPartes, codificarParte, decodificarParte, reconstruirChave, verificadorDaChave,
    criarPacote, lerCabecalho, abrirIndice, extrairItem, impressaoDigital, leitorDeBytes, leitorDePartes,
  };
});

// Teste do núcleo criptográfico. Rodar com: node tools/cripta-offline/teste-core.js
const C = require('./cripta-core.js');
const assert = require('assert');

(async () => {
  const enc = new TextEncoder();
  const codigo = C.gerarCodigoLacracao(2026);
  const video = new Uint8Array(40 * 1024 * 1024 + 123).map((_, i) => (i * 31 + 7) & 255); // força mais de um bloco de 16 MB
  const itens = [
    { meta: { tipo: 'carta', codigoCarta: 'CRP-26-0417-K7Q3-C1', codigoIrmao: 'CRP-26-0417-K7Q3', membroId: 'm1', nome: 'carta.json', mime: 'application/json' },
      obterBytes: async () => enc.encode(JSON.stringify({ titulo: 'A mim mesmo', texto: 'Meus irmãos, ...' })) },
    { meta: { tipo: 'anexo', codigoCarta: 'CRP-26-0417-K7Q3-C1', codigoIrmao: 'CRP-26-0417-K7Q3', membroId: 'm1', nome: 'recado.mp4', mime: 'video/mp4' },
      obterBytes: async () => video },
    { meta: { tipo: 'carta', codigoCarta: 'CRP-26-0452-M2X8-C1', codigoIrmao: 'CRP-26-0452-M2X8', membroId: 'm2', nome: 'carta.json', mime: 'application/json' },
      obterBytes: async () => enc.encode('{"titulo":"Família","texto":"..."}') },
  ];
  const k = 2, n = 3;
  const pac = await C.criarPacote({ codigoLacracao: codigo, loja: 'Teste', itens, k, nPenDrives: n });
  const arquivo = C.concat(pac.partes);
  assert.strictEqual(arquivo.length, pac.tamanho);
  const ler = C.leitorDeBytes(arquivo);

  // impressão digital estável
  const h1 = await C.impressaoDigital(ler, arquivo.length);
  const h2 = await C.impressaoDigital(ler, arquivo.length);
  assert.strictEqual(h1, h2);

  // corrupção é detectada
  const corrompido = arquivo.slice(); corrompido[5000] ^= 1;
  assert.notStrictEqual(await C.impressaoDigital(C.leitorDeBytes(corrompido), corrompido.length), h1);

  // partes da chave: 3 pen drives + envelope
  const partes = [];
  const coefs = C.gerarCoeficientes(pac.chave, k);
  for (let x = 1; x <= n; x++) partes.push(await C.codificarParte(codigo, x, k, C.parteDaChave(pac.chave, x, k, coefs)));
  const envelope = await C.codificarParte(codigo, C.X_ENVELOPE, k, C.parteDaChave(pac.chave, C.X_ENVELOPE, k, coefs));
  assert.notDeepStrictEqual(C.parteDaChave(pac.chave, 1, k, C.gerarCoeficientes(pac.chave, k)),
    C.parteDaChave(pac.chave, 1, k, C.gerarCoeficientes(pac.chave, k)));
  const verif = pac.cabecalho.chave.verificador;

  // qualquer combinação de 2 abre
  const combos = [[0, 1], [0, 2], [1, 2]];
  for (const [a, b] of combos) assert.deepStrictEqual(await C.reconstruirChave([partes[a], partes[b]], codigo, verif), pac.chave);
  assert.deepStrictEqual(await C.reconstruirChave([partes[2], envelope], codigo, verif), pac.chave); // 1 pen drive + envelope
  await assert.rejects(C.reconstruirChave([partes[0], await C.codificarParte('LAC-2026-OUTRO', 2, k,
    C.parteDaChave(pac.chave, 2, k, coefs))], codigo, verif));

  // uma parte só não basta
  await assert.rejects(C.reconstruirChave([partes[0]], codigo, verif));
  // uma única parte não revela a chave byte a byte (grau exato)
  const y1 = (await C.decodificarParte(partes[0])).y;
  let iguais = 0; for (let j = 0; j < 32; j++) if (y1[j] === pac.chave[j]) iguais++;
  assert.ok(iguais < 6, 'parte parece vazar a chave');
  // erro de digitação é detectado
  const errada = partes[0].replace(/:([0-9a-f])([0-9a-f]{7})$/, (m, a, b) => ':' + (a === '0' ? '1' : '0') + b);
  await assert.rejects(C.decodificarParte(errada.replace(/x=1/, 'x=1')));
  const trocada = partes[0].slice(0, 40) + (partes[0][40] === 'a' ? 'b' : 'a') + partes[0].slice(41);
  await assert.rejects(C.decodificarParte(trocada));

  // reemissão da parte de um pen drive substituto é idêntica
  const chave = await C.reconstruirChave([partes[0], envelope], codigo, verif);
  const presentes = [await C.decodificarParte(partes[0]), await C.decodificarParte(envelope)];
  assert.strictEqual(await C.codificarParte(codigo, 3, k, C.interpolarParte(presentes, 3)), partes[2]);
  const formatoAntigo = arquivo.slice(); formatoAntigo.set(enc.encode('CRIPTA01'), 0);
  await assert.rejects(C.lerCabecalho(C.leitorDeBytes(formatoAntigo), formatoAntigo.length));

  // abrir índice e extrair
  const aberto = await C.abrirIndice(ler, arquivo.length, chave);
  assert.strictEqual(aberto.indice.length, 3);
  const v = await C.extrairItem(aberto, ler, aberto.indice[1]);
  assert.deepStrictEqual(v, video);
  const carta = JSON.parse(new TextDecoder().decode(await C.extrairItem(aberto, ler, aberto.indice[0])));
  assert.strictEqual(carta.titulo, 'A mim mesmo');

  // chave errada falha
  await assert.rejects(C.abrirIndice(ler, arquivo.length, C.aleatorio(32)));

  console.log('OK: todos os testes passaram. Código', codigo, 'impressão', h1.slice(0, 16) + '...');
})().catch((e) => { console.error('FALHOU', e); process.exit(1); });

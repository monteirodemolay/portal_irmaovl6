import { build } from 'esbuild';

// Empacota o código das Cloud Functions junto com o TypeScript-fonte de
// @vl6/domain, @vl6/infra e @vl6/shared num único lib/index.js CommonJS —
// evita precisar de um passo de build separado para cada pacote do
// monorepo só para o runtime do Cloud Functions conseguir dar `require()`.
// firebase-admin/firebase-functions/@google-cloud/firestore ficam de fora
// do bundle (resolvidos via node_modules normalmente, como o Cloud
// Functions runtime espera) — os três têm bindings gRPC nativos que não
// empacotam bem via esbuild.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-functions', '@google-cloud/firestore'],
});

console.log('functions build ok -> lib/index.js');

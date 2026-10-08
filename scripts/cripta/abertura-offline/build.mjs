#!/usr/bin/env node
// Bundles entry.ts (which reuses the Portal's real crypto modules) into a single IIFE and
// inlines it into index.html, producing one self-contained file a Guardião can open with
// no internet connection, no Node, no npm install — just a browser.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

const result = await build({
  entryPoints: [path.join(here, 'entry.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  preserveSymlinks: true, // Keep dependency paths stable across worktrees and pnpm stores.
  target: 'es2022',
  write: false,
  logLevel: 'info',
  // Fixed so the bundle's "// path" source comments (and thus the output bytes) never depend on
  // the invoking shell's cwd — otherwise offline-tool-build.test.ts would flag a false drift
  // whenever this ran from a different directory than the test does.
  absWorkingDir: path.join(here, '../../..'),
});

const bundle = result.outputFiles[0].text;
const template = readFileSync(path.join(here, 'template.html'), 'utf8');
const output = template.replace('/*__CRIPTA_OFFLINE_BUNDLE__*/', bundle);
writeFileSync(path.join(here, 'index.html'), output);
console.log(
  'Escrito scripts/cripta/abertura-offline/index.html —',
  (output.length / 1024).toFixed(0),
  'KB',
);

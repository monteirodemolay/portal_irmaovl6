import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Guards against the committed scripts/cripta/abertura-offline/index.html drifting from its
 * source (entry.ts + template.html): whenever the crypto modules it bundles change, this test
 * fails until someone reruns `node scripts/cripta/abertura-offline/build.mjs` and commits the
 * result — the offline tool must never silently ship stale crypto to the Guardiões. */
describe('offline opening tool (scripts/cripta/abertura-offline)', () => {
  it('index.html matches a fresh build of entry.ts + template.html', async () => {
    const thisDir = path.dirname(fileURLToPath(import.meta.url));
    const here = path.join(thisDir, '../../../../..', 'scripts/cripta/abertura-offline');
    const result = await build({
      entryPoints: [path.join(here, 'entry.ts')],
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: 'es2022',
      write: false,
      logLevel: 'silent',
      absWorkingDir: path.join(here, '../../..'),
    });
    const bundle = result.outputFiles[0]!.text;
    const template = readFileSync(path.join(here, 'template.html'), 'utf8');
    const expected = template.replace('/*__CRIPTA_OFFLINE_BUNDLE__*/', bundle);
    const committed = readFileSync(path.join(here, 'index.html'), 'utf8');
    expect(
      committed,
      'index.html is stale — run `node scripts/cripta/abertura-offline/build.mjs` and commit the result',
    ).toBe(expected);
  });
});

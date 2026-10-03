import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { makeOfflinePackage } from './offline-package';

describe('pacote de carta offline', () => {
  it('inclui página local, anexo e manifesto íntegro sem interpretar texto como HTML', async () => {
    const blob = await makeOfflinePackage({ format: 'vl6-online-letter-v1', title: 'Lembrança',
      recipient: '<script>não executar</script>', body: 'Querida família\nUm abraço.',
      attachments: [{ kind: 'foto', name: 'foto.jpg', type: 'image/jpeg', data: btoa('foto') }] });
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const html = await zip.file('ABRA_AQUI_A_CARTA.html')!.async('string');
    const manifest = JSON.parse(await zip.file('manifesto.json')!.async('string')) as {
      files: Array<{ path: string; sha256: string }> };
    expect(html).toContain('Querida família');
    expect(html).toContain('&lt;script&gt;não executar&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('anexos/foto-1.jpg');
    expect(await zip.file('anexos/foto-1.jpg')!.async('string')).toBe('foto');
    expect(manifest.files).toHaveLength(1);
    expect(manifest.files[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

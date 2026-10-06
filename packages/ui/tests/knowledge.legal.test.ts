import { describe, expect, it } from 'vitest';
import { getPreparedLegalRevision } from '../../../apps/web/src/modules/legal/lib/prepared-revisions';
describe('Conhecimento — revisão jurídica aditiva', () => {
  it('preserva o texto vigente e prepara nova finalidade com novo aceite', () => {
    const current = '> **Versão:** 2.3.1\n\n## Biblioteca\nCondições vigentes da Biblioteca.';
    const r = getPreparedLegalRevision('politica_privacidade', '2.3.1', current)!;
    expect(r.versao).toBe('2.4.0');
    expect(r.exigeNovoAceite).toBe(true);
    expect(r.conteudoMarkdown).toContain('Condições vigentes da Biblioteca.');
    expect(r.conteudoMarkdown).toContain('> **Versão:** 2.4.0');
    expect(r.conteudoMarkdown).toContain('Não há ranking');
  });
  it('não prepara regressão ou duplicação após publicar a nova versão', () => {
    expect(getPreparedLegalRevision('termos_uso', '2.4.0', 'Texto publicado')).toBeNull();
    expect(getPreparedLegalRevision('termos_uso', '3.0.0', 'Texto publicado')).toBeNull();
  });
  it('mantém o fluxo jurídico anterior da versão inicial', () => {
    expect(getPreparedLegalRevision('termos_uso', '1.0.0', 'Texto original')?.versao).toBe('2.0.0');
  });
});

import { describe, expect, it } from 'vitest';
import {
  extractCoverSuggestion,
  extractBarcodeCandidate,
  extractSynopsisSuggestion,
  isValidIsbn,
  isValidIssn,
  normalizeBookCode,
} from './book-catalog-assistant';

describe('book catalog assistant', () => {
  it('normaliza EAN sem confundi-lo com ISBN', () => {
    expect(normalizeBookCode('0 070341 980460')).toBe('0070341980460');
    expect(extractBarcodeCandidate('Código: 0 070341 980460')).toBe('0070341980460');
    expect(isValidIsbn('0070341980460')).toBe(false);
  });

  it('valida ISBN-10 e ISBN-13', () => {
    expect(isValidIsbn('978-0-14032-872-1')).toBe(true);
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
  });

  it('valida ISSN e rejeita dígito verificador incorreto', () => {
    expect(isValidIssn('0378-5955')).toBe(true);
    expect(isValidIssn('0378-5954')).toBe(false);
    expect(isValidIssn('978-0-14032-872-1')).toBe(false);
  });

  it('sugere autor e título pela capa', () => {
    expect(
      extractCoverSuggestion(
        'MARK\nMATOUSEK\nCOMO EMERSON PODE MUDAR SUA VIDA\nLIÇÕES\nDE UM\nESTOICO',
      ),
    ).toEqual({ autor: 'MARK MATOUSEK', titulo: 'LIÇÕES DE UM ESTOICO' });
  });

  it('remove chamada e rodapé ao sugerir a sinopse', () => {
    const text = [
      '“O livro de Matousek ressuscita um Emerson que escrevia para ser ouvido.”',
      '— Wall Street Journal',
      '',
      'Um amante, professor e buscador espiritual de toda a vida de Ralph Waldo Emerson revela como os doze ensinamentos essenciais do filósofo americano contêm a resposta para viver uma vida autêntica e plena.',
      '',
      '0 070341 980460',
      'CDG Grupo Editorial',
    ].join('\n');
    expect(extractSynopsisSuggestion(text)).toContain('Um amante, professor');
    expect(extractSynopsisSuggestion(text)).not.toContain('Wall Street');
  });
});

/**
 * Normaliza nome próprio para a convenção brasileira: primeira letra de
 * cada palavra em maiúscula, restante em minúscula — exceto preposições/
 * artigos de ligação ("de", "da", "do", "das", "dos", "e"), que
 * permanecem em minúscula quando não são a primeira palavra. Usado na
 * importação de Irmãos (.xlsx e .pdf) para corrigir nomes digitados
 * inteiramente em maiúscula ou minúscula nas planilhas de origem.
 */

const LOWERCASE_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function formatBrazilianPersonName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;

  return trimmed
    .split(' ')
    .map((word, index) => {
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && LOWERCASE_CONNECTORS.has(lower)) return lower;
      return capitalizeWord(lower);
    })
    .join(' ');
}

function capitalizeWord(lowerWord: string): string {
  return lowerWord
    .split('-')
    .map((part) => (part ? part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1) : part))
    .join('-');
}

import type { LegalDocumentKey } from '@vl6/domain';

/** URL amigável ("politica-privacidade") <-> chave interna do domínio ("politica_privacidade"). */
export const LEGAL_DOCUMENT_SLUGS: Record<LegalDocumentKey, string> = {
  politica_privacidade: 'politica-privacidade',
  termos_uso: 'termos-uso',
};

export const LEGAL_DOCUMENT_TITLES: Record<LegalDocumentKey, string> = {
  politica_privacidade: 'Política de Privacidade',
  termos_uso: 'Termos de Uso',
};

export function resolveLegalDocumentKey(slug: string): LegalDocumentKey | null {
  const entry = (Object.entries(LEGAL_DOCUMENT_SLUGS) as [LegalDocumentKey, string][]).find(
    ([, value]) => value === slug,
  );
  return entry?.[0] ?? null;
}

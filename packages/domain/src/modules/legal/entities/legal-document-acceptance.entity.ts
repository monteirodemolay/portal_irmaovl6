import type { LegalDocumentKey } from './legal-document-version.entity';

/**
 * Registro de aceite de uma versão específica de um documento legal —
 * append-only, mesma natureza de `PublicationConsent`/`AuditLog`: nunca
 * sobrescreve um aceite anterior, cada novo aceite (inclusive o primeiro,
 * no cadastro) gera um novo registro. É a prova formal exigida no Termo de
 * Uso (Seção 2) e na Política de Privacidade — ver
 * docs/legal/04-sistema-de-versionamento.md.
 */
export interface LegalDocumentAcceptance {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly documento: LegalDocumentKey;
  readonly versaoAceita: string;
  readonly aceitoEm: Date;
  readonly ip: string | null;
  readonly userAgent: string | null;
  /** Hash SHA-256 do `conteudoMarkdown` da versão aceita, para prova de integridade — não depende de a versão nunca ser alterada, mas documenta exatamente qual conteúdo o usuário aceitou. */
  readonly hashVersao: string;
}

import type { LegalDocumentKey } from './legal-document-version.entity';

/**
 * De onde veio este aceite. `self_service` é o próprio usuário marcando os
 * checkboxes e confirmando (fluxo normal, com IP/User-Agent reais).
 * `migracao_pre_existente` é um aceite concedido administrativamente para
 * uma conta que já existia e estava em uso ANTES da v1.0.0 ser publicada —
 * nunca fabrica um clique que não aconteceu: `ip`/`userAgent` ficam `null`
 * e o motivo da concessão fica registrado, mesma lógica de honestidade de
 * `PublicationConsentSource`.
 */
export type LegalDocumentAcceptanceOrigin = 'self_service' | 'migracao_pre_existente';

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
  readonly origem: LegalDocumentAcceptanceOrigin;
}

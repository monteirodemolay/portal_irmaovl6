export type LegalDocumentKey = 'politica_privacidade' | 'termos_uso';

export type LegalDocumentClassification =
  | 'correcao'
  | 'adequacao'
  | 'nova_funcionalidade'
  | 'mudanca_juridica'
  | 'mudanca_operacional'
  | 'mudanca_seguranca'
  | 'mudanca_lgpd'
  | 'mudanca_institucional';

export type LegalDocumentImpact = 'baixo' | 'medio' | 'alto';

/**
 * Uma versão publicada da Política de Privacidade ou dos Termos de Uso —
 * append-only, mesma natureza de `AuditLog`/`PublicationConsent` (sem
 * `update`/`delete`, sem soft delete): nunca sobrescreve uma versão
 * anterior, cada mudança nasce como um novo registro. Ver
 * docs/legal/04-sistema-de-versionamento.md.
 *
 * Não existe hoje um fluxo de rascunho/aprovação em duas etapas — cada
 * chamada a `PublishLegalDocumentVersionUseCase` já nasce publicada. O
 * fluxo de rascunho→aprovação descrito no documento de versionamento é
 * trabalho futuro (processo institucional/checklist de PR), não uma
 * funcionalidade implementada nesta versão do sistema.
 */
export interface LegalDocumentVersion {
  readonly id: string;
  readonly tenantId: string;
  readonly documento: LegalDocumentKey;
  /** Semver "MAJOR.MINOR.PATCH", ex.: "1.2.0". */
  readonly versao: string;
  readonly classificacao: LegalDocumentClassification;
  readonly motivo: string;
  readonly impacto: LegalDocumentImpact;
  readonly itensAlterados: string[];
  /** Se true, usuários com aceite de versão anterior passam a ser sinalizados como pendentes. */
  readonly exigeNovoAceite: boolean;
  /** Snapshot completo do texto publicado, em Markdown. */
  readonly conteudoMarkdown: string;
  /** Resumo do que mudou em relação à versão anterior, usado no banner/modal de aceite. `null` na primeira versão de cada documento. */
  readonly diffResumo: string | null;
  /** uid de quem publicou. */
  readonly autor: string;
  /** Nome/cargo institucional informado por quem publicou (ex.: "Diretoria VL6"). */
  readonly responsavel: string;
  readonly publicadoEm: Date;
}

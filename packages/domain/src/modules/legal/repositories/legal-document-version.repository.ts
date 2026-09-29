import type {
  LegalDocumentKey,
  LegalDocumentVersion,
} from '../entities/legal-document-version.entity';

export interface ILegalDocumentVersionRepository {
  /** Único método de escrita — nunca update/delete, cada mudança é um novo registro. */
  append(version: LegalDocumentVersion): Promise<void>;
  /** Versão vigente (a mais recente) de um documento, ou `null` se nenhuma foi publicada ainda. */
  findCurrent(tenantId: string, documento: LegalDocumentKey): Promise<LegalDocumentVersion | null>;
  /** Histórico completo de um documento, mais recente primeiro. */
  listByDocumento(tenantId: string, documento: LegalDocumentKey): Promise<LegalDocumentVersion[]>;
}

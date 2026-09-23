import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import type { LegalDocumentKey } from '../entities/legal-document-version.entity';

export interface ILegalDocumentAcceptanceRepository {
  /** Único método de escrita — nunca update/delete, cada aceite é um novo registro. */
  append(acceptance: LegalDocumentAcceptance): Promise<void>;
  /** Aceite mais recente do usuário para um documento, ou `null` se ele nunca aceitou. */
  findLatestByUser(
    tenantId: string,
    userId: string,
    documento: LegalDocumentKey,
  ): Promise<LegalDocumentAcceptance | null>;
  /** Histórico completo de aceites do usuário (ambos os documentos), mais recente primeiro. */
  listByUser(tenantId: string, userId: string): Promise<LegalDocumentAcceptance[]>;
}

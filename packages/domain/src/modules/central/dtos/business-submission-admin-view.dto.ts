import type { BusinessPublicationStatus } from '@vl6/shared';

export interface BusinessSubmissionAdminViewDTO {
  memberId: string;
  memberNomeCompleto: string;
  businessId: string;
  nomeEmpresa: string;
  segmento: string | null;
  cidade: string | null;
  descricao: string | null;
  status: BusinessPublicationStatus;
  updatedAt: Date;
}

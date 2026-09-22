import type { LegalDocumentClassification, LegalDocumentImpact } from '@vl6/domain';

export const CLASSIFICATION_LABELS: Record<LegalDocumentClassification, string> = {
  correcao: 'Correção',
  adequacao: 'Adequação',
  nova_funcionalidade: 'Nova funcionalidade',
  mudanca_juridica: 'Mudança jurídica',
  mudanca_operacional: 'Mudança operacional',
  mudanca_seguranca: 'Mudança de segurança',
  mudanca_lgpd: 'Mudança de LGPD',
  mudanca_institucional: 'Mudança institucional',
};

export const IMPACT_LABELS: Record<LegalDocumentImpact, string> = {
  baixo: 'Impacto baixo',
  medio: 'Impacto médio',
  alto: 'Impacto alto',
};

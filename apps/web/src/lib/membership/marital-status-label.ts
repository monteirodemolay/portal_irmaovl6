import { MARITAL_STATUSES_WITH_SPOUSE, type MaritalStatus } from '@vl6/shared';

export const MARITAL_STATUS_LABELS: Record<MaritalStatus, string> = {
  solteiro: 'Solteiro(a)',
  casado: 'Casado(a)',
  uniao_estavel: 'União estável',
  separado_judicialmente: 'Separado(a) judicialmente',
  divorciado: 'Divorciado(a)',
  viuvo: 'Viúvo(a)',
};

/** Estados civis em que o cadastro coleta nome/data de nascimento da cônjuge. */
export function maritalStatusHasSpouse(status: MaritalStatus | null): boolean {
  return status !== null && MARITAL_STATUSES_WITH_SPOUSE.includes(status);
}

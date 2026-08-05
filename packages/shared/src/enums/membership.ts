export const MEMBER_DEGREES = ['aprendiz', 'companheiro', 'mestre'] as const;
export type MemberDegree = (typeof MEMBER_DEGREES)[number];

export const MEMBER_SITUATIONS = [
  'regular',
  'irregular',
  'remido',
  'inativo',
  'falecido',
  'transferido',
] as const;
export type MemberSituation = (typeof MEMBER_SITUATIONS)[number];

/** Situações que encerram automaticamente o cargo ativo do Irmão — docs/architecture/06 §6.1. */
export const TERMINAL_MEMBER_SITUATIONS: MemberSituation[] = ['falecido', 'transferido'];

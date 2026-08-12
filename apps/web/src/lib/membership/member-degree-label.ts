import type { MemberDegree } from '@vl6/shared';

/** Rótulo completo do grau simbólico — mesma fonte usada no cadastro, no selo e no perfil. */
export const MEMBER_DEGREE_LABELS: Record<MemberDegree, string> = {
  aprendiz: 'Aprendiz Maçom',
  companheiro: 'Companheiro Maçom',
  mestre: 'Mestre Maçom',
};

export const MEMBER_DEGREE_ORDINAL: Record<MemberDegree, string> = {
  aprendiz: '1º Grau',
  companheiro: '2º Grau',
  mestre: '3º Grau',
};

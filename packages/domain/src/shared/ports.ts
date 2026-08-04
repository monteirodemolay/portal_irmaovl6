/**
 * Portas de infraestrutura que o domínio depende apenas por interface —
 * implementadas em `packages/infra` (relógio real, IDs do Firestore) e
 * facilmente substituíveis por fakes determinísticos em teste.
 */
export interface IClock {
  now(): Date;
}

export interface IIdGenerator {
  next(): string;
}

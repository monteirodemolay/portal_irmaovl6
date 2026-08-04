import { Timestamp } from 'firebase-admin/firestore';
import type { BaseEntity } from '@vl6/domain';

export type FirestoreBaseFields = Omit<BaseEntity, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
};

/** Converte os campos-base de `BaseEntity` (Date) para o formato Firestore (Timestamp). */
export function baseFieldsToFirestore(entity: BaseEntity): FirestoreBaseFields {
  return {
    ...entity,
    createdAt: Timestamp.fromDate(entity.createdAt),
    updatedAt: Timestamp.fromDate(entity.updatedAt),
    deletedAt: entity.deletedAt ? Timestamp.fromDate(entity.deletedAt) : null,
  };
}

/** Converte os campos-base do formato Firestore (Timestamp) de volta para `BaseEntity` (Date). */
export function baseFieldsFromFirestore(data: FirestoreBaseFields): BaseEntity {
  return {
    ...data,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    deletedAt: data.deletedAt ? data.deletedAt.toDate() : null,
  };
}

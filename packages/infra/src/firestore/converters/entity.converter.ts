import type { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { BaseEntity } from '@vl6/domain';
import {
  baseFieldsFromFirestore,
  baseFieldsToFirestore,
  type FirestoreBaseFields,
} from './base.converter';

/**
 * Fábrica de `FirestoreDataConverter` para qualquer entidade que estenda
 * `BaseEntity` — elimina a repetição do mapeamento Timestamp↔Date em cada
 * repositório (docs/architecture/03-modelo-dados.md §3.1 aplica-se a todas
 * as coleções da mesma forma).
 */
export function createEntityConverter<T extends BaseEntity>(): FirestoreDataConverter<T> {
  return {
    toFirestore(entity: T) {
      const { id: _id, ...rest } = entity;
      return { ...rest, ...baseFieldsToFirestore(entity) };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data() as FirestoreBaseFields & Omit<T, keyof FirestoreBaseFields>;
      return { ...data, ...baseFieldsFromFirestore(data), id: snapshot.id } as unknown as T;
    },
  };
}

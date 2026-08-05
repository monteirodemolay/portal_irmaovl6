import {
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
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
 *
 * `extraDateFields` cobre campos de data próprios da entidade além dos de
 * `BaseEntity` (ex.: `Member.dataNascimento`, `Event.dataInicio`) — sem
 * isso, o SDK devolveria um `Timestamp` cru em vez de `Date` nesses campos.
 */
export function createEntityConverter<T extends BaseEntity>(
  extraDateFields: readonly (keyof T)[] = [],
): FirestoreDataConverter<T> {
  return {
    toFirestore(entity: T) {
      const { id: _id, ...rest } = entity;
      const converted: Record<string, unknown> = { ...rest, ...baseFieldsToFirestore(entity) };
      for (const field of extraDateFields) {
        const value = entity[field];
        if (value instanceof Date) {
          converted[field as string] = Timestamp.fromDate(value);
        }
      }
      return converted;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data() as FirestoreBaseFields & Omit<T, keyof FirestoreBaseFields>;
      const converted: Record<string, unknown> = {
        ...data,
        ...baseFieldsFromFirestore(data),
        id: snapshot.id,
      };
      for (const field of extraDateFields) {
        const value = converted[field as string];
        if (value instanceof Timestamp) {
          converted[field as string] = value.toDate();
        }
      }
      return converted as unknown as T;
    },
  };
}

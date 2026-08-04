import type { Firestore } from 'firebase-admin/firestore';
import type { IIdGenerator } from '@vl6/domain';

/** Gera IDs no mesmo formato que o Firestore usaria para `.add()`, sem criar o documento. */
export class FirestoreIdGenerator implements IIdGenerator {
  constructor(private readonly db: Firestore) {}

  next(): string {
    return this.db.collection('_id').doc().id;
  }
}

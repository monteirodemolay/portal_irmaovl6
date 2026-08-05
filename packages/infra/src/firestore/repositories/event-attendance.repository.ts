import type { Firestore } from 'firebase-admin/firestore';
import type { EventAttendance, IEventAttendanceRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'eventAttendance';
const DATE_FIELDS = ['respondidoEm'] as const;

export class FirestoreEventAttendanceRepository implements IEventAttendanceRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<EventAttendance>(DATE_FIELDS));
  }

  async findByEventAndMember(eventId: string, memberId: string): Promise<EventAttendance | null> {
    const snap = await this.collection
      .where('eventId', '==', eventId)
      .where('memberId', '==', memberId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async listByEvent(eventId: string): Promise<EventAttendance[]> {
    const snap = await this.collection.where('eventId', '==', eventId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async countConfirmedByEvent(eventId: string): Promise<number> {
    const snap = await this.collection
      .where('eventId', '==', eventId)
      .where('statusPresenca', '==', 'confirmado')
      .count()
      .get();
    return snap.data().count;
  }

  async create(attendance: EventAttendance): Promise<void> {
    await this.collection.doc(attendance.id).set(attendance);
  }

  async update(attendance: EventAttendance): Promise<void> {
    await this.collection.doc(attendance.id).set(attendance);
  }
}

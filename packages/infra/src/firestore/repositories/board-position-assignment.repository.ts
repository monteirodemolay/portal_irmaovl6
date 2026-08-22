import type { Firestore } from 'firebase-admin/firestore';
import type { BoardPositionAssignment, IBoardPositionAssignmentRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'boardPositionAssignments';

export class FirestoreBoardPositionAssignmentRepository implements IBoardPositionAssignmentRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<BoardPositionAssignment>());
  }

  async findById(id: string): Promise<BoardPositionAssignment | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async listByGestao(gestaoId: string): Promise<BoardPositionAssignment[]> {
    const snap = await this.collection.where('gestaoId', '==', gestaoId).get();
    return snap.docs.map((doc) => doc.data());
  }

  async findByGestaoAndCargo(
    gestaoId: string,
    cargo: string,
  ): Promise<BoardPositionAssignment | null> {
    const snap = await this.collection
      .where('gestaoId', '==', gestaoId)
      .where('cargo', '==', cargo)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async create(assignment: BoardPositionAssignment): Promise<void> {
    await this.collection.doc(assignment.id).set(assignment);
  }

  async update(assignment: BoardPositionAssignment): Promise<void> {
    await this.collection.doc(assignment.id).set(assignment);
  }
}

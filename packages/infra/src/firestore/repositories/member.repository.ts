import type { Firestore, Query } from 'firebase-admin/firestore';
import type {
  IMemberRepository,
  Member,
  MemberSearchFilters,
  PageRequest,
  PageResult,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'members';
const DATE_FIELDS = [
  'dataNascimento',
  'dataIniciacao',
  'dataElevacao',
  'dataExaltacao',
  'conjugeDataNascimento',
] as const;

export class FirestoreMemberRepository implements IMemberRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Member>(DATE_FIELDS));
  }

  async findById(id: string): Promise<Member | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByUserId(tenantId: string, userId: string): Promise<Member | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  async existsByCim(tenantId: string, cim: string): Promise<boolean> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('cim', '==', cim)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async search(filters: MemberSearchFilters, page: PageRequest): Promise<PageResult<Member>> {
    let query: Query<Member> = this.collection
      .where('tenantId', '==', filters.tenantId)
      .where('deletedAt', '==', null)
      .orderBy('nomeCompleto');

    if (filters.grau) query = query.where('grau', '==', filters.grau);
    if (filters.situacao) query = query.where('situacao', '==', filters.situacao);
    if (filters.cim) query = query.where('cim', '==', filters.cim);

    if (page.cursor) {
      const cursorDoc = await this.collection.doc(page.cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }

    const snap = await query.limit(page.limit + 1).get();
    const docs = snap.docs.slice(0, page.limit);
    const hasMore = snap.docs.length > page.limit;

    let items = docs.map((doc) => doc.data());
    if (filters.nome) {
      const needle = filters.nome.toLowerCase();
      items = items.filter((m) => m.nomeCompleto.toLowerCase().includes(needle));
    }
    if (filters.cidade) {
      const needle = filters.cidade.toLowerCase();
      items = items.filter((m) => m.endereco?.cidade.toLowerCase().includes(needle));
    }

    return {
      items,
      nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async countByTenant(tenantId: string): Promise<number> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .count()
      .get();
    return snap.data().count;
  }

  async create(member: Member): Promise<void> {
    await this.collection.doc(member.id).set(member);
  }

  async update(member: Member): Promise<void> {
    await this.collection.doc(member.id).set(member);
  }
}

import type { Firestore } from 'firebase-admin/firestore';
import type { FamilyPerson, IFamilyPersonRepository } from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'familyPersons';

export class FirestoreFamilyPersonRepository implements IFamilyPersonRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<FamilyPerson>(['dataNascimento', 'dataFalecimento']));
  }

  async findById(id: string): Promise<FamilyPerson | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? snap.data()! : null;
  }

  async findByLinkedMemberId(tenantId: string, memberId: string): Promise<FamilyPerson | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('linkedMemberId', '==', memberId)
      .where('deletedAt', '==', null)
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0]!.data();
  }

  /**
   * `nomeBusca` não tem índice de prefixo dedicado (mesma opção já tomada em
   * `member.repository.ts#search`: carrega o tenant inteiro — sem soft-delete
   * — e filtra em memória por `includes`). O volume por tenant de uma Loja é
   * pequeno o bastante pra isso não pesar; se crescer, um índice de prefixo
   * dedicado é o próximo passo.
   */
  async searchByNormalizedName(
    tenantId: string,
    nomeBusca: string,
    limit: number,
  ): Promise<FamilyPerson[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs
      .map((doc) => doc.data())
      .filter((person) => person.nomeBusca.includes(nomeBusca))
      .slice(0, limit);
  }

  async listManagedByMember(tenantId: string, memberId: string): Promise<FamilyPerson[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('managedByMemberId', '==', memberId)
      .where('deletedAt', '==', null)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async listByIds(tenantId: string, ids: string[]): Promise<FamilyPerson[]> {
    if (ids.length === 0) return [];
    // `in` do Firestore aceita no máximo 30 valores — o uso real (pessoas
    // referenciadas por um único cálculo de parentesco, limitado a 4
    // gerações) nunca chega perto disso, mas o corte protege contra abuso.
    const uniqueIds = [...new Set(ids)].slice(0, 30);
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('__name__', 'in', uniqueIds)
      .get();
    return snap.docs.map((doc) => doc.data());
  }

  async create(entity: FamilyPerson): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }

  async update(entity: FamilyPerson): Promise<void> {
    await this.collection.doc(entity.id).set(entity);
  }
}

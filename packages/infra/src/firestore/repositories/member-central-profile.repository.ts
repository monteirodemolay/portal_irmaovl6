import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import type {
  CentralBusinessEntry,
  CentralEducationEntry,
  CentralEmploymentEntry,
  IMemberCentralProfileRepository,
  MemberCentralProfile,
} from '@vl6/domain';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'memberCentralProfiles';

/**
 * `negocios` é um array aninhado dentro de `MemberCentralProfile` — o
 * `FirestoreDataConverter` só converte `Timestamp`→`Date` nos campos de
 * topo do documento (`extraDateFields` de `createEntityConverter`), então
 * `negocio.updatedAt` chega aqui como um `Timestamp` cru do Admin SDK, não
 * um `Date` (apesar do tipo em `CentralBusinessEntry` dizer `Date`). Sem
 * converter, esse valor passa direto pra um Client Component
 * (`EmpresaTab`) e quebra a serialização RSC ("Only plain objects... can
 * be passed to Client Components").
 */
function toUpdatedAtDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return new Date(0);
}

/**
 * `CentralBusinessEntry` ganhou vários campos (status/updatedAt na Fase 3;
 * logoUrl/produtosServicos/contato comercial/atendimento/cnpj depois) —
 * documentos gravados antes de cada uma dessas mudanças não têm esses
 * campos no Firestore (não existe migração/backfill nesse projeto, ver
 * docs/architecture). Sem normalizar aqui, UI que assume
 * `formasAtendimento.includes(...)`/`produtosServicos.map(...)` etc. sempre
 * presentes quebra em runtime pra qualquer negócio cadastrado antes dessas
 * features existirem. Único ponto de leitura — todo `find*`/`listByTenant`
 * passa por aqui.
 */
function normalizeBusinessEntry(raw: CentralBusinessEntry): CentralBusinessEntry {
  return {
    ...raw,
    status: raw.status ?? 'published',
    updatedAt: toUpdatedAtDate(raw.updatedAt),
    logoUrl: raw.logoUrl ?? null,
    produtosServicos: raw.produtosServicos ?? [],
    whatsappComercial: raw.whatsappComercial ?? null,
    emailComercial: raw.emailComercial ?? null,
    instagramComercial: raw.instagramComercial ?? null,
    formasAtendimento: raw.formasAtendimento ?? [],
    horarioFuncionamento: raw.horarioFuncionamento ?? null,
    ofereceDescontoIrmaos: raw.ofereceDescontoIrmaos ?? false,
    descontoDescricao: raw.descontoDescricao ?? null,
    cnpj: raw.cnpj ?? null,
  };
}

/**
 * `dataInicio`/`dataFim` chegam como `Timestamp` cru do Admin SDK, mesmo
 * motivo de `toUpdatedAtDate` acima — e `null` é um valor legítimo aqui
 * (período em aberto ou nunca informado), não um "documento antigo sem o
 * campo" pra tratar como erro.
 */
function toOptionalDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function normalizeEmploymentEntry(raw: CentralEmploymentEntry): CentralEmploymentEntry {
  return {
    ...raw,
    dataInicio: toOptionalDate(raw.dataInicio),
    dataFim: toOptionalDate(raw.dataFim),
  };
}

function normalizeEducationEntry(raw: CentralEducationEntry): CentralEducationEntry {
  return {
    ...raw,
    dataInicio: toOptionalDate(raw.dataInicio),
    dataFim: toOptionalDate(raw.dataFim),
  };
}

function normalizeProfile(profile: MemberCentralProfile): MemberCentralProfile {
  return {
    ...profile,
    negocios: profile.negocios.map(normalizeBusinessEntry),
    // `historicoProfissional`/`formacaoAcademica` são campos novos —
    // documentos gravados antes deles existirem não têm essas chaves no
    // Firestore (`undefined`, não `[]`), mesma classe de bug que já
    // quebrou `Tenant.heroPhotos` em produção.
    historicoProfissional: (profile.historicoProfissional ?? []).map(normalizeEmploymentEntry),
    formacaoAcademica: (profile.formacaoAcademica ?? []).map(normalizeEducationEntry),
  };
}

export class FirestoreMemberCentralProfileRepository implements IMemberCentralProfileRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<MemberCentralProfile>());
  }

  async findById(id: string): Promise<MemberCentralProfile | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? normalizeProfile(snap.data()!) : null;
  }

  async findByMemberId(tenantId: string, memberId: string): Promise<MemberCentralProfile | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('memberId', '==', memberId)
      .limit(1)
      .get();
    return snap.empty ? null : normalizeProfile(snap.docs[0]!.data());
  }

  async listByTenant(tenantId: string): Promise<MemberCentralProfile[]> {
    const snap = await this.collection.where('tenantId', '==', tenantId).get();
    return snap.docs.map((doc) => normalizeProfile(doc.data()));
  }

  async create(profile: MemberCentralProfile): Promise<void> {
    await this.collection.doc(profile.id).set(profile);
  }

  async update(profile: MemberCentralProfile): Promise<void> {
    await this.collection.doc(profile.id).set(profile);
  }
}

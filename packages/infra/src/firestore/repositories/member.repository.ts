import type { Firestore, Query } from 'firebase-admin/firestore';
import type {
  IMemberRepository,
  Member,
  MemberSearchFilters,
  PageRequest,
  PageResult,
  UnclaimedMember,
} from '@vl6/domain';
import { formatBrazilianPersonName, normalizeNameForSearch } from '@vl6/shared';
import { createEntityConverter } from '../converters/entity.converter';

const COLLECTION = 'members';
const DATE_FIELDS = [
  'dataNascimento',
  'dataIniciacao',
  'dataElevacao',
  'dataExaltacao',
  'conjugeDataNascimento',
  'dataFalecimento',
] as const;

/**
 * Normaliza `nomeCompleto` pro padrão brasileiro na leitura — cobre nomes
 * de importações antigas gravados inteiramente em maiúscula, sem exigir
 * migração de dados. Não altera o valor persistido, só o que é retornado.
 * Também preenche `autorizaDivulgacaoExterna` (Central de Comunicação,
 * docs/architecture) com o default seguro `false`, e `dataFalecimento`/
 * `mensagemHomenagem` (In Memoriam) com `null`, em cadastros gravados antes
 * desses campos existirem — nunca exigir migração de dados pra isso.
 */
function normalizeMemberName(entity: Member): Member {
  return {
    ...entity,
    nomeCompleto: formatBrazilianPersonName(entity.nomeCompleto),
    autorizaDivulgacaoExterna: entity.autorizaDivulgacaoExterna ?? false,
    dataFalecimento: entity.dataFalecimento ?? null,
    mensagemHomenagem: entity.mensagemHomenagem ?? null,
  };
}

export class FirestoreMemberRepository implements IMemberRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db
      .collection(COLLECTION)
      .withConverter(createEntityConverter<Member>(DATE_FIELDS));
  }

  async findById(id: string): Promise<Member | null> {
    const snap = await this.collection.doc(id).get();
    return snap.exists ? normalizeMemberName(snap.data()!) : null;
  }

  async findByUserId(tenantId: string, userId: string): Promise<Member | null> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    return snap.empty ? null : normalizeMemberName(snap.docs[0]!.data());
  }

  async existsByCim(tenantId: string, cim: string): Promise<boolean> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('cim', '==', cim)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async findUnclaimedByTenant(tenantId: string): Promise<UnclaimedMember[]> {
    const snap = await this.collection
      .where('tenantId', '==', tenantId)
      .where('userId', '==', null)
      .where('deletedAt', '==', null)
      .orderBy('nomeCompleto')
      .get();
    return snap.docs.map((doc) => {
      const member = doc.data();
      return { id: member.id, nomeCompleto: formatBrazilianPersonName(member.nomeCompleto) };
    });
  }

  /**
   * Teto de documentos varridos quando algum filtro precisa ser aplicado em
   * memória (`nome`/`cidade`/`cim`/`grau`+`situacao` juntos) — generoso o
   * bastante pra cobrir o quadro de Irmãos de qualquer Loja real sem virar
   * uma varredura sem limite.
   */
  private static readonly MAX_TEXT_SEARCH_SCAN = 5000;

  async search(filters: MemberSearchFilters, page: PageRequest): Promise<PageResult<Member>> {
    let query: Query<Member> = this.collection
      .where('tenantId', '==', filters.tenantId)
      .where('deletedAt', '==', null)
      .orderBy('nomeCompleto');

    // Só um filtro opcional por vez entra na consulta do Firestore — cada
    // um (`situacao`, `grau`) tem seu próprio índice composto dedicado
    // (tenantId+deletedAt+situacao+nomeCompleto / .../grau/...), mas não
    // existe (nem faria sentido criar) um índice para toda combinação
    // possível entre eles + `cim`. Pedir os dois de uma vez sem essa regra
    // gera uma consulta sem índice — passa liso no emulador de testes, mas
    // derruba a página em produção (`FAILED_PRECONDITION`), como já
    // aconteceu antes neste projeto com `boardTerms`. `cim` nunca vai pro
    // Firestore: não tem índice próprio e é seletivo o bastante pra filtrar
    // em memória, mesmo padrão já usado abaixo pra `nome`/`cidade`.
    if (filters.situacao) {
      query = query.where('situacao', '==', filters.situacao);
    } else if (filters.grau) {
      query = query.where('grau', '==', filters.grau);
    }

    // `nome`/`cidade`/`cim`/(`situacao`+`grau` juntos) não têm como virar
    // filtro do Firestore (busca por substring/acento não é suportada, e
    // `cim` não tem índice próprio) — precisam ser aplicados em memória.
    // Antes, esse filtro rodava só sobre os `page.limit` documentos já
    // paginados pelo Firestore: um Irmão fora da página "crua" atual (por
    // ordem alfabética) nunca aparecia na busca, mesmo existindo — achado
    // do Administrador buscando o próprio nome ("Luís") e só encontrando
    // quem por acaso já estava naquela página. Com qualquer um desses
    // filtros ativo, varre um lote bem maior, filtra tudo em memória e só
    // então pagina o resultado já filtrado (cursor numérico — offset —, em
    // vez do cursor por documento do Firestore usado no caminho rápido).
    const hasInMemoryFilter = Boolean(
      filters.nome || filters.cidade || filters.cim || (filters.situacao && filters.grau),
    );

    if (!hasInMemoryFilter) {
      if (page.cursor) {
        const cursorDoc = await this.collection.doc(page.cursor).get();
        if (cursorDoc.exists) query = query.startAfter(cursorDoc);
      }
      const snap = await query.limit(page.limit + 1).get();
      const docs = snap.docs.slice(0, page.limit);
      const hasMore = snap.docs.length > page.limit;
      return {
        items: docs.map((doc) => normalizeMemberName(doc.data())),
        nextCursor: hasMore ? (docs.at(-1)?.id ?? null) : null,
        hasMore,
      };
    }

    const snap = await query.limit(FirestoreMemberRepository.MAX_TEXT_SEARCH_SCAN).get();
    let items = snap.docs.map((doc) => normalizeMemberName(doc.data()));

    if (filters.situacao && filters.grau) {
      items = items.filter((m) => m.grau === filters.grau);
    }
    if (filters.cim) {
      items = items.filter((m) => m.cim === filters.cim);
    }
    if (filters.nome) {
      // Sem acento e minúsculo dos dois lados — buscar "Luis" precisa achar
      // "Luís" (achado do Administrador: a busca não encontrava o próprio
      // nome por causa do acento).
      const needle = normalizeNameForSearch(filters.nome);
      items = items.filter((m) => normalizeNameForSearch(m.nomeCompleto).includes(needle));
    }
    if (filters.cidade) {
      const needle = normalizeNameForSearch(filters.cidade);
      items = items.filter(
        (m) => m.endereco?.cidade && normalizeNameForSearch(m.endereco.cidade).includes(needle),
      );
    }

    const offset = page.cursor ? Number(page.cursor) || 0 : 0;
    const pageItems = items.slice(offset, offset + page.limit);
    const hasMore = offset + page.limit < items.length;

    return {
      items: pageItems,
      nextCursor: hasMore ? String(offset + page.limit) : null,
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

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  libraryCategorySchema,
  libraryCartLoanRequestSchema,
  libraryItemSchema,
  libraryOccurrenceAttestationSchema,
  libraryOccurrenceSchema,
  libraryPickupExtensionSchema,
  libraryReviewSchema,
  libraryShelfSchema,
  libraryShelfTransferSchema,
  libraryWriteOffSchema,
} from '@vl6/shared';
import {
  canTransitionLibraryLoan,
  hasPermission,
  isLibraryLoanOpen,
  isReasonableLibraryLoanDueDate,
  isReasonableLibraryPickupDeadline,
  type LibraryCopyStatus,
  type LibraryLoan,
  type LibraryLoanEventKind,
  type LibraryLoanStatus,
} from '@vl6/domain';
import { createServerContainer, type ServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { uploadLibraryCover, validateLibraryCover } from '@/lib/library/library-cover-upload';
import { isValidIsbn, normalizeBookCode } from '../lib/book-catalog-assistant';

export interface LibraryActionState {
  error: string | null;
  success?: string | null;
  warning?: string | null;
  createdCategory?: { id: string; nome: string } | null;
  createdShelf?: { id: string; codigo: string; nome: string } | null;
}
const shelfLocation = (s: { codigo: string; nome: string }) => `${s.codigo} · ${s.nome}`;
const revalidateLibrary = () => {
  for (const p of [
    '/admin/acervo/biblioteca',
    '/admin/acervo/biblioteca/estantes',
    '/admin/acervo/biblioteca/emprestimos',
    '/acervo/biblioteca',
    '/acervo/biblioteca/emprestimos',
  ])
    revalidatePath(p);
};

export interface LibraryBookLookupResult {
  found: boolean;
  titulo?: string;
  autor?: string;
  anoPublicacao?: number;
  editora?: string;
  isbn?: string;
  sinopse?: string;
  palavrasChave?: string[];
  source?: 'google-books' | 'open-library';
}

const cleanExternalText = (value: unknown, maximum = 4000): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, maximum) : undefined;
};

const publicationYear = (value: unknown): number | undefined => {
  const match = String(value ?? '').match(/(?:18|19|20)\d{2}/);
  return match ? Number(match[0]) : undefined;
};

export async function lookupLibraryBookAction(input: {
  code?: string;
  query?: string;
}): Promise<LibraryBookLookupResult> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:create')) return { found: false };

  const code = normalizeBookCode(input.code ?? '');
  const query = cleanExternalText(input.query, 180)?.replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
  const terms = isValidIsbn(code) ? `isbn:${code}` : query?.split(/\s+/).slice(0, 24).join(' ');
  if (!terms) return { found: false };

  try {
    const googleUrl = new URL('https://www.googleapis.com/books/v1/volumes');
    googleUrl.searchParams.set('q', terms);
    googleUrl.searchParams.set('maxResults', '3');
    googleUrl.searchParams.set('printType', 'books');
    const response = await fetch(googleUrl, { signal: AbortSignal.timeout(7000) });
    if (response.ok) {
      const payload = (await response.json()) as {
        items?: Array<{
          volumeInfo?: {
            title?: string;
            authors?: string[];
            publisher?: string;
            publishedDate?: string;
            description?: string;
            categories?: string[];
            industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
          };
        }>;
      };
      const info = payload.items?.[0]?.volumeInfo;
      if (info?.title) {
        const isbn = info.industryIdentifiers?.find((id) =>
          ['ISBN_13', 'ISBN_10'].includes(id.type ?? ''),
        )?.identifier;
        return {
          found: true,
          titulo: cleanExternalText(info.title, 240),
          autor: cleanExternalText(info.authors?.join('; '), 180),
          anoPublicacao: publicationYear(info.publishedDate),
          editora: cleanExternalText(info.publisher, 180),
          isbn: cleanExternalText(isbn, 32),
          sinopse: cleanExternalText(info.description),
          palavrasChave: info.categories?.slice(0, 8).map((value) => value.slice(0, 50)),
          source: 'google-books',
        };
      }
    }
  } catch {
    // A leitura local continua disponível quando o catálogo externo está indisponível.
  }

  try {
    const openLibraryUrl = new URL('https://openlibrary.org/search.json');
    openLibraryUrl.searchParams.set('q', isValidIsbn(code) ? code : terms);
    openLibraryUrl.searchParams.set('limit', '1');
    openLibraryUrl.searchParams.set(
      'fields',
      'title,author_name,publisher,first_publish_year,isbn,subject',
    );
    const response = await fetch(openLibraryUrl, { signal: AbortSignal.timeout(7000) });
    if (response.ok) {
      const payload = (await response.json()) as {
        docs?: Array<{
          title?: string;
          author_name?: string[];
          publisher?: string[];
          first_publish_year?: number;
          isbn?: string[];
          subject?: string[];
        }>;
      };
      const info = payload.docs?.[0];
      if (info?.title) {
        const isbn = info.isbn?.find(isValidIsbn);
        return {
          found: true,
          titulo: cleanExternalText(info.title, 240),
          autor: cleanExternalText(info.author_name?.join('; '), 180),
          anoPublicacao: info.first_publish_year,
          editora: cleanExternalText(info.publisher?.[0], 180),
          isbn: cleanExternalText(isbn, 32),
          palavrasChave: info.subject?.slice(0, 8).map((value) => value.slice(0, 50)),
          source: 'open-library',
        };
      }
    }
  } catch {
    // O Bibliotecário ainda poderá revisar e completar os campos extraídos pelo OCR.
  }
  return { found: false };
}

export async function createLibraryCategoryAction(
  _: LibraryActionState,
  formData: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  const parsed = libraryCategorySchema.safeParse({
    nome: formData.get('nome'),
    categoriaPaiId: formData.get('categoriaPaiId') || null,
    ordem: formData.get('ordem') || 0,
  });
  if (!parsed.success) return { error: 'Dados inválidos.' };
  const c = createServerContainer();
  const result = await c.useCases.createLibraryCategory.execute(session.authContext, parsed.data);
  if (!result.ok) return { error: result.error.message };
  revalidateLibrary();
  return {
    error: null,
    success: 'Categoria cadastrada.',
    createdCategory: { id: result.value.id, nome: result.value.nome },
  };
}

export async function createLibraryShelfAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) return { error: 'Sem permissão.' };
  const parsed = libraryShelfSchema.safeParse({
    codigo: fd.get('codigo'),
    nome: fd.get('nome'),
    descricao: fd.get('descricao') || null,
  });
  if (!parsed.success) return { error: 'Informe código e nome.' };
  const c = createServerContainer();
  const shelves = await c.repositories.libraryCirculation.listShelvesByTenant(
    session.authContext.tenantId,
  );
  if (shelves.some((s) => s.codigo.toLowerCase() === parsed.data.codigo.toLowerCase()))
    return { error: 'Código já utilizado.' };
  const now = new Date();
  const shelf = {
    id: c.db.collection('libraryShelves').doc().id,
    tenantId: session.authContext.tenantId,
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
    createdBy: session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  } as const;
  await c.repositories.libraryCirculation.createShelf(shelf);
  revalidateLibrary();
  return {
    error: null,
    success: 'Estante cadastrada.',
    createdShelf: { id: shelf.id, codigo: shelf.codigo, nome: shelf.nome },
  };
}
export async function updateLibraryShelfAction(id: string, fd: FormData): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const parsed = libraryShelfSchema.parse({
    codigo: fd.get('codigo'),
    nome: fd.get('nome'),
    descricao: fd.get('descricao') || null,
  });
  const c = createServerContainer();
  const [current, shelves] = await Promise.all([
    c.repositories.libraryCirculation.findShelfById(id),
    c.repositories.libraryCirculation.listShelvesByTenant(session.authContext.tenantId),
  ]);
  if (!current || current.tenantId !== session.authContext.tenantId) throw new Error('not_found');
  if (shelves.some((s) => s.id !== id && s.codigo.toLowerCase() === parsed.codigo.toLowerCase()))
    throw new Error('duplicate');
  await c.repositories.libraryCirculation.updateShelfAndCopies({
    ...current,
    ...parsed,
    updatedAt: new Date(),
    updatedBy: session.authContext.uid,
  });
  revalidateLibrary();
}
export async function deactivateLibraryShelfAction(id: string, fd: FormData): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const { targetShelfId } = libraryShelfTransferSchema.parse({
    targetShelfId: fd.get('targetShelfId'),
  });
  if (id === targetShelfId) throw new Error('invalid_target');
  const c = createServerContainer();
  const [source, target] = await Promise.all([
    c.repositories.libraryCirculation.findShelfById(id),
    c.repositories.libraryCirculation.findShelfById(targetShelfId),
  ]);
  if (
    !source ||
    !target ||
    source.tenantId !== session.authContext.tenantId ||
    target.tenantId !== session.authContext.tenantId
  )
    throw new Error('not_found');
  const now = new Date();
  await c.repositories.libraryCirculation.deactivateShelfAndTransfer(
    {
      ...source,
      deletedAt: now,
      status: 'inactive',
      ativo: false,
      updatedAt: now,
      updatedBy: session.authContext.uid,
    },
    target,
  );
  revalidateLibrary();
}

export async function addLibraryItemAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  const camera = fd.get('capaCamera');
  const uploaded = fd.get('capaUpload');
  const cover = camera instanceof File && camera.size ? camera : uploaded;
  let capaUrl: string | null = null;
  if (cover instanceof File && cover.size) {
    const e = validateLibraryCover(cover);
    if (e) return { error: e };
    try {
      capaUrl = await uploadLibraryCover(cover, session.authContext.tenantId);
    } catch {
      return { error: 'Não foi possível enviar a capa.' };
    }
  }
  const parsed = libraryItemSchema.safeParse({
    fileId: fd.get('fileId') || null,
    categoriaId: fd.get('categoriaId'),
    subcategoriaId: fd.get('subcategoriaId') || null,
    permiteLeituraOnline: fd.get('permiteLeituraOnline') === 'on',
    titulo: fd.get('titulo'),
    autor: fd.get('autor') || null,
    tipoMaterial: fd.get('tipoMaterial'),
    formato: fd.get('formato'),
    anoPublicacao: fd.get('anoPublicacao') || null,
    editora: fd.get('editora') || null,
    isbn: fd.get('isbn') || null,
    codigoBarras: fd.get('codigoBarras') || null,
    codigoClassificacao: fd.get('codigoClassificacao') || null,
    palavrasChave: String(fd.get('palavrasChave') ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    sinopse: fd.get('sinopse') || null,
    parecerBibliotecario: fd.get('parecerBibliotecario') || null,
    capaUrl,
    prazoEmprestimoDias: fd.get('prazoEmprestimoDias') || 21,
    codigoTombo: fd.get('codigoTombo') || null,
    shelfId: fd.get('shelfId') || null,
    localizacao: null,
    estadoGeral: fd.get('estadoGeral') || null,
    observacoesExemplar: fd.get('observacoesExemplar') || null,
  });
  if (!parsed.success) return { error: 'Verifique os campos obrigatórios da obra e do exemplar.' };
  const c = createServerContainer();
  let shelf = null;
  if (parsed.data.formato !== 'digital') {
    shelf = await c.repositories.libraryCirculation.findShelfById(parsed.data.shelfId!);
    if (!shelf || shelf.tenantId !== session.authContext.tenantId)
      return { error: 'Selecione uma estante válida.' };
    parsed.data.localizacao = shelfLocation(shelf);
  }
  const { codigoTombo, shelfId, localizacao, estadoGeral, observacoesExemplar, ...itemInput } =
    parsed.data;
  if (codigoTombo) {
    const copies = await c.repositories.libraryCirculation.listCopiesByTenant(
      session.authContext.tenantId,
    );
    if (copies.some((copy) => copy.codigoTombo.toLowerCase() === codigoTombo.toLowerCase()))
      return { error: 'O número de tombo já está em uso.' };
  }
  const result = await c.useCases.addLibraryItem.execute(session.authContext, itemInput);
  if (!result.ok) return { error: result.error.message };
  if (parsed.data.formato !== 'digital') {
    const now = new Date();
    await c.repositories.libraryCirculation.createCopy({
      id: c.db.collection('libraryCopies').doc().id,
      tenantId: session.authContext.tenantId,
      libraryItemId: result.value.id,
      codigoTombo: codigoTombo!,
      shelfId: shelfId!,
      localizacao: localizacao!,
      estadoGeral: estadoGeral!,
      observacoes: observacoesExemplar,
      situacao: estadoGeral === 'restauracao' ? 'manutencao' : 'disponivel',
      createdAt: now,
      updatedAt: now,
      createdBy: session.authContext.uid,
      updatedBy: session.authContext.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
  }
  revalidateLibrary();
  redirect('/admin/acervo/biblioteca');
}

async function recordLoanEvent(
  c: ServerContainer,
  loan: Pick<LibraryLoan, 'id' | 'tenantId' | 'libraryItemId' | 'copyId'>,
  tipo: LibraryLoanEventKind,
  descricao: string,
  actor: string,
) {
  const now = new Date();
  await c.repositories.libraryCirculation.createLoanEvent({
    id: c.db.collection('libraryLoanEvents').doc().id,
    tenantId: loan.tenantId,
    loanId: loan.id,
    libraryItemId: loan.libraryItemId,
    copyId: loan.copyId,
    tipo,
    descricao,
    actorUserId: actor,
    occurredAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: actor,
    updatedBy: actor,
    deletedAt: null,
    status: 'active',
    ativo: true,
  });
}

export async function requestLibraryCartAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const ids = String(fd.get('libraryItemIds') ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const p = libraryCartLoanRequestSchema.safeParse({
    libraryItemIds: ids,
    pickupEventId: fd.get('pickupEventId'),
  });
  if (!p.success) return { error: 'Selecione obras e uma sessão.' };
  return requestLoans(p.data.libraryItemIds, p.data.pickupEventId);
}
export async function requestLibraryLoanAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const id = String(fd.get('libraryItemId') ?? '');
  const event = String(fd.get('pickupEventId') ?? '');
  if (!id || !event) return { error: 'Selecione a sessão.' };
  return requestLoans([id], event);
}
async function requestLoans(ids: string[], eventId: string): Promise<LibraryActionState> {
  const session = await requireSession();
  const c = createServerContainer();
  const event = await c.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId || event.deletedAt)
    return { error: 'Sessão indisponível.' };
  const [member, user, existing] = await Promise.all([
    c.repositories.member.findByUserId(session.authContext.tenantId, session.authContext.uid),
    c.repositories.user.findById(session.authContext.uid),
    c.repositories.libraryCirculation.listLoansByUser(
      session.authContext.tenantId,
      session.authContext.uid,
    ),
  ]);
  const open = existing.filter((l) => isLibraryLoanOpen(l.statusEmprestimo));
  const packageId = c.db.collection('libraryLoans').doc().id;
  let created = 0;
  const unavailable: string[] = [];
  for (const id of [...new Set(ids)]) {
    const item = await c.repositories.libraryItem.findById(id);
    if (
      !item ||
      item.tenantId !== session.authContext.tenantId ||
      item.formato === 'digital' ||
      open.some((l) => l.libraryItemId === id)
    ) {
      unavailable.push(item?.titulo ?? id);
      continue;
    }
    const now = new Date();
    const due = new Date(event.dataInicio);
    due.setDate(due.getDate() + (item.prazoEmprestimoDias ?? 21));
    const loan = await c.repositories.libraryCirculation.reserveAvailableCopy({
      id: c.db.collection('libraryLoans').doc().id,
      requestPackageId: packageId,
      tenantId: session.authContext.tenantId,
      libraryItemId: id,
      borrowerUserId: session.authContext.uid,
      borrowerMemberId: member?.id ?? null,
      borrowerName: member?.nomeCompleto ?? user?.email ?? 'Irmão',
      borrowerEmail: member?.email ?? user?.email ?? null,
      borrowerWhatsapp: member?.whatsapp ?? member?.telefone ?? null,
      statusEmprestimo: 'solicitado',
      requestedPickupAt: event.dataInicio,
      suggestedPickupEventId: event.id,
      pickupDeadlineAt: null,
      pickupExtensionCount: 0,
      approvedAt: null,
      checkedOutAt: null,
      dueAt: due,
      dueAtConfirmed: false,
      suggestedReturnEventId: null,
      returnedAt: null,
      renewalCount: 0,
      librarianNotes: null,
      lastReminderAt: null,
      reminderCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: session.authContext.uid,
      updatedBy: session.authContext.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    if (!loan) {
      unavailable.push(item.titulo ?? id);
      continue;
    }
    await recordLoanEvent(
      c,
      loan,
      'solicitacao',
      `Solicitado para a sessão “${event.titulo}”.`,
      session.authContext.uid,
    );
    created++;
  }
  revalidateLibrary();
  if (!created) return { error: `Nenhuma solicitação criada. ${unavailable.join(', ')}` };
  return {
    error: null,
    success: `${created} obra(s) solicitada(s).`,
    warning: open.length
      ? `Você já possui ${open.length} pedido(s) em aberto; a nova retirada depende de autorização.`
      : undefined,
  };
}

export async function saveLibraryReviewAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  const p = libraryReviewSchema.safeParse({
    libraryItemId: fd.get('libraryItemId'),
    rating: fd.get('rating'),
    comentario: fd.get('comentario') || null,
  });
  if (!p.success) return { error: 'Escolha uma nota de 1 a 5.' };
  const c = createServerContainer();
  const item = await c.repositories.libraryItem.findById(p.data.libraryItemId);
  if (!item || item.tenantId !== session.authContext.tenantId)
    return { error: 'Obra não encontrada.' };
  const [before, member] = await Promise.all([
    c.repositories.libraryCirculation.findReviewByUser(
      session.authContext.tenantId,
      item.id,
      session.authContext.uid,
    ),
    c.repositories.member.findByUserId(session.authContext.tenantId, session.authContext.uid),
  ]);
  const now = new Date();
  await c.repositories.libraryCirculation.upsertReview({
    id: before?.id ?? `${item.id}_${session.authContext.uid}`,
    tenantId: session.authContext.tenantId,
    libraryItemId: item.id,
    userId: session.authContext.uid,
    memberName: member?.nomeCompleto ?? 'Irmão',
    rating: p.data.rating,
    comentario: p.data.comentario,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
    createdBy: before?.createdBy ?? session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  });
  revalidatePath(`/acervo/biblioteca/${item.id}`);
  return { error: null, success: 'Avaliação registrada.' };
}

export async function updateLibraryLoanStatusAction(
  id: string,
  next: LibraryLoanStatus,
  fd: FormData,
): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const c = createServerContainer();
  const current = await c.repositories.libraryCirculation.findLoanById(id);
  if (
    !current ||
    current.tenantId !== session.authContext.tenantId ||
    !canTransitionLibraryLoan(current.statusEmprestimo, next)
  )
    throw new Error('invalid_state');
  const reason = String(fd.get('reason') ?? '').trim();
  if (['recusado', 'cancelado'].includes(next) && reason.length < 5)
    throw new Error('reason_required');
  const dueValue = String(fd.get('dueAt') ?? '');
  const due = dueValue ? new Date(`${dueValue}T23:59:59`) : current.dueAt;
  const pickupValue = String(fd.get('pickupDeadlineAt') ?? '');
  const deadline = pickupValue ? new Date(`${pickupValue}T23:59:59`) : current.pickupDeadlineAt;
  if (
    next === 'aprovado' &&
    (!deadline ||
      !isReasonableLibraryPickupDeadline(current.requestedPickupAt, deadline) ||
      !isReasonableLibraryLoanDueDate(current.requestedPickupAt, due))
  )
    throw new Error('invalid_dates');
  let placement: undefined | { shelfId: string; localizacao: string };
  if (next === 'devolvido') {
    const shelf = await c.repositories.libraryCirculation.findShelfById(
      String(fd.get('shelfId') ?? ''),
    );
    if (!shelf || shelf.tenantId !== session.authContext.tenantId)
      throw new Error('shelf_required');
    placement = { shelfId: shelf.id, localizacao: shelfLocation(shelf) };
  }
  const now = new Date();
  const copyStatus: LibraryCopyStatus =
    next === 'retirado'
      ? 'emprestado'
      : ['devolvido', 'recusado', 'cancelado'].includes(next)
        ? 'disponivel'
        : 'reservado';
  const updated = {
    ...current,
    statusEmprestimo: next,
    approvedAt: next === 'aprovado' ? now : current.approvedAt,
    pickupDeadlineAt: next === 'aprovado' ? deadline : current.pickupDeadlineAt,
    pickupExtensionCount: current.pickupExtensionCount ?? 0,
    checkedOutAt: next === 'retirado' ? now : current.checkedOutAt,
    returnedAt: next === 'devolvido' ? now : current.returnedAt,
    dueAt: due,
    dueAtConfirmed: next === 'aprovado' ? true : current.dueAtConfirmed,
    librarianNotes: reason || current.librarianNotes,
    updatedAt: now,
    updatedBy: session.authContext.uid,
  };
  await c.repositories.libraryCirculation.updateLoanAndCopy(updated, copyStatus, placement);
  if (next === 'retirado') await c.repositories.libraryItem.incrementLoans(current.libraryItemId);
  const map: Record<LibraryLoanStatus, LibraryLoanEventKind> = {
    solicitado: 'solicitacao',
    aprovado: 'aprovacao',
    retirado: 'retirada',
    atrasado: 'atraso',
    devolvido: 'devolucao',
    recusado: 'recusa',
    cancelado: 'cancelamento',
  };
  await recordLoanEvent(
    c,
    updated,
    next === 'cancelado' && current.statusEmprestimo === 'aprovado' ? 'nao_retirado' : map[next],
    reason ? `${next}: ${reason}` : `Situação alterada para ${next}.`,
    session.authContext.uid,
  );
  await c.useCases.notifyRecipient.execute({
    tenantId: current.tenantId,
    destinatarioId: current.borrowerUserId,
    tipo: 'acervo',
    titulo: `Empréstimo ${next}`,
    mensagem: `Situação atualizada para ${next}.`,
    link: '/acervo/biblioteca/emprestimos',
    priority: next === 'atrasado' ? 'urgent' : 'normal',
  });
  revalidateLibrary();
}

export async function extendLibraryLoanPickupAction(id: string, fd: FormData): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const p = libraryPickupExtensionSchema.parse({
    pickupDeadlineAt: fd.get('pickupDeadlineAt'),
    reason: fd.get('reason'),
  });
  const c = createServerContainer();
  const loan = await c.repositories.libraryCirculation.findLoanById(id);
  if (
    !loan ||
    loan.tenantId !== session.authContext.tenantId ||
    loan.statusEmprestimo !== 'aprovado'
  )
    throw new Error('invalid_state');
  const deadline = new Date(p.pickupDeadlineAt);
  deadline.setHours(23, 59, 59, 999);
  if (
    !isReasonableLibraryPickupDeadline(loan.requestedPickupAt, deadline, 60) ||
    deadline.getTime() <= Math.max(Date.now(), loan.pickupDeadlineAt?.getTime() ?? 0)
  )
    throw new Error('invalid_deadline');
  const now = new Date();
  const updated = {
    ...loan,
    pickupDeadlineAt: deadline,
    pickupExtensionCount: (loan.pickupExtensionCount ?? 0) + 1,
    librarianNotes: p.reason,
    updatedAt: now,
    updatedBy: session.authContext.uid,
  };
  await c.repositories.libraryCirculation.updateLoanAndCopy(updated, 'reservado');
  await recordLoanEvent(
    c,
    updated,
    'prorrogacao_retirada',
    `Retirada prorrogada até ${deadline.toLocaleDateString('pt-BR')}. ${p.reason}`,
    session.authContext.uid,
  );
  await c.useCases.notifyRecipient.execute({
    tenantId: loan.tenantId,
    destinatarioId: loan.borrowerUserId,
    tipo: 'acervo',
    titulo: 'Prazo de retirada prorrogado',
    mensagem: `Novo limite: ${deadline.toLocaleDateString('pt-BR')}.`,
    link: '/acervo/biblioteca/emprestimos',
    priority: 'attention',
  });
  revalidateLibrary();
}

export async function sendLibraryLoanReminderAction(id: string): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const c = createServerContainer();
  const loan = await c.repositories.libraryCirculation.findLoanById(id);
  if (!loan || loan.tenantId !== session.authContext.tenantId) throw new Error('not_found');
  await c.useCases.notifyRecipient.execute({
    tenantId: loan.tenantId,
    destinatarioId: loan.borrowerUserId,
    tipo: 'acervo',
    titulo: 'Devolução pendente',
    mensagem: `O prazo terminou em ${loan.dueAt.toLocaleDateString('pt-BR')}.`,
    link: '/acervo/biblioteca/emprestimos',
    priority: 'urgent',
  });
  const now = new Date();
  await c.repositories.libraryCirculation.updateLoanAndCopy(
    {
      ...loan,
      lastReminderAt: now,
      reminderCount: loan.reminderCount + 1,
      updatedAt: now,
      updatedBy: session.authContext.uid,
    },
    null,
  );
  await recordLoanEvent(
    c,
    loan,
    'lembrete',
    'Bibliotecário enviou lembrete de devolução.',
    session.authContext.uid,
  );
  revalidateLibrary();
}

export async function reportLibraryOccurrenceAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  const p = libraryOccurrenceSchema.safeParse({
    loanId: fd.get('loanId'),
    motivo: fd.get('motivo'),
    relato: fd.get('relato'),
    occurredAt: fd.get('occurredAt'),
  });
  if (!p.success) return { error: 'Informe motivo, data e relato detalhado.' };
  const c = createServerContainer();
  const loan = await c.repositories.libraryCirculation.findLoanById(p.data.loanId);
  if (
    !loan ||
    loan.tenantId !== session.authContext.tenantId ||
    loan.borrowerUserId !== session.authContext.uid ||
    !['retirado', 'atrasado'].includes(loan.statusEmprestimo)
  )
    return { error: 'Empréstimo inválido.' };
  const copy = await c.repositories.libraryCirculation.findCopyById(loan.copyId);
  const now = new Date();
  await c.repositories.libraryCirculation.createOccurrence({
    id: c.db.collection('libraryOccurrences').doc().id,
    tenantId: loan.tenantId,
    libraryItemId: loan.libraryItemId,
    copyId: loan.copyId,
    loanId: loan.id,
    reportedByUserId: session.authContext.uid,
    reporterName: loan.borrowerName,
    motivo: p.data.motivo,
    relato: p.data.relato,
    occurredAt: p.data.occurredAt,
    statusOcorrencia: 'relatado',
    previousCopyStatus: copy?.situacao,
    librarianAttestation: null,
    attestedByUserId: null,
    attestedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  });
  if (copy)
    await c.repositories.libraryCirculation.updateCopy({
      ...copy,
      situacao: 'manutencao',
      updatedAt: now,
      updatedBy: session.authContext.uid,
    });
  revalidateLibrary();
  return { error: null, success: 'Ocorrência enviada ao Bibliotecário.' };
}

export async function createLibraryWriteOffAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) return { error: 'Sem permissão.' };
  const p = libraryWriteOffSchema.safeParse({
    copyId: fd.get('copyId'),
    motivo: fd.get('motivo'),
    relato: fd.get('relato'),
    occurredAt: fd.get('occurredAt'),
  });
  if (!p.success) return { error: 'Preencha todos os dados da baixa.' };
  const c = createServerContainer();
  const copy = await c.repositories.libraryCirculation.findCopyById(p.data.copyId);
  if (!copy || copy.tenantId !== session.authContext.tenantId)
    return { error: 'Exemplar não encontrado.' };
  const now = new Date();
  const occurrence = {
    id: c.db.collection('libraryOccurrences').doc().id,
    tenantId: copy.tenantId,
    libraryItemId: copy.libraryItemId,
    copyId: copy.id,
    loanId: null,
    reportedByUserId: session.authContext.uid,
    reporterName: 'Irmão Bibliotecário',
    motivo: p.data.motivo,
    relato: p.data.relato,
    occurredAt: p.data.occurredAt,
    statusOcorrencia: 'confirmado' as const,
    previousCopyStatus: copy.situacao,
    librarianAttestation: p.data.relato,
    attestedByUserId: session.authContext.uid,
    attestedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy: session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active' as const,
    ativo: true,
  };
  await c.repositories.libraryCirculation.createOccurrence(occurrence);
  await c.repositories.libraryCirculation.updateCopy({
    ...copy,
    situacao: 'baixado',
    updatedAt: now,
    updatedBy: session.authContext.uid,
  });
  revalidateLibrary();
  return { error: null, success: 'Baixa registrada.' };
}

export async function attestLibraryOccurrenceAction(fd: FormData): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const p = libraryOccurrenceAttestationSchema.parse({
    occurrenceId: fd.get('occurrenceId'),
    decision: fd.get('decision'),
    librarianAttestation: fd.get('librarianAttestation'),
  });
  const c = createServerContainer();
  const list = await c.repositories.libraryCirculation.listOccurrencesByTenant(
    session.authContext.tenantId,
  );
  const o = list.find((x) => x.id === p.occurrenceId);
  if (!o) throw new Error('not_found');
  const now = new Date();
  await c.repositories.libraryCirculation.updateOccurrenceAndCopy(
    {
      ...o,
      statusOcorrencia: p.decision,
      librarianAttestation: p.librarianAttestation,
      attestedByUserId: session.authContext.uid,
      attestedAt: now,
      updatedAt: now,
      updatedBy: session.authContext.uid,
    },
    p.decision === 'confirmado' ? 'baixado' : (o.previousCopyStatus ?? 'disponivel'),
  );
  revalidateLibrary();
}

export async function toggleLibraryFavoriteAction(id: string): Promise<void> {
  const session = await requireSession();
  const c = createServerContainer();
  await c.useCases.toggleLibraryFavorite.execute(session.authContext, id);
  revalidatePath('/biblioteca');
  revalidatePath('/downloads');
}

'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  libraryCategorySchema,
  libraryCartLoanRequestSchema,
  libraryDirectLoanSchema,
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
import {
  deleteLibraryDigitalFile,
  uploadLibraryDigitalFile,
  validateLibraryDigitalFile,
} from '@/lib/library/library-digital-upload';
import { isValidIsbn, isValidIssn, normalizeBookCode } from '../lib/book-catalog-assistant';
import {
  generateLibraryAccessionNumber,
  LIBRARY_ACCESSION_RANDOM_LIMIT,
} from '../lib/library-accession-number';

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
  capaUrl?: string;
  source?: 'google-books' | 'open-library' | 'crossref';
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

  if (isValidIssn(code) && !isValidIsbn(code)) {
    try {
      const issn = `${code.slice(0, 4)}-${code.slice(4)}`;
      const response = await fetch(`https://api.crossref.org/journals/${issn}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          message?: { title?: string; publisher?: string };
        };
        const info = payload.message;
        if (info?.title) {
          return {
            found: true,
            titulo: cleanExternalText(info.title, 240),
            editora: cleanExternalText(info.publisher, 180),
            isbn: issn,
            source: 'crossref',
          };
        }
      }
    } catch {
      // Sem serviço de ISSN disponível — o Bibliotecário completa manualmente.
    }
    return { found: false };
  }

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
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
          };
        }>;
      };
      const info = payload.items?.[0]?.volumeInfo;
      if (info?.title) {
        const isbn = info.industryIdentifiers?.find((id) =>
          ['ISBN_13', 'ISBN_10'].includes(id.type ?? ''),
        )?.identifier;
        const thumbnail = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
        return {
          found: true,
          titulo: cleanExternalText(info.title, 240),
          autor: cleanExternalText(info.authors?.join('; '), 180),
          anoPublicacao: publicationYear(info.publishedDate),
          editora: cleanExternalText(info.publisher, 180),
          isbn: cleanExternalText(isbn, 32),
          sinopse: cleanExternalText(info.description),
          palavrasChave: info.categories?.slice(0, 8).map((value) => value.slice(0, 50)),
          capaUrl: thumbnail?.replace(/^http:/, 'https:'),
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
          capaUrl: isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
            : undefined,
          source: 'open-library',
        };
      }
    }
  } catch {
    // O Bibliotecário ainda poderá revisar e completar os campos extraídos pelo OCR.
  }
  return { found: false };
}

const ALLOWED_COVER_HOSTS = new Set([
  'books.google.com',
  'books.googleusercontent.com',
  'covers.openlibrary.org',
]);
const COVER_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Baixa a capa sugerida por `lookupLibraryBookAction` (Google Books/Open Library) e a envia para
 * o nosso próprio armazenamento — nunca linka direto pro catálogo externo, que pode ficar fora do
 * ar ou trocar de endereço. Origem restrita à allowlist para não virar um proxy de SSRF.
 */
export async function fetchLibrarySuggestedCoverAction(
  sourceUrl: string,
): Promise<{ capaUrl: string } | { error: string }> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:create')) return { error: 'forbidden' };
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { error: 'Link de capa inválido.' };
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_COVER_HOSTS.has(parsed.hostname))
    return { error: 'Origem da capa não permitida.' };
  try {
    const response = await fetch(parsed, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { error: 'Não foi possível baixar a capa sugerida.' };
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0]!.trim();
    const extension = COVER_CONTENT_TYPES[contentType];
    if (!extension) return { error: 'Formato de imagem não suportado.' };
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024)
      return { error: 'Capa sugerida indisponível ou grande demais.' };
    const file = new File([buffer], `capa-sugerida.${extension}`, { type: contentType });
    const capaUrl = await uploadLibraryCover(file, session.authContext.tenantId);
    return { capaUrl };
  } catch {
    return { error: 'Não foi possível baixar a capa sugerida.' };
  }
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
  const c = createServerContainer();
  const format = String(fd.get('formato') ?? 'fisico');
  const digitalSource = String(fd.get('digitalSource') ?? 'existing');
  const digitalUpload = fd.get('arquivoDigitalUpload');
  const digitalFile =
    format !== 'fisico' &&
    digitalSource === 'upload' &&
    digitalUpload instanceof File &&
    digitalUpload.size > 0
      ? digitalUpload
      : null;
  const fileId = format !== 'fisico' && digitalSource === 'existing' ? fd.get('fileId') : null;
  const urlExterna = format !== 'fisico' && digitalSource === 'link' ? fd.get('urlExterna') : null;

  if (format !== 'fisico' && digitalSource === 'upload') {
    if (!digitalFile) return { error: 'Selecione o arquivo digital.' };
    const uploadError = validateLibraryDigitalFile(digitalFile);
    if (uploadError) return { error: uploadError };
  }

  let copies = [] as Awaited<
    ReturnType<typeof c.repositories.libraryCirculation.listCopiesByTenant>
  >;
  let codigoTombo: string | null = null;
  if (format !== 'digital') {
    copies = await c.repositories.libraryCirculation.listCopiesByTenant(
      session.authContext.tenantId,
    );
    try {
      codigoTombo = generateLibraryAccessionNumber(
        copies.map((copy) => copy.codigoTombo),
        new Date().getUTCFullYear(),
        () => randomInt(0, LIBRARY_ACCESSION_RANDOM_LIMIT),
      );
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Não foi possível gerar o tombo.' };
    }
  }

  const camera = fd.get('capaCamera');
  const uploaded = fd.get('capaUpload');
  const cover = camera instanceof File && camera.size ? camera : uploaded;
  let capaUrl: string | null = String(fd.get('capaSugeridaUrl') ?? '').trim() || null;
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
    fileId: digitalFile ? 'upload-pendente' : fileId || null,
    urlExterna: urlExterna || null,
    categoriaId: fd.get('categoriaId'),
    subcategoriaId: fd.get('subcategoriaId') || null,
    permiteLeituraOnline: fd.get('permiteLeituraOnline') === 'on',
    titulo: fd.get('titulo'),
    autor: fd.get('autor') || null,
    tipoMaterial: fd.get('tipoMaterial'),
    formato: format,
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
    codigoTombo,
    shelfId: fd.get('shelfId') || null,
    localizacao: null,
    estadoGeral: fd.get('estadoGeral') || null,
    observacoesExemplar: fd.get('observacoesExemplar') || null,
  });
  if (!parsed.success) return { error: 'Verifique os campos obrigatórios da obra e do exemplar.' };
  let shelf = null;
  if (parsed.data.formato !== 'digital') {
    shelf = await c.repositories.libraryCirculation.findShelfById(parsed.data.shelfId!);
    if (!shelf || shelf.tenantId !== session.authContext.tenantId)
      return { error: 'Selecione uma estante válida.' };
    parsed.data.localizacao = shelfLocation(shelf);
  }
  const {
    codigoTombo: parsedCodigoTombo,
    shelfId,
    localizacao,
    estadoGeral,
    observacoesExemplar,
    ...itemInput
  } = parsed.data;

  let uploadedDigital: Awaited<ReturnType<typeof uploadLibraryDigitalFile>> | null = null;
  let createdFileId: string | null = null;
  if (digitalFile) {
    try {
      uploadedDigital = await uploadLibraryDigitalFile(digitalFile, session.authContext.tenantId);
      const now = new Date();
      createdFileId = c.db.collection('files').doc().id;
      await c.repositories.fileAsset.create({
        id: createdFileId,
        tenantId: session.authContext.tenantId,
        titulo: parsed.data.titulo,
        descricao: `Arquivo digital da Biblioteca: ${parsed.data.titulo}`,
        categoriaId: parsed.data.categoriaId,
        acervo: 'Biblioteca',
        autor: parsed.data.autor,
        tipo: uploadedDigital.kind,
        urlArquivo: uploadedDigital.url,
        urlMiniatura: capaUrl,
        versao: 1,
        publicado: true,
        permitirDownload: true,
        contagemDownloads: 0,
        contagemVisualizacoes: 0,
        dataPublicacao: now,
        ordem: 0,
        tamanhoBytes: uploadedDigital.sizeBytes,
        createdAt: now,
        updatedAt: now,
        createdBy: session.authContext.uid,
        updatedBy: session.authContext.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      });
      itemInput.fileId = createdFileId;
    } catch {
      if (uploadedDigital) await deleteLibraryDigitalFile(uploadedDigital.path).catch(() => {});
      return { error: 'Não foi possível enviar o arquivo digital.' };
    }
  }

  const result = await c.useCases.addLibraryItem.execute(session.authContext, itemInput);
  if (!result.ok) {
    if (uploadedDigital && createdFileId) {
      await Promise.allSettled([
        deleteLibraryDigitalFile(uploadedDigital.path),
        c.db.collection('files').doc(createdFileId).delete(),
      ]);
    }
    return { error: result.error.message };
  }
  if (parsed.data.formato !== 'digital') {
    const now = new Date();
    await c.repositories.libraryCirculation.createCopy({
      id: c.db.collection('libraryCopies').doc().id,
      tenantId: session.authContext.tenantId,
      libraryItemId: result.value.id,
      codigoTombo: parsedCodigoTombo!,
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

export async function updateLibraryItemAction(
  libraryItemId: string,
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) return { error: 'Sem permissão.' };

  const c = createServerContainer();
  const current = await c.repositories.libraryItem.findById(libraryItemId);
  if (!current || current.tenantId !== session.authContext.tenantId || current.deletedAt)
    return { error: 'Obra não encontrada.' };

  const existingCopies = await c.repositories.libraryCirculation.listCopiesByItem(
    session.authContext.tenantId,
    libraryItemId,
  );
  const copy = existingCopies[0] ?? null;
  const format = String(fd.get('formato') ?? current.formato ?? 'fisico');
  if (format === 'digital' && existingCopies.length > 0)
    return {
      error: 'Uma obra com exemplar físico não pode ser convertida em somente digital.',
    };

  const digitalSource = String(fd.get('digitalSource') ?? 'existing');
  const uploadEntry = fd.get('arquivoDigitalUpload');
  const digitalFile =
    format !== 'fisico' &&
    digitalSource === 'upload' &&
    uploadEntry instanceof File &&
    uploadEntry.size > 0
      ? uploadEntry
      : null;
  if (format !== 'fisico' && digitalSource === 'upload') {
    if (!digitalFile) return { error: 'Selecione o arquivo digital.' };
    const uploadError = validateLibraryDigitalFile(digitalFile);
    if (uploadError) return { error: uploadError };
  }

  let accessionNumber = copy?.codigoTombo ?? null;
  if (format !== 'digital' && !accessionNumber) {
    const tenantCopies = await c.repositories.libraryCirculation.listCopiesByTenant(
      session.authContext.tenantId,
    );
    accessionNumber = generateLibraryAccessionNumber(
      tenantCopies.map((entry) => entry.codigoTombo),
      new Date().getUTCFullYear(),
      () => randomInt(0, LIBRARY_ACCESSION_RANDOM_LIMIT),
    );
  }

  const camera = fd.get('capaCamera');
  const uploadedCover = fd.get('capaUpload');
  const cover = camera instanceof File && camera.size ? camera : uploadedCover;
  const suggestedCover = String(fd.get('capaSugeridaUrl') ?? '').trim() || null;
  let capaUrl = suggestedCover ?? current.capaUrl ?? null;
  if (cover instanceof File && cover.size) {
    const coverError = validateLibraryCover(cover);
    if (coverError) return { error: coverError };
    try {
      capaUrl = await uploadLibraryCover(cover, session.authContext.tenantId);
    } catch {
      return { error: 'Não foi possível enviar a capa.' };
    }
  }

  const selectedFileId =
    format !== 'fisico' && digitalSource === 'existing' ? fd.get('fileId') : null;
  const selectedUrl = format !== 'fisico' && digitalSource === 'link' ? fd.get('urlExterna') : null;
  const parsed = libraryItemSchema.safeParse({
    fileId: digitalFile ? 'upload-pendente' : selectedFileId || null,
    urlExterna: selectedUrl || null,
    categoriaId: fd.get('categoriaId'),
    subcategoriaId: fd.get('subcategoriaId') || null,
    permiteLeituraOnline: fd.get('permiteLeituraOnline') === 'on',
    titulo: fd.get('titulo'),
    autor: fd.get('autor') || null,
    tipoMaterial: fd.get('tipoMaterial'),
    formato: format,
    anoPublicacao: fd.get('anoPublicacao') || null,
    editora: fd.get('editora') || null,
    isbn: fd.get('isbn') || null,
    codigoBarras: fd.get('codigoBarras') || null,
    codigoClassificacao: fd.get('codigoClassificacao') || null,
    palavrasChave: String(fd.get('palavrasChave') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    sinopse: fd.get('sinopse') || null,
    parecerBibliotecario: fd.get('parecerBibliotecario') || null,
    capaUrl,
    prazoEmprestimoDias: fd.get('prazoEmprestimoDias') || 21,
    codigoTombo: accessionNumber,
    shelfId: fd.get('shelfId') || null,
    localizacao: null,
    estadoGeral: fd.get('estadoGeral') || null,
    observacoesExemplar: fd.get('observacoesExemplar') || null,
  });
  if (!parsed.success) return { error: 'Verifique os campos obrigatórios da obra e do exemplar.' };

  let shelf = null;
  if (format !== 'digital') {
    shelf = await c.repositories.libraryCirculation.findShelfById(parsed.data.shelfId!);
    if (!shelf || shelf.tenantId !== session.authContext.tenantId)
      return { error: 'Selecione uma estante válida.' };
    parsed.data.localizacao = shelfLocation(shelf);
  }

  const { codigoTombo, shelfId, localizacao, estadoGeral, observacoesExemplar, ...itemInput } =
    parsed.data;
  let uploadedDigital: Awaited<ReturnType<typeof uploadLibraryDigitalFile>> | null = null;
  let createdFileId: string | null = null;

  try {
    if (digitalFile) {
      uploadedDigital = await uploadLibraryDigitalFile(digitalFile, session.authContext.tenantId);
      const now = new Date();
      createdFileId = c.db.collection('files').doc().id;
      await c.repositories.fileAsset.create({
        id: createdFileId,
        tenantId: session.authContext.tenantId,
        titulo: parsed.data.titulo,
        descricao: `Arquivo digital da Biblioteca: ${parsed.data.titulo}`,
        categoriaId: parsed.data.categoriaId,
        acervo: 'Biblioteca',
        autor: parsed.data.autor,
        tipo: uploadedDigital.kind,
        urlArquivo: uploadedDigital.url,
        urlMiniatura: capaUrl,
        versao: 1,
        publicado: true,
        permitirDownload: true,
        contagemDownloads: 0,
        contagemVisualizacoes: 0,
        dataPublicacao: now,
        ordem: 0,
        tamanhoBytes: uploadedDigital.sizeBytes,
        createdAt: now,
        updatedAt: now,
        createdBy: session.authContext.uid,
        updatedBy: session.authContext.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      });
      itemInput.fileId = createdFileId;
    } else if (itemInput.fileId) {
      const file = await c.repositories.fileAsset.findById(itemInput.fileId);
      if (!file || file.tenantId !== session.authContext.tenantId)
        return { error: 'Selecione um arquivo digital válido.' };
    }

    const now = new Date();
    await c.repositories.libraryItem.update({
      ...current,
      ...itemInput,
      updatedAt: now,
      updatedBy: session.authContext.uid,
    });

    if (format !== 'digital') {
      if (copy) {
        await c.repositories.libraryCirculation.updateCopy({
          ...copy,
          shelfId: shelfId!,
          localizacao: localizacao!,
          estadoGeral: estadoGeral!,
          observacoes: observacoesExemplar,
          situacao:
            estadoGeral === 'restauracao' && copy.situacao === 'disponivel'
              ? 'manutencao'
              : copy.situacao,
          updatedAt: now,
          updatedBy: session.authContext.uid,
        });
      } else {
        await c.repositories.libraryCirculation.createCopy({
          id: c.db.collection('libraryCopies').doc().id,
          tenantId: session.authContext.tenantId,
          libraryItemId,
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
    }
  } catch {
    if (uploadedDigital) await deleteLibraryDigitalFile(uploadedDigital.path).catch(() => {});
    if (createdFileId)
      await c.db
        .collection('files')
        .doc(createdFileId)
        .delete()
        .catch(() => {});
    return { error: 'Não foi possível salvar as alterações.' };
  }

  revalidateLibrary();
  redirect('/admin/acervo/biblioteca');
}

export async function deleteLibraryItemAction(
  libraryItemId: string,
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) return { error: 'Sem permissão.' };
  const reason = String(fd.get('motivo') ?? '').trim();
  if (reason.length < 10) return { error: 'Explique o motivo em pelo menos 10 caracteres.' };

  const permanent = fd.get('modo') === 'permanente';
  const isAdministrator = ['admin', 'super_admin'].includes(session.role?.chave ?? '');
  if (permanent && !isAdministrator)
    return { error: 'Somente um administrador pode realizar a limpeza permanente.' };

  const c = createServerContainer();
  const item = await c.repositories.libraryItem.findById(libraryItemId);
  if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt)
    return { error: 'Obra não encontrada.' };
  const loans = await c.repositories.libraryCirculation.listLoansByTenant(
    session.authContext.tenantId,
  );
  if (
    loans.some(
      (loan) => loan.libraryItemId === libraryItemId && isLibraryLoanOpen(loan.statusEmprestimo),
    )
  )
    return { error: 'Conclua ou cancele os empréstimos ativos antes de excluir a obra.' };

  if (permanent) {
    const collections = [
      'libraryCopies',
      'libraryLoans',
      'libraryLoanEvents',
      'libraryOccurrences',
      'libraryReviews',
      'libraryInteractions',
      'libraryFavorites',
    ];
    for (const collectionName of collections) {
      const documents = await c.db
        .collection(collectionName)
        .where('libraryItemId', '==', libraryItemId)
        .get();
      const tenantDocuments = documents.docs.filter(
        (document) => document.data().tenantId === session.authContext.tenantId,
      );
      for (let offset = 0; offset < tenantDocuments.length; offset += 450) {
        const batch = c.db.batch();
        for (const document of tenantDocuments.slice(offset, offset + 450))
          batch.delete(document.ref);
        await batch.commit();
      }
    }
    await c.db.collection('libraryItems').doc(libraryItemId).delete();
  } else {
    const now = new Date();
    await c.repositories.libraryItem.update({
      ...item,
      motivoExclusao: reason,
      excluidoPor: session.authContext.uid,
      deletedAt: now,
      status: 'inactive',
      ativo: false,
      updatedAt: now,
      updatedBy: session.authContext.uid,
    });
    const copies = await c.repositories.libraryCirculation.listCopiesByItem(
      session.authContext.tenantId,
      libraryItemId,
    );
    await Promise.all(
      copies.map((entry) =>
        c.repositories.libraryCirculation.updateCopy({
          ...entry,
          deletedAt: now,
          status: 'inactive',
          ativo: false,
          updatedAt: now,
          updatedBy: session.authContext.uid,
        }),
      ),
    );
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

/**
 * Registra presencialmente um empréstimo já decidido no balcão: o Bibliotecário escaneia o QR
 * do exemplar (ou busca a obra pelo nome), escolhe o Irmão, informa quando retirou e até quando
 * deve devolver — sem passar pelo carrinho/aprovação. Quando vem de um escaneamento, reserva o
 * exemplar exato (`reserveSpecificCopy`); na busca por nome, deixa o repositório escolher um
 * exemplar disponível (`reserveAvailableCopy`) — mesma reserva atômica do fluxo comum — e já
 * finaliza a retirada, para o registro aparecer de imediato em "Meus empréstimos" do Irmão.
 */
export async function registerLibraryDirectLoanAction(
  _: LibraryActionState,
  fd: FormData,
): Promise<LibraryActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'libraryItem:manage')) throw new Error('forbidden');
  const p = libraryDirectLoanSchema.safeParse({
    memberId: fd.get('memberId'),
    libraryItemId: fd.get('libraryItemId'),
    copyId: fd.get('copyId') || null,
    checkedOutAt: fd.get('checkedOutAt') ? `${fd.get('checkedOutAt')}T12:00:00` : undefined,
    dueAt: fd.get('dueAt') ? `${fd.get('dueAt')}T23:59:59` : undefined,
  });
  if (!p.success) return { error: 'Selecione o Irmão, a obra e datas válidas.' };
  const c = createServerContainer();
  const [item, member] = await Promise.all([
    c.repositories.libraryItem.findById(p.data.libraryItemId),
    c.repositories.member.findById(p.data.memberId),
  ]);
  if (!item || item.tenantId !== session.authContext.tenantId || item.formato === 'digital')
    return { error: 'Obra física não encontrada.' };
  if (!member || member.tenantId !== session.authContext.tenantId)
    return { error: 'Irmão não encontrado.' };
  if (!member.userId) return { error: 'Este Irmão ainda não tem acesso ao Portal.' };
  const open = await c.repositories.libraryCirculation.listLoansByUser(
    session.authContext.tenantId,
    member.userId,
  );
  if (open.some((l) => l.libraryItemId === item.id && isLibraryLoanOpen(l.statusEmprestimo)))
    return { error: `${member.nomeCompleto} já possui um empréstimo em aberto desta obra.` };
  const now = new Date();
  const draft = {
    id: c.db.collection('libraryLoans').doc().id,
    tenantId: session.authContext.tenantId,
    libraryItemId: item.id,
    borrowerUserId: member.userId,
    borrowerMemberId: member.id,
    borrowerName: member.nomeCompleto,
    borrowerEmail: member.email,
    borrowerWhatsapp: member.whatsapp ?? member.telefone,
    statusEmprestimo: 'retirado' as const,
    requestedPickupAt: p.data.checkedOutAt,
    suggestedPickupEventId: null,
    pickupDeadlineAt: null,
    pickupExtensionCount: 0,
    approvedAt: now,
    checkedOutAt: p.data.checkedOutAt,
    dueAt: p.data.dueAt,
    dueAtConfirmed: true,
    suggestedReturnEventId: null,
    returnedAt: null,
    renewalCount: 0,
    librarianNotes: 'Empréstimo registrado presencialmente pelo Bibliotecário.',
    lastReminderAt: null,
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active' as const,
    ativo: true,
  };
  const loan = p.data.copyId
    ? await c.repositories.libraryCirculation.reserveSpecificCopy(draft, p.data.copyId)
    : await c.repositories.libraryCirculation.reserveAvailableCopy(draft);
  if (!loan) return { error: 'Exemplar indisponível — escaneie outro ou atualize a busca.' };
  await c.repositories.libraryCirculation.updateLoanAndCopy(loan, 'emprestado');
  await c.repositories.libraryItem.incrementLoans(item.id);
  await recordLoanEvent(
    c,
    loan,
    'retirada',
    `Empréstimo registrado presencialmente pelo Bibliotecário para ${member.nomeCompleto}.`,
    session.authContext.uid,
  );
  await c.useCases.notifyRecipient.execute({
    tenantId: session.authContext.tenantId,
    destinatarioId: member.userId,
    tipo: 'acervo',
    titulo: 'Empréstimo registrado',
    mensagem: `"${item.titulo}" foi registrado como retirado. Devolução até ${p.data.dueAt.toLocaleDateString('pt-BR')}.`,
    link: '/acervo/biblioteca/emprestimos',
    priority: 'normal',
  });
  revalidateLibrary();
  return {
    error: null,
    success: `Empréstimo de "${item.titulo}" registrado para ${member.nomeCompleto}.`,
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

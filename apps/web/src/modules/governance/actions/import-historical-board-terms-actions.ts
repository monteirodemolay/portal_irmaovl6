'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { HISTORICAL_BOARD_TERMS_VL6, type ImportHistoricalBoardTermsRow } from '@vl6/domain';
import { normalizeNameForSearch } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import { ALLOWED_PHOTO_TYPES, validatePhotoFile } from '@/lib/membership/member-photo-upload';
import { matchHistoricalPhotoFilename } from '../lib/match-historical-photo-filename';

export interface ImportHistoricalBoardTermsActionState {
  error: string | null;
  report: ImportHistoricalBoardTermsRow[] | null;
  unmatchedFiles: string[];
}

const EMPTY_STATE: ImportHistoricalBoardTermsActionState = {
  error: null,
  report: null,
  unmatchedFiles: [],
};

const KNOWN_NAMES = Array.from(
  new Set(HISTORICAL_BOARD_TERMS_VL6.flatMap((term) => term.segments.map((s) => s.nomeCompleto))),
);

/**
 * Roda a importação da nominata histórica (1947–2026) — dataset fixo em
 * `HISTORICAL_BOARD_TERMS_VL6`, disparado manualmente pelo Administrador.
 * As fotos enviadas nesta chamada são casadas por nome
 * (`matchHistoricalPhotoFilename`) e sobem pro Blob Storage aqui, fora do
 * domínio — o use case só recebe o mapa nome→URL já resolvido. Seguro
 * rodar quantas vezes for preciso: gestões e Irmãos já existentes nunca
 * são duplicados, só casados por nome; fotos só entram em quem ainda não
 * tinha nenhuma. Pensado pra ser chamado aos poucos, à medida que mais
 * fotos forem chegando da Secretaria.
 */
export async function importHistoricalBoardTermsAction(
  _prevState: ImportHistoricalBoardTermsActionState,
  formData: FormData,
): Promise<ImportHistoricalBoardTermsActionState> {
  const session = await requireSession();

  const files = formData
    .getAll('fotos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const photosByNormalizedName: Record<string, string> = {};
  const unmatchedFiles: string[] = [];
  const storage = new VercelBlobStorageAdapter();

  for (const file of files) {
    const matchedName = matchHistoricalPhotoFilename(file.name, KNOWN_NAMES);
    if (!matchedName) {
      unmatchedFiles.push(`${file.name} — nome não reconhecido na nominata`);
      continue;
    }
    const photoError = validatePhotoFile(file);
    if (photoError) {
      unmatchedFiles.push(`${file.name} — ${photoError}`);
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = ALLOWED_PHOTO_TYPES[file.type] ?? 'jpg';
    const upload = await storage.upload({
      path: `tenants/${session.authContext.tenantId}/historico-nominata/${randomUUID()}.${ext}`,
      buffer,
      contentType: file.type,
    });
    photosByNormalizedName[normalizeNameForSearch(matchedName)] = upload.url;
  }

  const container = createServerContainer();
  const result = await container.useCases.importHistoricalBoardTerms.execute(
    session.authContext,
    HISTORICAL_BOARD_TERMS_VL6,
    photosByNormalizedName,
  );
  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message, unmatchedFiles };
  }

  revalidatePath('/admin/pessoas/gestoes');
  return { error: null, report: result.value, unmatchedFiles };
}

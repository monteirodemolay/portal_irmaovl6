'use server';

import { revalidatePath } from 'next/cache';
import {
  PARAMASONIC_ENTITY_KINDS,
  PARAMASONIC_ENTITY_STATUSES,
  type FraternalAffiliationKind,
  type ParamasonicEntityStatus,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface ParamasonicEntityActionState {
  error: string | null;
}

function readModule(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on';
}

export async function createParamasonicEntityAction(
  _prevState: ParamasonicEntityActionState,
  formData: FormData,
): Promise<ParamasonicEntityActionState> {
  const session = await requireSession();

  const kind = formData.get('kind');
  const situacao = formData.get('situacao');
  if (
    typeof kind !== 'string' ||
    !PARAMASONIC_ENTITY_KINDS.includes(kind as Exclude<FraternalAffiliationKind, 'mason'>) ||
    typeof situacao !== 'string' ||
    !PARAMASONIC_ENTITY_STATUSES.includes(situacao as ParamasonicEntityStatus)
  ) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createParamasonicEntity.execute(session.authContext, {
    kind: kind as Exclude<FraternalAffiliationKind, 'mason'>,
    name: String(formData.get('name') ?? ''),
    shortName: String(formData.get('shortName') ?? ''),
    unitNumber: (formData.get('unitNumber') as string) || null,
    parentUnitName: String(formData.get('parentUnitName') ?? ''),
    situacao: situacao as ParamasonicEntityStatus,
    modules: {
      people: readModule(formData, 'moduleIntegrantes'),
      agenda: readModule(formData, 'moduleAgenda'),
      content: readModule(formData, 'moduleContent'),
      publicPage: readModule(formData, 'modulePublicPage'),
    },
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/pessoas/paramaconicas');
  return { error: null };
}

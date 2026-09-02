'use server';

import { revalidatePath } from 'next/cache';
import {
  familyPersonSchema,
  familyRelationshipSchema,
  type FamilyPersonRefKind,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  DIRECT_LINK_KINDS,
  resolveRelationEndpoints,
  type DirectLinkKind,
} from '../lib/family-display-groups';
import type { FamilyPersonCandidate } from '@vl6/domain';

export interface FamilyLegacyActionState {
  error: string | null;
}

const EMPTY_STATE: FamilyLegacyActionState = { error: null };

/**
 * Passo de deduplicação (04_TELAS_E_FLUXOS.md §3) — chamada diretamente do
 * client a cada digitação (sem `useActionState`, é só leitura). Resolve o
 * `Member` da sessão apenas para ter um `AuthContext` válido; a busca em si
 * não distingue quem está pesquisando.
 */
export async function searchFamilyPersonCandidatesAction(
  nomeCompleto: string,
): Promise<FamilyPersonCandidate[]> {
  const session = await requireSession();
  const container = createServerContainer();
  if (!nomeCompleto.trim()) return [];
  return container.useCases.searchFamilyPersonCandidates.execute(session.authContext, nomeCompleto);
}

function parseRef(
  raw: FormDataEntryValue | null,
): { kind: 'member' | 'familyPerson'; id: string } | null {
  if (typeof raw !== 'string' || !raw.includes('|')) return null;
  const [kind, id] = raw.split('|');
  if ((kind !== 'member' && kind !== 'familyPerson') || !id) return null;
  return { kind, id };
}

/**
 * Painel "Adicionar familiar" (04_TELAS_E_FLUXOS.md §3) — cobre os dois
 * caminhos descritos ali num único formulário: se `existingRef` vier
 * preenchido (candidato selecionado na busca de deduplicação), só cria o
 * vínculo; senão, cadastra a `FamilyPerson` nova e o vínculo em seguida.
 * Ação pessoal — resolve `Member` pelo `uid`, confirma que ele gerencia a
 * pessoa-âncora (ou é ela própria) antes de chamar os casos de uso.
 */
export async function addFamilyMemberAction(
  _prevState: FamilyLegacyActionState,
  formData: FormData,
): Promise<FamilyLegacyActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const anchor = parseRef(formData.get('anchorRef')) ?? { kind: 'member' as const, id: member.id };
  const linkKindRaw = formData.get('linkKind');
  if (
    typeof linkKindRaw !== 'string' ||
    !DIRECT_LINK_KINDS.includes(linkKindRaw as DirectLinkKind)
  ) {
    return { error: 'Selecione o vínculo direto.' };
  }
  const linkKind = linkKindRaw as DirectLinkKind;

  let personRef: { kind: FamilyPersonRefKind; id: string };
  const existingRef = parseRef(formData.get('existingRef'));

  if (existingRef) {
    personRef = existingRef;
  } else {
    const dataNascimentoRaw = formData.get('dataNascimento');
    const dataFalecimentoRaw = formData.get('dataFalecimento');
    const parsed = familyPersonSchema.safeParse({
      linkedMemberId: null,
      nomeCompleto: formData.get('nomeCompleto'),
      fotoUrl: null,
      dataNascimento: dataNascimentoRaw ? dataNascimentoRaw : null,
      dataFalecimento: dataFalecimentoRaw ? dataFalecimentoRaw : null,
      lifeStatus: formData.get('lifeStatus') || 'living',
      cidade: null,
      estado: null,
      pais: null,
      biografia: null,
      menorDeIdade: false,
      fraternalLinkStatus: formData.get('fraternalLinkStatus') || 'unknown',
      visibility: formData.get('visibility') || 'private',
      sourceKind: formData.get('sourceKind') || 'self_declaration',
      sourceDescription: (formData.get('sourceDescription') as string) || null,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const personResult = await container.useCases.createFamilyPerson.execute(
      session.authContext,
      member.id,
      parsed.data,
    );
    if (!personResult.ok) return { error: personResult.error.message };
    personRef = { kind: 'familyPerson', id: personResult.value.id };
  }

  const endpoints = resolveRelationEndpoints(linkKind, anchor, personRef);
  const declaredLabel =
    linkKind === 'outro' ? (formData.get('declaredLabel') as string) || null : null;
  if (linkKind === 'outro' && !declaredLabel) {
    return { error: 'Informe o parentesco declarado.' };
  }

  const relationInput = familyRelationshipSchema.safeParse({
    fromKind: endpoints.fromKind,
    fromId: endpoints.fromId,
    toKind: endpoints.toKind,
    toId: endpoints.toId,
    relationKind: endpoints.relationKind,
    parentRole: endpoints.parentRole,
    childRole: endpoints.childRole,
    declaredLabel,
    visibility: (formData.get('visibility') as string) || 'private',
    sourceKind: (formData.get('sourceKind') as string) || 'self_declaration',
    sourceDescription: (formData.get('sourceDescription') as string) || null,
  });
  if (!relationInput.success) {
    return { error: relationInput.error.issues[0]?.message ?? 'Vínculo inválido.' };
  }

  const relationResult = await container.useCases.createFamilyRelationship.execute(
    session.authContext,
    member.id,
    relationInput.data,
  );
  if (!relationResult.ok) return { error: relationResult.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

export async function confirmFamilyRelationshipAction(
  _prevState: FamilyLegacyActionState,
  formData: FormData,
): Promise<FamilyLegacyActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const relationshipId = formData.get('relationshipId');
  if (typeof relationshipId !== 'string') return { error: 'Vínculo inválido.' };

  const result = await container.useCases.confirmFamilyRelationship.execute(
    session.authContext,
    member.id,
    relationshipId,
    null,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

export async function declineFamilyRelationshipAction(
  _prevState: FamilyLegacyActionState,
  formData: FormData,
): Promise<FamilyLegacyActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const relationshipId = formData.get('relationshipId');
  if (typeof relationshipId !== 'string') return { error: 'Vínculo inválido.' };

  const result = await container.useCases.declineFamilyRelationship.execute(
    session.authContext,
    member.id,
    relationshipId,
    null,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

export async function removeFamilyRelationshipAction(
  _prevState: FamilyLegacyActionState,
  formData: FormData,
): Promise<FamilyLegacyActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const relationshipId = formData.get('relationshipId');
  if (typeof relationshipId !== 'string') return { error: 'Vínculo inválido.' };

  const result = await container.useCases.softDeleteFamilyRelationship.execute(
    session.authContext,
    member.id,
    relationshipId,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

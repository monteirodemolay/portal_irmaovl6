'use server';

import { revalidatePath } from 'next/cache';
import {
  familyPersonSchema,
  familyRelationshipSchema,
  personFraternalRecordSchema,
  type FamilyPersonRefKind,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import {
  uploadFamilyPersonPhoto,
  validatePhotoFile,
} from '@/lib/family-legacy/family-person-photo-upload';
import {
  DIRECT_LINK_KINDS,
  resolveRelationEndpoints,
  type DirectLinkKind,
} from '../lib/family-display-groups';
import type { BackfillFraternidadeFemininaResult, FamilyPersonCandidate } from '@vl6/domain';

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
      cidade: (formData.get('cidade') as string) || null,
      estado: (formData.get('estado') as string) || null,
      pais: (formData.get('pais') as string) || null,
      biografia: (formData.get('biografia') as string) || null,
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

    // Upload de foto exige o `id` gerado na criação — segundo passo, igual
    // ao padrão de `updateFamilyMemberAction` (edição), só que aqui em
    // sequência com a criação em vez de partir de um registro já existente.
    const fotoFile = formData.get('foto');
    if (fotoFile instanceof File && fotoFile.size > 0) {
      const photoError = validatePhotoFile(fotoFile);
      if (photoError) return { error: photoError };
      const fotoUrl = await uploadFamilyPersonPhoto(
        fotoFile,
        session.authContext.tenantId,
        personResult.value.id,
      );
      const updateResult = await container.useCases.updateFamilyPerson.execute(
        session.authContext,
        member.id,
        personResult.value.id,
        { ...parsed.data, fotoUrl },
      );
      if (!updateResult.ok) return { error: updateResult.error.message };
    }
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

export interface BackfillFraternidadeFemininaState {
  error: string | null;
  result: BackfillFraternidadeFemininaResult | null;
}

/**
 * Correção retroativa da regra "toda esposa de Irmão é da Fraternidade
 * Feminina" (ver `CreateFamilyRelationshipUseCase`, que já aplica isso pra
 * todo vínculo conjugal criado a partir de agora) — cobre os vínculos
 * `spouse_of`/`partner_of` já existentes de antes dessa regra. Seguro rodar
 * mais de uma vez.
 */
export async function backfillFraternidadeFemininaAction(): Promise<BackfillFraternidadeFemininaState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.backfillFraternidadeFeminina.execute(session.authContext);
  if (!result.ok) return { error: result.error.message, result: null };

  revalidatePath('/paramaconicas');
  return { error: null, result: result.value };
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

/**
 * Edição de um `FamilyPerson` já cadastrado (nome, foto, biografia,
 * cidade/estado/país, datas, situação e vínculo maçônico/paramaçônico) —
 * cobre o caso "cadastrei a pessoa errada/incompleta e não tinha onde
 * corrigir" (pedido do Administrador). `personId` vem por `.bind()` no
 * componente, igual ao padrão de `updateParamasonicEntityMemberAction`.
 * `UpdateFamilyPersonUseCase` já garante que só quem gerencia o registro
 * pode editar — os campos que este formulário não expõe (fonte,
 * visibilidade avançada) são preservados do registro atual.
 */
export async function updateFamilyMemberAction(
  personId: string,
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

  const existing = await container.repositories.familyPerson.findById(personId);
  if (!existing || existing.tenantId !== session.authContext.tenantId || existing.deletedAt) {
    return { error: 'Pessoa não encontrada.' };
  }
  if (existing.managedByMemberId !== member.id) {
    return { error: 'Só quem cadastrou esta pessoa pode editá-la.' };
  }

  let fotoUrl = existing.fotoUrl;
  const fotoFile = formData.get('foto');
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const photoError = validatePhotoFile(fotoFile);
    if (photoError) return { error: photoError };
    fotoUrl = await uploadFamilyPersonPhoto(fotoFile, session.authContext.tenantId, personId);
  }

  const dataNascimentoRaw = formData.get('dataNascimento');
  const dataFalecimentoRaw = formData.get('dataFalecimento');
  const parsed = familyPersonSchema.safeParse({
    linkedMemberId: existing.linkedMemberId,
    nomeCompleto: formData.get('nomeCompleto'),
    fotoUrl,
    dataNascimento: dataNascimentoRaw ? dataNascimentoRaw : null,
    dataFalecimento: dataFalecimentoRaw ? dataFalecimentoRaw : null,
    lifeStatus: formData.get('lifeStatus') || 'living',
    cidade: (formData.get('cidade') as string) || null,
    estado: (formData.get('estado') as string) || null,
    pais: (formData.get('pais') as string) || null,
    biografia: (formData.get('biografia') as string) || null,
    menorDeIdade: existing.menorDeIdade,
    fraternalLinkStatus: formData.get('fraternalLinkStatus') || 'unknown',
    visibility: formData.get('visibility') || existing.visibility,
    sourceKind: existing.sourceKind,
    sourceDescription: existing.sourceDescription,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const result = await container.useCases.updateFamilyPerson.execute(
    session.authContext,
    member.id,
    personId,
    parsed.data,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

/**
 * Registra uma trajetória maçônica/paramaçônica ("de qual Loja ele era") de
 * um `FamilyPerson` — pedido do Administrador a partir do caso concreto do
 * bisavô fundador da própria Loja: `unidadeNome` é texto livre, sem exigir
 * cadastro prévio de uma "Loja co-irmã". `personId` por `.bind()`, mesmo
 * padrão de `updateFamilyMemberAction`.
 */
export async function createPersonFraternalRecordAction(
  personId: string,
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

  const unidadeNome = (formData.get('unidadeNome') as string) || null;
  if (!unidadeNome) return { error: 'Informe o nome da Loja, Capítulo ou unidade.' };

  const parsed = personFraternalRecordSchema.safeParse({
    personKind: 'familyPerson',
    personId,
    affiliationKind: formData.get('affiliationKind') || 'mason',
    organizacaoNome: null,
    unidadeTipo: formData.get('unidadeTipo') || 'lodge',
    unidadeNome,
    unidadeNumero: (formData.get('unidadeNumero') as string) || null,
    cidade: (formData.get('cidade') as string) || null,
    estado: (formData.get('estado') as string) || null,
    pais: null,
    potencia: null,
    rito: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    grau: null,
    cargos: [],
    titulos: [],
    passouAoOrienteEternoEm: null,
    resumoLegado: (formData.get('resumoLegado') as string) || null,
    visibility: 'members',
    sourceKind: 'family_report',
    sourceDescription: null,
    reviewStatus: 'draft',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const result = await container.useCases.createPersonFraternalRecord.execute(
    session.authContext,
    member.id,
    parsed.data,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/irmaos/meu-espaco');
  return EMPTY_STATE;
}

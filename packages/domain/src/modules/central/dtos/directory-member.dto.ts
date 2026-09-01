import type { AreaAtuacaoKey, MemberDegree, MemberSituationStatus } from '@vl6/shared';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { resolveAreaAtuacao } from '../lib/resolve-area-atuacao';

/**
 * Estado do perfil voluntário do Irmão no Diretório — nunca controla se o
 * Irmão APARECE (isso é `Member` não excluído, sempre), só o que aparece
 * dentro do card/perfil dele.
 *
 * - `institutional_only`: nunca criou `MemberCentralProfile`.
 * - `draft`: criou o perfil (ou tem `PublicationSettings`), mas não publicou
 *   (`profilePublished !== true`).
 * - `published`: `profilePublished === true` e sem suspensão administrativa.
 * - `suspended`: Administração suspendeu a exibição (moderação) — a
 *   configuração do Irmão continua intacta, só a exibição fica congelada.
 *
 * `awaiting_consent` (fluxo de cadastro assistido) é responsabilidade da
 * Fase 2 — depende de uma entidade que ainda não existe nesta fase
 * (rastreada separadamente), por isso não é produzido aqui.
 */
export type DirectoryProfileState = 'institutional_only' | 'draft' | 'published' | 'suspended';

export function deriveDirectoryProfileState(
  profile: MemberCentralProfile | null,
  settings: PublicationSettings | null,
): DirectoryProfileState {
  if (!profile) return 'institutional_only';
  if (!settings) return 'draft';
  if (settings.suspendedAt !== null) return 'suspended';
  if (settings.profilePublished) return 'published';
  return 'draft';
}

export interface DirectoryMemberDTO {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: MemberDegree;
  situacao: MemberSituationStatus;
  dataIniciacao: Date | null;
  /** Cargo ocupado na gestão vigente — `null` fora de gestão ativa ou sem cargo. Sempre buscável (institucional). */
  cargoAtual: string | null;
  /** Comissões da gestão vigente das quais o Irmão faz parte. Sempre buscável (institucional). */
  comissoes: Array<{ id: string; nome: string }>;
  profileState: DirectoryProfileState;
  /**
   * Bloco voluntário — só populado quando `profileState === 'published'`
   * (perfil suspenso congela a exibição igual a um rascunho, nunca some o
   * Irmão do Diretório, mas também nunca reexibe o conteúdo enquanto
   * suspenso). Cada campo respeita o bloco correspondente em
   * `PublicationSettings.blocks`, igual `buildPublicMemberProfileDTO`.
   */
  optional: {
    apresentacao: string | null;
    profissional: {
      profissao: string | null;
      areaAtuacao: string | null;
      areaAtuacaoKey: AreaAtuacaoKey | null;
      formacao: string | null;
      resumoProfissional: string | null;
    } | null;
    competencias: string[] | null;
    servicos: string[] | null;
    negocios: Array<{ businessId: string; nomeEmpresa: string; segmento: string | null }> | null;
    empresaAtual: string | null;
    cidadeExibicao: string | null;
  };
}

export interface DirectoryMemberExtras {
  cargoAtual: string | null;
  comissoes: Array<{ id: string; nome: string }>;
}

/**
 * Monta o cartão institucional do Diretório — composição explícita, não
 * reaproveita `buildPublicMemberProfileDTO` por mutação (aquela função
 * segue igual, usada pelo perfil detalhado e pelo preview "como os outros
 * veem"). Nunca inclui contatos (telefone/WhatsApp/e-mail) nem endereço —
 * esta é a listagem, não o perfil detalhado; esses dados ficam só na tela
 * de perfil individual, já com sua própria checagem de autorização.
 */
export function buildDirectoryMemberDTO(
  member: Member,
  profile: MemberCentralProfile | null,
  settings: PublicationSettings | null,
  extras: DirectoryMemberExtras,
): DirectoryMemberDTO {
  const profileState = deriveDirectoryProfileState(profile, settings);
  const authorized = profileState === 'published';
  const blocks = authorized ? settings!.blocks : null;
  const resolvedArea = authorized ? resolveAreaAtuacao(profile) : null;

  return {
    memberId: member.id,
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    grau: member.grau,
    situacao: member.situacao,
    dataIniciacao: member.dataIniciacao,
    cargoAtual: extras.cargoAtual,
    comissoes: extras.comissoes,
    profileState,
    optional: {
      apresentacao: blocks?.apresentacao ? (profile?.apresentacao ?? null) : null,
      profissional: blocks?.profissional
        ? {
            profissao: member.profissao,
            areaAtuacao: resolvedArea?.label ?? null,
            areaAtuacaoKey: resolvedArea?.key ?? null,
            formacao: profile?.formacao ?? null,
            resumoProfissional: profile?.resumoProfissional ?? null,
          }
        : null,
      competencias: blocks?.competencias ? (profile?.competencias ?? []) : null,
      servicos: blocks?.servicos ? (profile?.servicos ?? []) : null,
      // Só negócios já aprovados (ver `buildPublicMemberProfileDTO`, mesmo critério).
      negocios: blocks?.empresa
        ? (profile?.negocios ?? [])
            .filter((n) => n.status === 'published')
            .map((n) => ({ businessId: n.id, nomeEmpresa: n.nomeEmpresa, segmento: n.segmento }))
        : null,
      empresaAtual: blocks?.empresa ? member.empresa : null,
      cidadeExibicao: blocks?.informacoesPessoais ? (profile?.cidadeExibicao ?? null) : null,
    },
  };
}

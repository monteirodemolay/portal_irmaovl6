import type { AreaAtuacaoKey } from '@vl6/shared';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { resolveAreaAtuacao } from '../lib/resolve-area-atuacao';

export interface PublicMemberProfileDTO {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: Member['grau'];
  apresentacao: { texto: string | null } | null;
  informacoesPessoais: { interesses: string | null; cidadeExibicao: string | null } | null;
  profissional: {
    profissao: string | null;
    areaAtuacao: string | null;
    areaAtuacaoKey: AreaAtuacaoKey | null;
    formacao: string | null;
    resumoProfissional: string | null;
  } | null;
  negocios: MemberCentralProfile['negocios'] | null;
  empresaAtual: string | null;
  competencias: string[] | null;
  servicos: string[] | null;
  contatos: { telefone: string | null; whatsapp: string | null; email: string | null } | null;
  redes: {
    whatsapp: string | null;
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
    lattes: string | null;
    site: string | null;
  } | null;
  informacoesMaconicas: {
    lojasVisitadas: string | null;
    interessesMaconicos: string | null;
  } | null;
}

/**
 * Filtragem server-side do perfil da Central (docs/architecture) — nunca
 * busca tudo pra esconder no client. Um bloco desligado em
 * `PublicationSettings` vira a chave inteira `null` no DTO (nunca um objeto
 * com campos internos nulos) — a UI decide "não mostrar a seção" só olhando
 * pra chave, sem precisar saber a regra de visibilidade de novo. Reusada
 * tanto pelo perfil real (`GetPublicMemberProfileUseCase`) quanto pelo
 * preview "como os outros veem" (mesma função, mesmo filtro).
 */
export function buildPublicMemberProfileDTO(
  member: Member,
  profile: MemberCentralProfile | null,
  settings: PublicationSettings,
): PublicMemberProfileDTO {
  const blocks = settings.blocks;

  return {
    memberId: member.id,
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    grau: member.grau,
    apresentacao: blocks.apresentacao ? { texto: profile?.apresentacao ?? null } : null,
    informacoesPessoais: blocks.informacoesPessoais
      ? {
          interesses: profile?.interesses ?? null,
          cidadeExibicao: profile?.cidadeExibicao ?? null,
        }
      : null,
    profissional: blocks.profissional
      ? {
          profissao: member.profissao,
          areaAtuacao: resolveAreaAtuacao(profile)?.label ?? null,
          areaAtuacaoKey: resolveAreaAtuacao(profile)?.key ?? null,
          formacao: profile?.formacao ?? null,
          resumoProfissional: profile?.resumoProfissional ?? null,
        }
      : null,
    negocios: blocks.empresa ? (profile?.negocios ?? []) : null,
    empresaAtual: blocks.empresa ? member.empresa : null,
    competencias: blocks.competencias ? (profile?.competencias ?? []) : null,
    servicos: blocks.servicos ? (profile?.servicos ?? []) : null,
    contatos:
      settings.contacts.telefone || settings.contacts.whatsapp || settings.contacts.email
        ? {
            telefone: settings.contacts.telefone ? member.telefone : null,
            whatsapp: settings.contacts.whatsapp ? member.whatsapp : null,
            email: settings.contacts.email ? member.email : null,
          }
        : null,
    redes: Object.values(settings.externalLinks).some(Boolean)
      ? {
          whatsapp: settings.externalLinks.whatsapp
            ? (profile?.externalLinks.whatsapp ?? null)
            : null,
          instagram: settings.externalLinks.instagram
            ? (profile?.externalLinks.instagram ?? null)
            : null,
          facebook: settings.externalLinks.facebook
            ? (profile?.externalLinks.facebook ?? null)
            : null,
          linkedin: settings.externalLinks.linkedin
            ? (profile?.externalLinks.linkedin ?? null)
            : null,
          lattes: settings.externalLinks.lattes ? (profile?.externalLinks.lattes ?? null) : null,
          site: settings.externalLinks.site ? (profile?.externalLinks.site ?? null) : null,
        }
      : null,
    informacoesMaconicas: blocks.informacoesMaconicas
      ? {
          lojasVisitadas: profile?.lojasVisitadas ?? null,
          interessesMaconicos: profile?.interessesMaconicos ?? null,
        }
      : null,
  };
}

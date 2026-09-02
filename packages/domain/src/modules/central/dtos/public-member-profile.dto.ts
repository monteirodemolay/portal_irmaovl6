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
  /**
   * Data de iniciação — registro institucional da Loja, mesmo espírito de
   * `grau` acima: nunca passa pelos blocos de `PublicationSettings`. Base
   * do "Selo de Trajetória" (`LodgeTenureBadge`) nos cards do Diretório e
   * de Negócios & Serviços — não exige nenhuma consulta extra, `Member` já
   * vem carregado por quem monta este DTO.
   */
  dataIniciacao: Date | null;
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
  endereco: {
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  /**
   * Trajetória institucional (iniciação/elevação/exaltação + histórico de
   * cargos e comissões) — dado de registro da Loja, não de preferência
   * pessoal, por isso nunca passa pelos blocos de `PublicationSettings`
   * (mesmo recorte já usado em `/acervo/pessoas/[memberId]`, que também
   * não gate por publicação). Preenchido pelo use case, não por
   * `buildPublicMemberProfileDTO` (precisa de repositórios que a função
   * pura não recebe).
   */
  trajetoria: {
    dataIniciacao: Date | null;
    dataElevacao: Date | null;
    dataExaltacao: Date | null;
    cargos: { cargo: string; gestaoNome: string; dataInicio: Date; dataFim: Date | null }[];
    comissoes: { nome: string; gestaoNome: string; dataInicio: Date; dataFim: Date | null }[];
  } | null;
  /**
   * Fotografias do Acervo VL6 em que este Irmão está identificado — ponte
   * Diretório → Acervo (docs/architecture, princípio da Cadeia de União).
   * Gated pelo bloco `memoriaFotografica` (diferente de `trajetoria`: aqui é
   * claramente uma preferência pessoal do Irmão, não um registro da Loja).
   * Preenchido pelo use case, mesmo motivo de `trajetoria`.
   */
  memoriaFotografica: { id: string; src: string; caption: string }[] | null;
}

const CLOSED_BLOCKS: PublicationSettings['blocks'] = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  endereco: false,
  memoriaFotografica: false,
};

/**
 * Filtragem server-side do perfil da Central (docs/architecture) — nunca
 * busca tudo pra esconder no client. Um bloco desligado em
 * `PublicationSettings` vira a chave inteira `null` no DTO (nunca um objeto
 * com campos internos nulos) — a UI decide "não mostrar a seção" só olhando
 * pra chave, sem precisar saber a regra de visibilidade de novo. Reusada
 * tanto pelo perfil real (`GetPublicMemberProfileUseCase`) quanto pelo
 * preview "como os outros veem" (mesma função, mesmo filtro).
 *
 * `settings === null` cobre o Irmão institucional sem nenhum conteúdo
 * voluntário liberado (nunca publicou, ou está suspenso pela Administração
 * — o chamador decide qual dos dois, mas pra este builder os dois casos são
 * idênticos: todo bloco fechado) — usado por `GetPublicMemberProfileUseCase`
 * pra nunca devolver 404 pra um Irmão institucional sem perfil voluntário.
 */
export function buildPublicMemberProfileDTO(
  member: Member,
  profile: MemberCentralProfile | null,
  settings: PublicationSettings | null,
): PublicMemberProfileDTO {
  const blocks = settings?.blocks ?? CLOSED_BLOCKS;

  return {
    memberId: member.id,
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    grau: member.grau,
    dataIniciacao: member.dataIniciacao,
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
    // Só negócios já aprovados pela Administração — rascunho/em revisão/
    // suspenso nunca aparecem a terceiros, mesmo com o bloco "empresa" ligado
    // (ver `ReviewBusinessSubmissionUseCase`).
    negocios: blocks.empresa
      ? (profile?.negocios.filter((n) => n.status === 'published') ?? [])
      : null,
    empresaAtual: blocks.empresa ? member.empresa : null,
    competencias: blocks.competencias ? (profile?.competencias ?? []) : null,
    servicos: blocks.servicos ? (profile?.servicos ?? []) : null,
    contatos:
      settings &&
      (settings.contacts.telefone || settings.contacts.whatsapp || settings.contacts.email)
        ? {
            telefone: settings.contacts.telefone ? member.telefone : null,
            whatsapp: settings.contacts.whatsapp ? member.whatsapp : null,
            email: settings.contacts.email ? member.email : null,
          }
        : null,
    redes:
      settings && Object.values(settings.externalLinks).some(Boolean)
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
    endereco: blocks.endereco
      ? {
          logradouro: member.endereco?.logradouro ?? null,
          numero: member.endereco?.numero ?? null,
          bairro: member.endereco?.bairro ?? null,
          cidade: member.endereco?.cidade ?? null,
          estado: member.endereco?.estado ?? null,
        }
      : null,
    // Preenchido depois, pelo use case — ver comentário no campo da interface.
    trajetoria: null,
    memoriaFotografica: null,
  };
}

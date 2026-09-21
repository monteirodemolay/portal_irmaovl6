import type { AreaAtuacaoKey, MemberSituationStatus } from '@vl6/shared';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { resolveAreaAtuacao } from '../lib/resolve-area-atuacao';
import { resolveEspecializacao } from '../lib/resolve-especializacao';
import type { PublicFamiliaLegadoDTO } from '../lib/build-public-familia-legado';
import type {
  CeremonyMatesGroup,
  MemberCeremonyEventIds,
} from '../../archive/lib/get-ceremony-mates';

export interface PublicMemberProfileDTO {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: Member['grau'];
  /**
   * CIM (Carteira de Identidade Maçônica) — espelho direto de `Member.cim`,
   * registro institucional (mesmo tratamento de `grau`/`dataIniciacao`:
   * nunca passa pelos blocos de `PublicationSettings`). Card de identidade
   * do novo layout (mock-up "Perfil VL6") — campo que o mock-up mostra mas
   * o DTO ainda não tinha.
   */
  cim: string | null;
  /**
   * Nome de exibição da Loja a que este Irmão pertence — resolvido a partir
   * do `Tenant` (`Tenant.id === tenantId` sempre, ver
   * docs/architecture/03-modelo-dados.md; `Member.lojaId` é hoje só um
   * espelho do `tenantId`, sem entidade "Loja" própria consultável). `null`
   * só se o tenant não for encontrado (não deveria acontecer em uso normal).
   */
  loja: string | null;
  /**
   * Potência maçônica — espelho direto de `Member.potencia`, já existente
   * na entidade (registro institucional, mesmo tratamento de `cim`/`grau`).
   */
  potencia: string;
  /**
   * "Oriente" (cidade/estado) da Loja — resolvido do endereço do `Tenant`
   * (`Tenant.endereco`), já que não existe um campo de Oriente dedicado em
   * nenhuma entidade do domínio. `null` quando o tenant não tem endereço
   * cadastrado — a UI simplesmente omite o quickfact "Oriente" nesse caso.
   */
  oriente: string | null;
  /**
   * Situação Maçônica atual — registro institucional da Loja, mesmo
   * espírito de `grau`/`dataIniciacao` abaixo: nunca passa pelos blocos de
   * `PublicationSettings`. A UI usa isto (não um campo booleano à parte)
   * pra decidir se renderiza a variante In Memoriam do perfil.
   */
  situacao: MemberSituationStatus;
  /**
   * Espelho de `Member.dataFalecimento` — só preenchido quando
   * `situacao === 'falecido'`. Mesmo tratamento institucional de `situacao`.
   */
  dataFalecimento: Date | null;
  /**
   * Mensagem de homenagem escrita pelo Administrador — só existe (e só
   * aparece na variante In Memoriam) quando `situacao === 'falecido'`.
   * Nunca editável pelo próprio Irmão, vivo ou não.
   */
  mensagemHomenagem: string | null;
  /**
   * Data de iniciação — registro institucional da Loja, mesmo espírito de
   * `grau` acima: nunca passa pelos blocos de `PublicationSettings`. Base
   * do "Selo de Trajetória" (`LodgeTenureBadge`) nos cards do Diretório e
   * de Negócios & Serviços — não exige nenhuma consulta extra, `Member` já
   * vem carregado por quem monta este DTO.
   */
  dataIniciacao: Date | null;
  apresentacao: { texto: string | null } | null;
  informacoesPessoais: {
    interesses: string | null;
    cidadeExibicao: string | null;
    /**
     * Dados da cônjuge — nome e aniversário natalício. Mesmo gate do resto
     * de `informacoesPessoais` (bloco `'informacoesPessoais'` de
     * `PublicationSettings`): só aparece se o próprio Irmão publicou esse
     * bloco. `diaNascimento`/`mesNascimento` nunca incluem o ano (mesma
     * convenção de privacidade do aniversário natalício do próprio Irmão,
     * ver `ProfileFamilyTab`) — vêm de `conjugeDataNascimento` quando
     * conhecida, ou do fallback `conjugeAniversarioDia`/`conjugeAniversarioMes`
     * quando não. `null` quando o Irmão não tem cônjuge cadastrada.
     */
    conjuge: {
      nome: string | null;
      diaNascimento: number | null;
      mesNascimento: number | null;
    } | null;
  } | null;
  profissional: {
    profissao: string | null;
    areaAtuacao: string | null;
    areaAtuacaoKey: AreaAtuacaoKey | null;
    especializacao: string | null;
    formacao: string | null;
    resumoProfissional: string | null;
  } | null;
  negocios: MemberCentralProfile['negocios'] | null;
  competencias: string[] | null;
  servicos: string[] | null;
  afiliacoes: MemberCentralProfile['afiliacoes'] | null;
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
    /**
     * `eventId` do Evento onde cada cerimônia aconteceu, quando encontrado
     * (`getMemberCeremonyEventIds`) — torna Iniciação/Elevação/Exaltação
     * clicáveis na UI, levando pro Acervo do Evento daquele dia. Chave
     * ausente/`undefined` = nenhum Evento/ArchiveItem vinculado ainda (a UI
     * mostra a entrada sem link).
     */
    ceremonyEventIds: MemberCeremonyEventIds;
    cargos: {
      cargo: string;
      gestaoId: string;
      gestaoNome: string;
      dataInicio: Date;
      dataFim: Date | null;
    }[];
    comissoes: {
      nome: string;
      gestaoId: string;
      gestaoNome: string;
      dataInicio: Date;
      dataFim: Date | null;
    }[];
    /**
     * O fim da trajetória, quando existe — só preenchido para `situacao`
     * terminal (`desligado`/`falecido`, `TERMINAL_MEMBER_SITUATION_STATUSES`).
     * Vem do registro vigente de `MemberSituationRecord` (mesma fonte de
     * `Member.dataFalecimento`) — nunca inventado a partir só do `situacao`
     * em `Member`, porque o motivo (Quite-Placet, transferência, Passou ao
     * Oriente Eterno…) só existe no histórico. Pedido explícito do
     * Administrador: "Caminho na Loja" precisa mostrar como/por que a
     * trajetória institucional terminou, não só onde ela começou.
     */
    encerramento: {
      situacao: MemberSituationStatus;
      motivo: string;
      motivoOutroDescricao: string | null;
      dataInicio: Date;
    } | null;
  } | null;
  /**
   * Fotografias do Acervo VL6 em que este Irmão está identificado — ponte
   * Diretório → Acervo (docs/architecture, princípio da Cadeia de União).
   * Gated pelo bloco `memoriaFotografica` (diferente de `trajetoria`: aqui é
   * claramente uma preferência pessoal do Irmão, não um registro da Loja).
   * Preenchido pelo use case, mesmo motivo de `trajetoria`.
   */
  memoriaFotografica: { id: string; src: string; caption: string }[] | null;
  /**
   * "Irmãos Gêmeos" — colegas que passaram pela mesma sessão de iniciação/
   * elevação/exaltação (mesmo `ArchiveItem`, `origem*MemberIds` — ver
   * `getCeremonyMates`). Registro da Loja, mesmo motivo de `trajetoria`:
   * nunca passa pelos blocos de `PublicationSettings`, todo Irmão
   * institucional tem essa lista exibida quando existir. `[]` quando não há
   * ninguém mais na mesma sessão (nunca omitido); preenchido pelo use case.
   */
  irmaosGemeos: CeremonyMatesGroup[];
  /**
   * Família e Legado — só os vínculos que o Irmão (ou quem cadastrou o
   * familiar) marcou como visíveis para `'members'`/`'archive'`
   * (`FAMILY_VISIBILITY_LEVELS`, `@vl6/shared`); `'private'`/
   * `'administration'` nunca chegam aqui. `null` cobre tanto "módulo sem
   * nenhum vínculo visível" quanto "nenhum vínculo cadastrado" — a UI não
   * precisa distinguir. Preenchido pelo use case, mesmo motivo de
   * `trajetoria`/`memoriaFotografica` (precisa de repositórios que a função
   * pura não recebe).
   */
  familia: PublicFamiliaLegadoDTO | null;
}

const CLOSED_BLOCKS: PublicationSettings['blocks'] = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  afiliacoes: false,
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
    cim: member.cim,
    potencia: member.potencia,
    // Preenchidos depois, pelo use case (precisam do `Tenant`, que esta
    // função pura não recebe) — ver comentário no campo da interface.
    loja: null,
    oriente: null,
    situacao: member.situacao,
    dataFalecimento: member.dataFalecimento,
    mensagemHomenagem: member.mensagemHomenagem,
    dataIniciacao: member.dataIniciacao,
    apresentacao: blocks.apresentacao ? { texto: profile?.apresentacao ?? null } : null,
    informacoesPessoais: blocks.informacoesPessoais
      ? {
          interesses: profile?.interesses ?? null,
          cidadeExibicao: profile?.cidadeExibicao ?? null,
          conjuge:
            member.conjugeNome || member.conjugeDataNascimento || member.conjugeAniversarioDia
              ? {
                  nome: member.conjugeNome,
                  diaNascimento: member.conjugeDataNascimento
                    ? member.conjugeDataNascimento.getDate()
                    : member.conjugeAniversarioDia,
                  mesNascimento: member.conjugeDataNascimento
                    ? member.conjugeDataNascimento.getMonth() + 1
                    : member.conjugeAniversarioMes,
                }
              : null,
        }
      : null,
    profissional: blocks.profissional
      ? {
          profissao: member.profissao,
          areaAtuacao: resolveAreaAtuacao(profile)?.label ?? null,
          areaAtuacaoKey: resolveAreaAtuacao(profile)?.key ?? null,
          especializacao: resolveEspecializacao(profile)?.label ?? null,
          formacao: profile?.formacao ?? null,
          resumoProfissional: profile?.resumoProfissional ?? null,
        }
      : null,
    // Só negócios já aprovados pela Administração — rascunho/em revisão/
    // suspenso/não-divulgado nunca aparecem a terceiros, mesmo com o bloco
    // "empresa" ligado (ver `ReviewBusinessSubmissionUseCase`).
    negocios: blocks.empresa
      ? (profile?.negocios.filter((n) => n.status === 'published') ?? [])
      : null,
    competencias: blocks.competencias ? (profile?.competencias ?? []) : null,
    servicos: blocks.servicos ? (profile?.servicos ?? []) : null,
    afiliacoes: blocks.afiliacoes ? (profile?.afiliacoes ?? []) : null,
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
    familia: null,
    irmaosGemeos: [],
  };
}

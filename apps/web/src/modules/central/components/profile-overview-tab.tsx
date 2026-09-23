import type { PublicMemberProfileDTO } from '@vl6/domain';
import { buildWhatsappLink, EDUCATION_LEVEL_LABELS } from '@vl6/shared';
import {
  Briefcase,
  Compass,
  Facebook,
  GraduationCap,
  Globe,
  Handshake,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from '@vl6/ui';
import { ProfileBioText } from './profile-bio-text';
import { LinkPill, Panel, SummaryRow, formatMonthYear } from './profile-shared';

/**
 * Aba "Visão Geral" do Perfil único (Fase 2) — apresentação/bio, resumo,
 * vivência maçônica complementar, outras afiliações e contato/redes.
 * Trajetória, Família e Legado e Acervo viraram abas próprias (ver
 * `ProfileTrajectoryTab`/`ProfileFamilyTab`/`ProfileAcervoTab`) —
 * conteúdo idêntico ao que já existia em `PublicMemberProfileView`, só
 * reagrupado.
 */
export function ProfileOverviewTab({
  profile,
  isOwnProfile = false,
  layout = 'full',
  hideBio = false,
}: {
  profile: PublicMemberProfileDTO;
  isOwnProfile?: boolean;
  layout?: 'full' | 'compact';
  /**
   * `true` — usado pelo novo layout de 3 colunas (`profile-layout/`), que já
   * mostra a biografia/mensagem de homenagem no card "Apresentação" próprio
   * — evita duas cópias do mesmo texto na página. Esconde a coluna
   * esquerda inteira (homenagem + "Sobre" + aviso de perfil vazio) E o
   * painel "Perfil em resumo" (que nesse layout já mora na coluna de
   * identidade, `ProfileIdentityRail`, junto de Grau/Profissão/Ingresso),
   * mantendo só Vivência Maçônica, Afiliações e Contato e Redes.
   */
  hideBio?: boolean;
}) {
  const isInMemoriam = profile.situacao === 'falecido';
  const canEdit = isOwnProfile && !isInMemoriam;

  const hasContatos = profile.contatos && Object.values(profile.contatos).some(Boolean);
  const hasRedes = profile.redes && Object.values(profile.redes).some(Boolean);
  const hasConexoes = hasContatos || hasRedes;
  const hasProfissional = Boolean(
    profile.profissional &&
    (profile.profissional.profissao ||
      profile.profissional.areaAtuacao ||
      profile.profissional.formacao ||
      profile.profissional.resumoProfissional ||
      profile.profissional.historicoProfissional.length > 0),
  );
  const hasVidaMaconica = Boolean(
    profile.informacoesMaconicas &&
    (profile.informacoesMaconicas.lojasVisitadas ||
      profile.informacoesMaconicas.interessesMaconicos),
  );
  const hasAfiliacoes = Boolean(profile.afiliacoes && profile.afiliacoes.length > 0);
  const historicoProfissional = [...(profile.profissional?.historicoProfissional ?? [])].sort(
    (a, b) => {
      if (a.atual !== b.atual) return a.atual ? -1 : 1;
      const aTime = a.dataInicio?.getTime() ?? 0;
      const bTime = b.dataInicio?.getTime() ?? 0;
      return bTime - aTime;
    },
  );
  const hasHistoricoProfissional = historicoProfissional.length > 0;
  const formacaoAcademica = [...(profile.formacaoAcademica ?? [])].sort((a, b) => {
    if (a.atual !== b.atual) return a.atual ? -1 : 1;
    const aTime = a.dataInicio?.getTime() ?? 0;
    const bTime = b.dataInicio?.getTime() ?? 0;
    return bTime - aTime;
  });
  const hasFormacaoAcademica = formacaoAcademica.length > 0;
  const hasCompetenciasServicos = Boolean(
    (profile.competencias && profile.competencias.length > 0) ||
    (profile.servicos && profile.servicos.length > 0),
  );
  const hasNegocios = Boolean(profile.negocios && profile.negocios.length > 0);
  const hasVoluntaryContent = Boolean(
    profile.apresentacao?.texto ||
    profile.informacoesPessoais ||
    profile.endereco ||
    hasProfissional ||
    hasFormacaoAcademica ||
    hasCompetenciasServicos ||
    hasNegocios ||
    hasConexoes ||
    hasVidaMaconica ||
    hasAfiliacoes ||
    (profile.memoriaFotografica && profile.memoriaFotografica.length > 0) ||
    profile.familia,
  );

  const summaryRows: { label: string; value: string }[] = [
    profile.profissional?.profissao
      ? { label: 'Profissão', value: profile.profissional.profissao }
      : null,
    profile.profissional?.areaAtuacao
      ? {
          label: 'Área',
          value: profile.profissional.especializacao
            ? `${profile.profissional.areaAtuacao} · ${profile.profissional.especializacao}`
            : profile.profissional.areaAtuacao,
        }
      : null,
    profile.profissional?.formacao
      ? { label: 'Formação', value: profile.profissional.formacao }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <div
      className={
        hideBio
          ? 'flex flex-col gap-6'
          : layout === 'full'
            ? 'grid grid-cols-1 gap-6 md:grid-cols-12'
            : 'grid gap-6'
      }
    >
      {!hideBio && (
        <div
          className={
            layout === 'full' ? 'flex flex-col gap-6 md:col-span-8' : 'flex flex-col gap-6'
          }
        >
          {isInMemoriam && profile.mensagemHomenagem && (
            <article className="from-primary/5 to-accent/10 border-accent/20 flex flex-col gap-3 rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
              <p className="font-display whitespace-pre-line text-base italic leading-relaxed sm:text-lg">
                {profile.mensagemHomenagem}
              </p>
            </article>
          )}

          {profile.apresentacao?.texto && (
            <Panel kicker="APRESENTAÇÃO" title="Sobre" editTab={canEdit ? 'geral' : undefined}>
              <ProfileBioText text={profile.apresentacao.texto} />
            </Panel>
          )}

          {!hasVoluntaryContent && (
            <div className="border-border bg-surface text-muted rounded-2xl border border-dashed p-6 text-sm">
              {canEdit
                ? 'Você ainda não compartilhou informações pessoais ou profissionais no seu perfil. Complete seu espaço na Comunidade VL6.'
                : 'Este Irmão ainda não compartilhou informações pessoais ou profissionais no Diretório.'}
            </div>
          )}
        </div>
      )}

      <aside
        className={
          !hideBio && layout === 'full'
            ? 'flex flex-col gap-6 md:col-span-4'
            : 'flex flex-col gap-6'
        }
      >
        {!hideBio &&
          (profile.informacoesPessoais?.cidadeExibicao ||
            profile.grau ||
            summaryRows.length > 0) && (
            <Panel kicker="RESUMO" title="Perfil em resumo" compact>
              <dl className="flex flex-col gap-2.5">
                {profile.informacoesPessoais?.cidadeExibicao && (
                  <SummaryRow label="Cidade" value={profile.informacoesPessoais.cidadeExibicao} />
                )}
                {summaryRows.map((row) => (
                  <SummaryRow key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </Panel>
          )}

        {hasVidaMaconica && profile.informacoesMaconicas && (
          <Panel
            kicker="VIDA MAÇÔNICA"
            title="Vivência Maçônica"
            icon={Compass}
            editTab={canEdit ? 'pessoal' : undefined}
            compact
          >
            <dl className="flex flex-col gap-2.5">
              {profile.informacoesMaconicas.lojasVisitadas && (
                <SummaryRow
                  label="Lojas visitadas"
                  value={profile.informacoesMaconicas.lojasVisitadas}
                />
              )}
              {profile.informacoesMaconicas.interessesMaconicos && (
                <SummaryRow
                  label="Interesses"
                  value={profile.informacoesMaconicas.interessesMaconicos}
                />
              )}
            </dl>
          </Panel>
        )}

        {hasAfiliacoes && profile.afiliacoes && (
          <Panel
            kicker="AFILIAÇÕES"
            title="Outras afiliações"
            icon={Handshake}
            editTab={canEdit ? 'afiliacoes' : undefined}
            compact
          >
            <div className="flex flex-col gap-3">
              {profile.afiliacoes.map((afiliacao) => (
                <div key={afiliacao.id} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {afiliacao.nomeInstituicao}
                    {afiliacao.abrangencia === 'internacional' && (
                      <span className="text-muted ml-1.5 text-xs">
                        · Internacional{afiliacao.pais ? ` — ${afiliacao.pais}` : ''}
                      </span>
                    )}
                  </p>
                  {afiliacao.papel && <p className="text-muted text-xs">{afiliacao.papel}</p>}
                  {(afiliacao.instagram || afiliacao.siteUrl) && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {afiliacao.instagram && (
                        <LinkPill href={afiliacao.instagram} label="Instagram" icon={Instagram} />
                      )}
                      {afiliacao.siteUrl && (
                        <LinkPill href={afiliacao.siteUrl} label="Site" icon={Globe} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {hasHistoricoProfissional && (
          <Panel
            kicker="TRAJETÓRIA"
            title="Histórico Profissional"
            icon={Briefcase}
            editTab={canEdit ? 'profissional' : undefined}
            compact
          >
            <div className="flex flex-col gap-3">
              {historicoProfissional.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">
                    {entry.cargo ? `${entry.cargo} — ${entry.empresa}` : entry.empresa}
                  </p>
                  <p className="text-muted text-xs">
                    {entry.dataInicio ? formatMonthYear(entry.dataInicio) : '—'}
                    {' · '}
                    {entry.atual ? 'atual' : entry.dataFim ? formatMonthYear(entry.dataFim) : '—'}
                  </p>
                  {entry.descricao && (
                    <p className="text-muted mt-0.5 text-xs leading-relaxed">{entry.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {hasFormacaoAcademica && (
          <Panel
            kicker="FORMAÇÃO"
            title="Formação Acadêmica"
            icon={GraduationCap}
            editTab={canEdit ? 'profissional' : undefined}
            compact
          >
            <div className="flex flex-col gap-3">
              {formacaoAcademica.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">
                    {EDUCATION_LEVEL_LABELS[entry.nivel]}
                    {entry.curso ? ` — ${entry.curso}` : ''}
                  </p>
                  <p className="text-muted text-xs">{entry.instituicao}</p>
                  <p className="text-muted text-xs">
                    {entry.dataInicio ? formatMonthYear(entry.dataInicio) : '—'}
                    {' · '}
                    {entry.atual
                      ? 'em andamento'
                      : entry.dataFim
                        ? formatMonthYear(entry.dataFim)
                        : '—'}
                  </p>
                  {entry.descricao && (
                    <p className="text-muted mt-0.5 text-xs leading-relaxed">{entry.descricao}</p>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {(hasConexoes || profile.endereco) && (
          <Panel
            kicker="CONEXÕES"
            title="Contato e Redes"
            editTab={canEdit ? 'contatos' : undefined}
            compact
          >
            <div className="flex flex-col gap-2">
              {profile.endereco &&
                (profile.endereco.logradouro ||
                  profile.endereco.bairro ||
                  profile.endereco.cidade) && (
                  <p className="text-muted flex items-start gap-2 text-xs leading-relaxed">
                    <MapPin size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                    {[
                      [profile.endereco.logradouro, profile.endereco.numero]
                        .filter(Boolean)
                        .join(', '),
                      profile.endereco.bairro,
                      [profile.endereco.cidade, profile.endereco.estado]
                        .filter(Boolean)
                        .join(' - '),
                    ]
                      .filter(Boolean)
                      .join(' — ')}
                  </p>
                )}
              {profile.contatos?.whatsapp && (
                <LinkPill
                  href={buildWhatsappLink(profile.contatos.whatsapp)}
                  label={profile.contatos.whatsapp}
                  icon={MessageCircle}
                />
              )}
              {profile.contatos?.telefone && (
                <LinkPill
                  href={`tel:${profile.contatos.telefone}`}
                  label={profile.contatos.telefone}
                  icon={Phone}
                />
              )}
              {profile.contatos?.email && (
                <LinkPill
                  href={`mailto:${profile.contatos.email}`}
                  label={profile.contatos.email}
                  icon={Mail}
                />
              )}
              {profile.redes?.whatsapp && (
                <LinkPill
                  href={buildWhatsappLink(profile.redes.whatsapp)}
                  label="WhatsApp"
                  icon={MessageCircle}
                />
              )}
              {profile.redes?.instagram && (
                <LinkPill href={profile.redes.instagram} label="Instagram" icon={Instagram} />
              )}
              {profile.redes?.facebook && (
                <LinkPill href={profile.redes.facebook} label="Facebook" icon={Facebook} />
              )}
              {profile.redes?.linkedin && (
                <LinkPill href={profile.redes.linkedin} label="LinkedIn" icon={Linkedin} />
              )}
              {profile.redes?.lattes && (
                <LinkPill
                  href={profile.redes.lattes}
                  label="Currículo Lattes"
                  icon={GraduationCap}
                />
              )}
              {profile.redes?.site && (
                <LinkPill href={profile.redes.site} label="Site" icon={Globe} />
              )}
            </div>
          </Panel>
        )}
      </aside>
    </div>
  );
}

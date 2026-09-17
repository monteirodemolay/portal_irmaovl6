import type { PublicMemberProfileDTO } from '@vl6/domain';
import { buildWhatsappLink } from '@vl6/shared';
import {
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
import { LinkPill, Panel, SummaryRow } from './profile-shared';

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
   * esquerda inteira (homenagem + "Sobre" + aviso de perfil vazio),
   * mantendo só o resumo lateral (Perfil em resumo, Vivência Maçônica,
   * Afiliações, Contato e Redes).
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
      profile.profissional.resumoProfissional),
  );
  const hasVidaMaconica = Boolean(
    profile.informacoesMaconicas &&
    (profile.informacoesMaconicas.lojasVisitadas ||
      profile.informacoesMaconicas.interessesMaconicos),
  );
  const hasAfiliacoes = Boolean(profile.afiliacoes && profile.afiliacoes.length > 0);
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
        {(profile.informacoesPessoais?.cidadeExibicao ||
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

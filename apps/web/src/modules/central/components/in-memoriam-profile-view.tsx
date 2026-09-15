import type { ReactNode } from 'react';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import { HONOR_TYPE_LABELS, MEMBER_TITLE_LABELS } from '@vl6/shared';
import { Award, Badge, CalendarDays, Cross, EmptyState, Milestone } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { CeremonyMatesPanel } from '@/components/membership/ceremony-mates-panel';
import type { PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { HONOR_TYPE_BADGE_ICON, MEMBER_TITLE_BADGE_ICON } from '@/modules/honors/honor-badge-icons';
import { formatDate, Panel, SummaryRow } from './profile-shared';
import { ProfileBioText } from './profile-bio-text';
import { ProfileFamilyTab } from './profile-family-tab';
import { ProfileAcervoTab } from './profile-acervo-tab';
import { MemoryWordsCard } from './memory-words-card';
import { TrajectoryTimelinePanel } from './trajectory-timeline-panel';
import { HonorDetailDialog } from './honor-detail-dialog';

/**
 * Perfil "In Memoriam" — variante dedicada do Perfil único pra Irmãos
 * falecidos (`profile.situacao === 'falecido'`), mock-up do Administrador:
 * "a tela ficou disforme... mais bem arquitetado... redistribuição dos
 * cards, proporcionais... insira em contextos". Diferente do Perfil ativo
 * (seções empilhadas em largura cheia), aqui os cards formam uma grade
 * "bento" de 12 colunas, agrupada em três contextos visuais — Trajetória e
 * Biografia (bio + dados essenciais + Caminho na Ordem + Honrarias),
 * Legado e Memória (Palavras à Memória + Família + Irmãos Gêmeos) e Acervo
 * VL6 — cada um adaptando a largura das colunas conforme o Irmão tem muita
 * ou pouca informação cadastrada, nunca reservando espaço vazio.
 *
 * Reusa os mesmos dados e sub-componentes do Perfil ativo
 * (`ProfileFamilyTab`, `ProfileAcervoTab`, `TrajectoryTimelinePanel`) — só a
 * disposição espacial muda; nenhuma regra de negócio/visibilidade é
 * duplicada.
 */
export function InMemoriamProfileView({
  profile,
  canViewAcervo = false,
  memberTitles = [],
  honors = [],
  philosophicalJourneys = [],
  acervoPhotos = [],
  acervoRelationsSlot = null,
}: {
  profile: PublicMemberProfileDTO;
  canViewAcervo?: boolean;
  memberTitles?: MemberTitle[];
  honors?: Honor[];
  philosophicalJourneys?: PhilosophicalJourney[];
  acervoPhotos?: PersonPhoto[];
  acervoRelationsSlot?: ReactNode;
}) {
  const visibleJourneys = philosophicalJourneys.filter((journey) => journey.visivel);
  const trajetoria = profile.trajetoria;

  const hasFacts = Boolean(
    trajetoria &&
    (trajetoria.dataIniciacao ||
      trajetoria.dataElevacao ||
      trajetoria.dataExaltacao ||
      trajetoria.encerramento ||
      profile.dataFalecimento),
  );
  const hasTrajetoria = Boolean(
    trajetoria &&
    (trajetoria.dataIniciacao ||
      trajetoria.dataElevacao ||
      trajetoria.dataExaltacao ||
      trajetoria.cargos.length > 0 ||
      trajetoria.comissoes.length > 0 ||
      trajetoria.encerramento),
  );
  const hasHonorsSecondary =
    memberTitles.length > 0 || honors.length > 0 || visibleJourneys.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <InMemoriamHero profile={profile} />

      <div>
        <p className="text-muted mb-4 text-[10px] font-bold uppercase tracking-[0.14em]">
          Trajetória e Biografia
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className={hasFacts ? 'md:col-span-8' : 'md:col-span-12'}>
            <Panel kicker="HISTÓRIA" title="Trajetória e Biografia">
              {profile.apresentacao?.texto ? (
                <ProfileBioText text={profile.apresentacao.texto} />
              ) : (
                <p className="text-muted text-sm">
                  Este espaço ainda não recebeu a biografia deste Irmão.
                </p>
              )}
            </Panel>
          </div>

          {hasFacts && trajetoria && (
            <div className="md:col-span-4">
              <Panel kicker="DADOS ESSENCIAIS" title="Memória do Irmão" icon={CalendarDays} compact>
                <dl className="flex flex-col gap-2.5">
                  {trajetoria.dataIniciacao && (
                    <SummaryRow label="Iniciação" value={formatDate(trajetoria.dataIniciacao)} />
                  )}
                  {trajetoria.dataElevacao && (
                    <SummaryRow label="Elevação" value={formatDate(trajetoria.dataElevacao)} />
                  )}
                  {trajetoria.dataExaltacao && (
                    <SummaryRow label="Exaltação" value={formatDate(trajetoria.dataExaltacao)} />
                  )}
                  {profile.dataFalecimento && (
                    <SummaryRow
                      label="Oriente Eterno"
                      value={formatDate(profile.dataFalecimento)}
                    />
                  )}
                </dl>
              </Panel>
            </div>
          )}

          <div className={hasHonorsSecondary ? 'md:col-span-8' : 'md:col-span-12'}>
            {hasTrajetoria ? (
              <TrajectoryTimelinePanel
                profile={profile}
                kicker="VIDA MAÇÔNICA"
                title="Caminho na Ordem"
              />
            ) : (
              <EmptyState
                icon={<Milestone size={22} />}
                title="Nenhum cargo institucional registrado"
                description="Este Irmão não tem cargos de Diretoria ou comissões registrados no histórico."
              />
            )}
          </div>

          {hasHonorsSecondary && (
            <div className="md:col-span-4">
              <Panel kicker="RECONHECIMENTO" title="Honrarias e Títulos" icon={Award} compact>
                <div className="flex flex-col gap-4">
                  {memberTitles.map((title) => (
                    <div key={title.id} className="flex items-center gap-2.5">
                      <img
                        src={MEMBER_TITLE_BADGE_ICON[title.titulo]}
                        alt=""
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                      <span className="min-w-0 text-xs font-medium leading-tight">
                        {title.titulo === 'outro'
                          ? title.tituloOutro
                          : MEMBER_TITLE_LABELS[title.titulo]}
                      </span>
                    </div>
                  ))}
                  {honors.map((honor) => (
                    <div key={honor.id} className="flex items-center gap-2.5">
                      <img
                        src={HONOR_TYPE_BADGE_ICON[honor.tipo]}
                        alt=""
                        className="h-9 w-9 shrink-0 object-contain"
                      />
                      <span className="min-w-0 flex-1 text-xs font-medium leading-tight">
                        {honor.nomeOficial}
                        <span className="text-muted block text-[10px] font-normal">
                          {HONOR_TYPE_LABELS[honor.tipo]}
                        </span>
                      </span>
                      <HonorDetailDialog honor={honor} />
                    </div>
                  ))}
                  {visibleJourneys.map((journey) => (
                    <Badge
                      key={journey.id}
                      variant="accent"
                      className="w-fit rounded-full px-2.5 py-1"
                    >
                      {journey.rito}
                      {journey.grau ? ` · ${journey.grau}` : ''}
                    </Badge>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-muted mb-4 text-[10px] font-bold uppercase tracking-[0.14em]">
          Legado e Memória
        </p>
        <div className="flex flex-col gap-6">
          {profile.mensagemHomenagem && <MemoryWordsCard text={profile.mensagemHomenagem} />}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="md:col-span-6">
              <ProfileFamilyTab profile={profile} canViewAcervo={canViewAcervo} />
            </div>
            <div className="md:col-span-6">
              {profile.irmaosGemeos.length > 0 ? (
                <CeremonyMatesPanel groups={profile.irmaosGemeos} />
              ) : (
                <EmptyState
                  icon={<Cross size={22} />}
                  title="Nenhum colega de cerimônia"
                  description="Ninguém mais participou das mesmas sessões de Iniciação, Elevação ou Exaltação."
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {canViewAcervo && (
        <div>
          <p className="text-muted mb-4 text-[10px] font-bold uppercase tracking-[0.14em]">
            Acervo VL6
          </p>
          <ProfileAcervoTab
            profile={profile}
            canViewAcervo={canViewAcervo}
            acervoPhotos={acervoPhotos}
            relationsSlot={acervoRelationsSlot}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Faixa de abertura do Perfil In Memoriam — retrato grande centralizado,
 * nome, datas de Iniciação/Oriente Eterno e selos de identidade (grau,
 * Loja), sobre um fundo em gradiente escuro (mesmo par `primary`/
 * `primary-dark` do `ProfileHeaderCard`, só num tratamento mais solene,
 * pedido explícito do Administrador pra essa variante).
 */
function InMemoriamHero({ profile }: { profile: PublicMemberProfileDTO }) {
  const dataIniciacao = profile.trajetoria?.dataIniciacao ?? profile.dataIniciacao;

  return (
    <section className="from-primary to-primary-dark relative overflow-hidden rounded-2xl bg-gradient-to-br text-white shadow-sm">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 32%)',
        }}
      />
      <div className="relative flex flex-col items-center gap-5 px-6 py-10 text-center sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:text-left">
        <MemberAvatar
          fotoUrl={profile.fotoUrl}
          nome={profile.nomeCompleto}
          className="border-surface h-32 w-32 shrink-0 border-4 shadow-md sm:h-36 sm:w-36"
          imgClassName="object-top"
        />
        <div className="min-w-0">
          <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 sm:justify-start">
            <Cross size={12} strokeWidth={2} />
            In Memoriam
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold sm:text-4xl">
            {profile.nomeCompleto}
          </h1>
          {(dataIniciacao || profile.dataFalecimento) && (
            <p className="mt-2 text-sm text-white/75">
              {dataIniciacao ? formatDate(dataIniciacao) : '—'}
              {' ✦ '}
              {profile.dataFalecimento ? formatDate(profile.dataFalecimento) : '—'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium">
              <Cross size={12} strokeWidth={1.75} />
              Oriente Eterno
            </span>
            <MemberDegreeBadge
              grau={profile.grau}
              className="border-white/20 bg-white/10 text-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

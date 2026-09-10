import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import {
  buildWhatsappLink,
  FAMILY_DISPLAY_GROUPS,
  FAMILY_DISPLAY_GROUP_LABELS,
  getBoardPositionLabel,
} from '@vl6/shared';
import {
  ArrowUpRight,
  Camera,
  Card,
  CardContent,
  CalendarDays,
  Compass,
  Facebook,
  GraduationCap,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Milestone,
  Phone,
} from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { MemberPhotoGrid } from './member-photo-grid';
import { ProfileBioText } from './profile-bio-text';

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

/** Tabs de Meu Espaço que cada bloco do perfil edita — ver comentário em `Panel`. */
type EditTab = 'geral' | 'pessoal' | 'profissional' | 'empresa' | 'contatos' | 'redes';

/**
 * Cargo ou comissão em curso — vira o selo de "gestão atual" no cabeçalho.
 * Prioriza cargo sobre comissão quando os dois estão em aberto.
 */
function getCurrentAssignment(trajetoria: PublicMemberProfileDTO['trajetoria']) {
  if (!trajetoria) return null;
  const activeCargo = trajetoria.cargos.find((entry) => !entry.dataFim);
  if (activeCargo) {
    return { label: getBoardPositionLabel(activeCargo.cargo), gestaoNome: activeCargo.gestaoNome };
  }
  const activeComissao = trajetoria.comissoes.find((entry) => !entry.dataFim);
  if (activeComissao) {
    return { label: activeComissao.nome, gestaoNome: activeComissao.gestaoNome };
  }
  return null;
}

/**
 * Painel institucional — kicker + título serif, ícone opcional e link de
 * edição ("Editar" abre a aba certa de Meu Espaço quando é o próprio
 * perfil). `compact` reduz peso tipográfico para a coluna lateral.
 */
function Panel({
  kicker,
  title,
  icon: Icon,
  editTab,
  trailing,
  compact = false,
  children,
}: {
  kicker: string;
  title: string;
  icon?: IconType;
  editTab?: EditTab;
  trailing?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted text-[10px] font-bold tracking-[0.14em]">{kicker}</p>
          <h2
            className={
              compact
                ? 'font-display mt-1 text-base font-semibold'
                : 'font-display mt-1 text-lg font-semibold'
            }
          >
            {title}
          </h2>
        </div>
        {trailing ??
          (editTab ? (
            <Link
              href={`/irmaos/meu-espaco?tab=${editTab}`}
              className="text-accent shrink-0 text-xs font-semibold hover:underline"
            >
              Editar
            </Link>
          ) : Icon ? (
            <Icon size={16} strokeWidth={1.75} className="text-accent mt-1 shrink-0" />
          ) : null)}
      </div>
      {children}
    </article>
  );
}

function LinkPill({ href, label, icon: Icon }: { href: string; label: string; icon: IconType }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background hover:border-primary hover:text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
    >
      <Icon size={15} strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </a>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-3 border-b border-dashed pb-2.5 last:border-0 last:pb-0">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-right text-xs font-semibold">{value}</dd>
    </div>
  );
}

/**
 * Renderização somente leitura de um `PublicMemberProfileDTO` — já filtrado
 * server-side (docs/architecture, Central VL6). Nunca renderiza uma seção
 * vazia: se a chave é `null`, a seção inteira some. Reusada tanto pelo
 * preview "como os outros veem" (`/perfil`) quanto pelo perfil de terceiro
 * (`/central/[memberId]`).
 *
 * Layout institucional em grid de 12 colunas (coluna principal 8/12 com a
 * trajetória, biografia, família e memória; coluna lateral 4/12 com o
 * resumo, carreira e contatos) — não um formulário reaproveitado como
 * cards.
 */
export function PublicMemberProfileView({
  profile,
  canViewAcervo = false,
  isOwnProfile = false,
}: {
  profile: PublicMemberProfileDTO;
  /** Gate do link "Ver Memória VL6 completa" — ponte Diretório → Acervo (Fase B/C). */
  canViewAcervo?: boolean;
  /** Sessão atual == dono deste perfil → mostra "Editar meu perfil" e "Editar" por bloco. */
  isOwnProfile?: boolean;
}) {
  const hasContatos = profile.contatos && Object.values(profile.contatos).some(Boolean);
  const hasRedes = profile.redes && Object.values(profile.redes).some(Boolean);
  const hasConexoes = hasContatos || hasRedes;
  const hasTrajetoria = Boolean(
    profile.trajetoria &&
    (profile.trajetoria.dataIniciacao ||
      profile.trajetoria.dataElevacao ||
      profile.trajetoria.dataExaltacao ||
      profile.trajetoria.cargos.length > 0 ||
      profile.trajetoria.comissoes.length > 0),
  );
  const hasProfissional = Boolean(
    profile.profissional &&
    (profile.profissional.profissao ||
      profile.profissional.areaAtuacao ||
      profile.profissional.formacao ||
      profile.profissional.resumoProfissional),
  );
  const hasResumoProfissional = Boolean(profile.profissional?.resumoProfissional);
  const hasNegocios = Boolean(
    profile.empresaAtual || (profile.negocios && profile.negocios.length > 0),
  );
  const hasCompetenciasServicos = Boolean(
    (profile.competencias && profile.competencias.length > 0) ||
    (profile.servicos && profile.servicos.length > 0),
  );
  const hasVidaMaconica = Boolean(
    profile.informacoesMaconicas &&
    (profile.informacoesMaconicas.lojasVisitadas ||
      profile.informacoesMaconicas.interessesMaconicos),
  );
  const hasVoluntaryContent = Boolean(
    profile.apresentacao?.texto ||
    profile.informacoesPessoais ||
    profile.endereco ||
    hasProfissional ||
    hasCompetenciasServicos ||
    hasNegocios ||
    hasConexoes ||
    hasVidaMaconica ||
    (profile.memoriaFotografica && profile.memoriaFotografica.length > 0) ||
    profile.familia,
  );

  const current = getCurrentAssignment(profile.trajetoria);
  const dataIniciacao = profile.trajetoria?.dataIniciacao ?? profile.dataIniciacao;
  const summaryRows: { label: string; value: string }[] = [
    profile.profissional?.profissao
      ? { label: 'Profissão', value: profile.profissional.profissao }
      : null,
    profile.profissional?.areaAtuacao
      ? { label: 'Área', value: profile.profissional.areaAtuacao }
      : null,
    profile.profissional?.formacao
      ? { label: 'Formação', value: profile.profissional.formacao }
      : null,
    current ? { label: 'Cargo/comissão atual', value: current.label } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho institucional */}
      <Card className="overflow-hidden">
        <div className="from-primary to-primary-dark relative h-24 bg-gradient-to-br sm:h-28" />
        <CardContent className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <MemberAvatar
              fotoUrl={profile.fotoUrl}
              nome={profile.nomeCompleto}
              className="border-surface -mt-12 h-24 w-24 border-4 shadow-md sm:-mt-14 sm:h-28 sm:w-28"
            />
            {isOwnProfile && (
              <Link
                href="/irmaos/meu-espaco"
                className="border-border bg-surface hover:border-primary hover:text-primary flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors"
              >
                Editar meu perfil
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-display text-2xl font-semibold sm:text-[28px]">
              {profile.nomeCompleto}
            </p>
            <MemberDegreeBadge grau={profile.grau} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.informacoesPessoais?.cidadeExibicao && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                <MapPin size={13} strokeWidth={1.75} />
                {profile.informacoesPessoais.cidadeExibicao}
              </span>
            )}
            {dataIniciacao && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                <CalendarDays size={13} strokeWidth={1.75} />
                Iniciado em {formatDate(dataIniciacao)}
              </span>
            )}
            {current && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                <Compass size={13} strokeWidth={1.75} />
                {current.label}
              </span>
            )}
            {current && (
              <span className="bg-accent/15 text-primary-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
                Gestão {current.gestaoNome}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/*
        Grid 8/4 baseada no espaço do próprio container (@container), não no
        viewport: este componente também é usado dentro do Drawer do
        Diretório e do Dialog de pré-visualização (ambos bem mais estreitos
        que a tela) — uma quebra por viewport quebraria o layout ali.
      */}
      <div className="@container">
        <div className="@5xl:grid-cols-12 grid grid-cols-1 gap-6">
          <div className="@5xl:col-span-8 flex flex-col gap-6">
            {hasTrajetoria && profile.trajetoria && (
              <Panel kicker="TRAJETÓRIA" title="Caminho na Loja" icon={Milestone}>
                <div className="flex flex-col gap-4">
                  {(profile.trajetoria.dataIniciacao ||
                    profile.trajetoria.dataElevacao ||
                    profile.trajetoria.dataExaltacao) && (
                    <ol className="flex flex-col gap-3">
                      {profile.trajetoria.dataIniciacao && (
                        <li className="grid grid-cols-[16px_92px_1fr] items-start gap-3">
                          <span className="bg-accent mt-1 h-3.5 w-3.5 rounded-full" />
                          <span className="text-muted text-[10px] font-bold uppercase tabular-nums">
                            {formatDate(profile.trajetoria.dataIniciacao)}
                          </span>
                          <span className="text-sm font-semibold">Iniciação</span>
                        </li>
                      )}
                      {profile.trajetoria.dataElevacao && (
                        <li className="grid grid-cols-[16px_92px_1fr] items-start gap-3">
                          <span className="bg-accent mt-1 h-3.5 w-3.5 rounded-full" />
                          <span className="text-muted text-[10px] font-bold uppercase tabular-nums">
                            {formatDate(profile.trajetoria.dataElevacao)}
                          </span>
                          <span className="text-sm font-semibold">Elevação</span>
                        </li>
                      )}
                      {profile.trajetoria.dataExaltacao && (
                        <li className="grid grid-cols-[16px_92px_1fr] items-start gap-3">
                          <span className="bg-accent mt-1 h-3.5 w-3.5 rounded-full" />
                          <span className="text-muted text-[10px] font-bold uppercase tabular-nums">
                            {formatDate(profile.trajetoria.dataExaltacao)}
                          </span>
                          <span className="text-sm font-semibold">Exaltação</span>
                        </li>
                      )}
                    </ol>
                  )}
                  {profile.trajetoria.cargos.map((entry, index) => (
                    <div
                      key={`cargo-${index}`}
                      className="grid grid-cols-[16px_92px_1fr] items-start gap-3"
                    >
                      <span
                        className={
                          entry.dataFim
                            ? 'border-border mt-1 h-3.5 w-3.5 rounded-full border-2 bg-transparent'
                            : 'bg-accent mt-1 h-3.5 w-3.5 rounded-full'
                        }
                      />
                      <span className="text-muted text-[10px] font-bold uppercase tabular-nums">
                        {formatDate(entry.dataInicio)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {getBoardPositionLabel(entry.cargo)}
                        </p>
                        <p className="text-muted text-xs">
                          Cargo · {entry.gestaoNome}
                          {entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {profile.trajetoria.comissoes.map((entry, index) => (
                    <div
                      key={`comissao-${index}`}
                      className="grid grid-cols-[16px_92px_1fr] items-start gap-3"
                    >
                      <span
                        className={
                          entry.dataFim
                            ? 'border-border mt-1 h-3.5 w-3.5 rounded-full border-2 bg-transparent'
                            : 'bg-accent mt-1 h-3.5 w-3.5 rounded-full'
                        }
                      />
                      <span className="text-muted text-[10px] font-bold uppercase tabular-nums">
                        {formatDate(entry.dataInicio)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{entry.nome}</p>
                        <p className="text-muted text-xs">
                          Comissão · {entry.gestaoNome}
                          {entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {profile.apresentacao?.texto && (
              <Panel
                kicker="APRESENTAÇÃO"
                title="Sobre"
                editTab={isOwnProfile ? 'geral' : undefined}
              >
                <ProfileBioText text={profile.apresentacao.texto} />
              </Panel>
            )}

            {profile.familia && (
              <Panel
                kicker="VÍNCULOS"
                title="Família e Legado"
                editTab={isOwnProfile ? 'pessoal' : undefined}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {FAMILY_DISPLAY_GROUPS.filter((group) => profile.familia?.[group]?.length).map(
                    (group) => (
                      <div
                        key={group}
                        className="border-border bg-background flex flex-col gap-2.5 rounded-xl border p-4"
                      >
                        <p className="text-muted text-[10px] font-bold uppercase tracking-wide">
                          {FAMILY_DISPLAY_GROUP_LABELS[group]}
                        </p>
                        <ul className="flex flex-col gap-2.5">
                          {profile.familia?.[group]?.map((item) => (
                            <li key={item.key} className="flex items-center gap-2.5 text-sm">
                              <MemberAvatar
                                fotoUrl={item.fotoUrl}
                                nome={item.nomeCompleto}
                                className="h-8 w-8 shrink-0"
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {item.nomeCompleto}
                                </span>
                                <span className="text-muted block text-xs">{item.parentesco}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                  )}
                </div>
                {canViewAcervo && (
                  <Link
                    href={`/acervo/pessoas/${profile.memberId}`}
                    className="text-accent flex w-fit items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    Explorar Constelação da Memória
                    <ArrowUpRight size={13} strokeWidth={2} />
                  </Link>
                )}
              </Panel>
            )}

            {profile.memoriaFotografica && profile.memoriaFotografica.length > 0 && (
              <Panel
                kicker="MEMÓRIA"
                title="Memória Fotográfica"
                trailing={
                  canViewAcervo ? (
                    <Link
                      href={`/acervo/pessoas/${profile.memberId}`}
                      className="text-accent flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      Ver Memória VL6 completa
                      <ArrowUpRight size={13} strokeWidth={2} />
                    </Link>
                  ) : (
                    <Camera size={16} strokeWidth={1.75} className="text-accent mt-1 shrink-0" />
                  )
                }
              >
                <MemberPhotoGrid photos={profile.memoriaFotografica} />
              </Panel>
            )}

            {!hasVoluntaryContent && (
              <div className="border-border bg-surface text-muted rounded-2xl border border-dashed p-6 text-sm">
                {isOwnProfile ? (
                  <>
                    Você ainda não compartilhou informações pessoais ou profissionais no seu perfil.{' '}
                    <Link
                      href="/irmaos/meu-espaco"
                      className="text-accent font-semibold hover:underline"
                    >
                      Complete seu espaço na Comunidade VL6
                    </Link>
                    .
                  </>
                ) : (
                  'Este Irmão ainda não compartilhou informações pessoais ou profissionais no Diretório.'
                )}
              </div>
            )}
          </div>

          <aside className="@5xl:col-span-4 flex flex-col gap-6">
            <Panel kicker="RESUMO" title="Perfil em resumo" compact>
              <dl className="flex flex-col gap-2.5">
                {profile.informacoesPessoais?.cidadeExibicao && (
                  <SummaryRow label="Cidade" value={profile.informacoesPessoais.cidadeExibicao} />
                )}
                <div className="border-border flex items-center justify-between gap-3 border-b border-dashed pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-muted text-xs">Grau</dt>
                  <dd className="text-right text-xs font-semibold">
                    <MemberDegreeBadge grau={profile.grau} size="xs" compact />
                  </dd>
                </div>
                {summaryRows.map((row) => (
                  <SummaryRow key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </Panel>

            {profile.informacoesPessoais?.interesses && (
              <Panel kicker="PESSOAL" title="Interesses" compact>
                <p className="text-sm leading-relaxed">{profile.informacoesPessoais.interesses}</p>
              </Panel>
            )}

            {hasResumoProfissional && profile.profissional?.resumoProfissional && (
              <Panel
                kicker="CARREIRA"
                title="Atuação profissional"
                editTab={isOwnProfile ? 'profissional' : undefined}
                compact
              >
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {profile.profissional.resumoProfissional}
                </p>
              </Panel>
            )}

            {hasCompetenciasServicos && (
              <Panel
                kicker="COMPETÊNCIAS"
                title="Competências e serviços"
                editTab={isOwnProfile ? 'profissional' : undefined}
                compact
              >
                <div className="flex flex-wrap gap-1.5">
                  {[...(profile.competencias ?? []), ...(profile.servicos ?? [])].map((tag) => (
                    <span
                      key={tag}
                      className="bg-background text-foreground rounded-md px-2.5 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {hasVidaMaconica && profile.informacoesMaconicas && (
              <Panel
                kicker="VIDA MAÇÔNICA"
                title="Vivência Maçônica"
                icon={Compass}
                editTab={isOwnProfile ? 'pessoal' : undefined}
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

            {hasNegocios && (
              <Panel
                kicker="ATUAÇÃO"
                title="Negócios vinculados"
                editTab={isOwnProfile ? 'empresa' : undefined}
                compact
              >
                <div className="flex flex-col gap-2.5">
                  {profile.empresaAtual && (
                    <div className="border-border bg-background rounded-xl border p-3.5">
                      <p className="text-sm font-semibold">{profile.empresaAtual}</p>
                      <p className="text-muted mt-0.5 text-xs">Empresa atual</p>
                    </div>
                  )}
                  {profile.negocios?.map((negocio) => (
                    <Link
                      key={negocio.id}
                      href={`/irmaos/negocios/${negocio.id}`}
                      className="border-border hover:border-primary bg-background flex flex-col gap-0.5 rounded-xl border p-3.5 text-sm transition-colors"
                    >
                      <p className="font-semibold">{negocio.nomeEmpresa}</p>
                      {negocio.segmento && <p className="text-muted text-xs">{negocio.segmento}</p>}
                    </Link>
                  ))}
                </div>
              </Panel>
            )}

            {(hasConexoes || profile.endereco) && (
              <Panel
                kicker="CONEXÕES"
                title="Contato e Redes"
                editTab={isOwnProfile ? 'contatos' : undefined}
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
      </div>
    </div>
  );
}

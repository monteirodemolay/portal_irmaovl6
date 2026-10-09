import Link from '@/components/layout/context-link';
import { createServerContainer } from '@vl6/infra';
import { Archive, ArrowRight, Clock3, FilePlus2, History, ShieldCheck } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  loadFileMigrationCandidatesAction,
  loadLibraryMigrationCandidatesAction,
  loadMigrationCandidatesAction,
} from '@/modules/archive/actions/migration-actions';
import { loadRecentArchiveActivityAction } from '@/modules/archive/actions/metrics-actions';
import { MigrationManager } from '@/modules/archive/components/migration-manager';

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-border bg-surface rounded-2xl border p-5">
      <p className="text-muted text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="font-display mt-2 text-3xl font-semibold">{value}</p>
      <p className="text-muted mt-1 text-xs leading-5">{detail}</p>
    </div>
  );
}

export default async function AcervoIndexPage() {
  const session = await requirePagePermission('archiveItem:read');
  const container = createServerContainer();

  const [
    itemsPage,
    galleryCandidates,
    fileCandidates,
    libraryCandidates,
    eventsPage,
    activity,
  ] = await Promise.all([
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 500 }),
    loadMigrationCandidatesAction(),
    loadFileMigrationCandidatesAction(),
    loadLibraryMigrationCandidatesAction(),
    container.useCases.listAllEvents.execute(session.authContext, { limit: 200 }),
    loadRecentArchiveActivityAction(),
  ]);

  const activeItems = itemsPage.items.filter((item) => !item.deletedAt);
  const publishedItems = activeItems.filter((item) => item.publicacaoStatus === 'publicado');
  const draftItems = activeItems.filter((item) => item.publicacaoStatus !== 'publicado');
  const migrationPending =
    galleryCandidates.length + fileCandidates.length + libraryCandidates.length;
  const eventById = new Map(eventsPage.items.map((event) => [event.id, event]));
  const trackedItems = [...activeItems]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-8">
      <section className="border-border bg-surface rounded-2xl border p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
              Operação unificada
            </p>
            <h1 className="font-display mt-1 text-3xl font-semibold">Central do Acervo VL6</h1>
            <p className="text-muted mt-3 text-sm leading-6">
              Um único ponto para inserir, acompanhar, revisar, migrar e preservar a memória. O acontecimento
              é a origem histórica; notícias, mídias e documentos permanecem relacionados ao mesmo
              registro, sem duplicação de cadastro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/publicacoes/novo"
              className="bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              <FilePlus2 size={16} /> Registrar acontecimento
            </Link>
            <Link
              href="/admin/publicacoes"
              className="border-border hover:border-accent inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold"
            >
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Situação do Acervo">
        <Stat label="Memórias" value={activeItems.length} detail="Itens canônicos atualmente vinculados ao Acervo." />
        <Stat label="Publicadas" value={publishedItems.length} detail="Conteúdo disponível para a experiência dos Irmãos." />
        <Stat label="Em preparação" value={draftItems.length} detail="Registros ainda em revisão ou complementação." />
        <Stat label="Legado pendente" value={migrationPending} detail="Registros antigos que ainda precisam ser vinculados à fonte correta." />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">Acompanhamento</p>
            <h2 className="font-display text-2xl font-semibold">Memórias em gestão</h2>
            <p className="text-muted mt-1 text-sm">
              Abrir uma linha leva à Ficha Única do acontecimento, onde ficam edição, mídias, publicações, vínculos e exclusão segura.
            </p>
          </div>
          <Link href="/admin/publicacoes" className="text-muted hover:text-accent shrink-0 text-xs font-semibold">
            Ver lista completa
          </Link>
        </div>
        <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
          {trackedItems.map((item) => {
            const event = eventById.get(item.eventId);
            return (
              <Link
                key={item.id}
                href={`/admin/publicacoes/${item.eventId}`}
                className="hover:bg-primary/[0.025] flex items-center justify-between gap-4 p-4 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-display truncate font-semibold">{event?.titulo ?? item.titulo}</p>
                  <p className="text-muted mt-1 text-xs">
                    {event
                      ? `${new Intl.DateTimeFormat('pt-BR').format(event.dataInicio)} · ${event.local}`
                      : 'Acontecimento de origem não localizado'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.publicacaoStatus === 'publicado' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                    {item.publicacaoStatus === 'publicado' ? 'Publicado' : 'Em preparação'}
                  </span>
                  <ArrowRight className="text-muted" size={16} />
                </div>
              </Link>
            );
          })}
          {trackedItems.length === 0 && (
            <p className="text-muted p-5 text-sm">Nenhuma memória canônica foi criada ainda.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/admin/publicacoes"
          className="border-border bg-surface hover:border-accent group rounded-2xl border p-5 transition-colors"
        >
          <Archive className="text-accent" size={22} />
          <h2 className="font-display mt-4 text-lg font-semibold">Memórias por acontecimento</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Edite o fato histórico, suas publicações, pessoas, fotos, vídeos e documentos na Ficha Única.
          </p>
        </Link>
        <a
          href="#migracao"
          className="border-border bg-surface hover:border-accent group rounded-2xl border p-5 transition-colors"
        >
          <History className="text-accent" size={22} />
          <h2 className="font-display mt-4 text-lg font-semibold">Saneamento e migração</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Interligue Galeria e Arquivos antigos ao acontecimento correto, preservando proveniência e histórico.
          </p>
        </a>
        <Link
          href="/admin/acervo/lixeira"
          className="border-border bg-surface hover:border-accent group rounded-2xl border p-5 transition-colors"
        >
          <ShieldCheck className="text-accent" size={22} />
          <h2 className="font-display mt-4 text-lg font-semibold">Exclusão verificável</h2>
          <p className="text-muted mt-2 text-sm leading-6">
            Exclusões lógicas, restauração e conferência permanecem disponíveis sem apagar silenciosamente a memória.
          </p>
        </Link>
      </section>

      <section id="migracao" className="scroll-mt-28">
        <div className="mb-4">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">Transição controlada</p>
          <h2 className="font-display text-2xl font-semibold">Interligar registros antigos</h2>
          <p className="text-muted mt-2 max-w-3xl text-sm leading-6">
            O material legado não é escondido nem descartado. Ele é ligado ao acontecimento real e recebe um Item do Acervo canônico. Depois da migração, a experiência pública passa a usar somente o registro canônico, mantendo a origem disponível para auditoria.
          </p>
        </div>
        <MigrationManager
          galleryCandidates={galleryCandidates}
          fileCandidates={fileCandidates}
          libraryCandidates={libraryCandidates}
          events={eventsPage.items}
        />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">Rastreabilidade</p>
            <h2 className="font-display text-2xl font-semibold">Atividade recente</h2>
          </div>
          <Link href="/admin/configuracoes/auditoria" className="text-muted hover:text-accent text-xs font-semibold">
            Ver auditoria completa
          </Link>
        </div>
        <div className="border-border bg-surface divide-border divide-y rounded-2xl border">
          {activity.slice(0, 8).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 p-4">
              <Clock3 className="text-accent mt-0.5 shrink-0" size={16} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{entry.descricao}</p>
                <p className="text-muted mt-0.5 text-xs">
                  {entry.usuarioNome} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.timestamp))}
                </p>
              </div>
            </div>
          ))}
          {activity.length === 0 && (
            <p className="text-muted p-5 text-sm">Ainda não há atividade do Acervo registrada na auditoria.</p>
          )}
        </div>
      </section>
    </div>
  );
}

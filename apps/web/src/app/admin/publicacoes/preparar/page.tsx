import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessAdminHref } from '@/modules/admin/lib/admin-workspace';
import { PublicationEventPicker } from '@/modules/admin/components/publication-event-picker';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Preparar comunicação · VL6' };

export default async function PreparePublicationPage({ searchParams }: {
  searchParams: Promise<{ conteudo?: string }>;
}) {
  const { conteudo } = await searchParams;
  if (conteudo !== 'noticia' && conteudo !== 'aviso') notFound();
  const session = await requirePagePermission(conteudo === 'noticia' ? 'news:create' : 'announcement:create');
  const ctx = session.authContext;
  const canReadEvents = hasPermission(ctx, 'event:read');
  if (conteudo === 'noticia' && !canReadEvents) notFound();
  const canCreateEvent = canReadEvents && canAccessAdminHref('/admin/publicacoes/novo', ['event:create'], ctx, session.role);
  const canCreateStandalone = conteudo === 'aviso' && canAccessAdminHref('/admin/conteudo/avisos/novo', ['announcement:create'], ctx, session.role);
  const events: { id: string; title: string; date: string }[] = [];
  let failed = false;
  if (canReadEvents) {
    try {
      const container = createServerContainer();
      let cursor: string | undefined;
      do {
        const result = await container.useCases.listAllEvents.execute(ctx, { limit: 100, cursor });
        events.push(...result.items.map((event) => ({ id: event.id, title: event.titulo, date: event.dataInicio.toISOString() })));
        cursor = result.hasMore ? (result.nextCursor ?? undefined) : undefined;
      } while (cursor);
    } catch { failed = true; }
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin" className="inline-flex min-h-11 items-center underline">← Central de Controle</Link>
      <header>
        <h1 className="font-display text-3xl font-semibold">{conteudo === 'noticia' ? 'Preparar notícia' : 'Preparar aviso'}</h1>
        <p className="text-muted mt-2">Se a comunicação é sobre uma sessão ou evento, localize o acontecimento e use a mesma ficha. Confira os registros antes de cadastrar um novo.</p>
      </header>
      {canReadEvents ? <PublicationEventPicker events={events} content={conteudo} failed={failed} /> : <p>Este perfil pode preparar recados avulsos. O vínculo com acontecimentos requer permissão de leitura da Agenda.</p>}
      <div className="flex flex-wrap gap-3">
        {canCreateEvent && <Link href="/admin/publicacoes/novo" className="border-border inline-flex min-h-11 items-center rounded-xl border px-4 py-2">O acontecimento ainda não foi cadastrado</Link>}
        {canCreateStandalone && <Link href="/admin/conteudo/avisos/novo" className="border-border inline-flex min-h-11 items-center rounded-xl border px-4 py-2">Criar aviso avulso, sem acontecimento</Link>}
      </div>
    </div>
  );
}

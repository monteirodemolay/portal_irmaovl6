import { createServerContainer } from '@vl6/infra';
import { History, Images, Sparkles } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MemoryConstellation } from '@/modules/archive/components/memory-constellation';
import { loadConstellationMemories } from '@/modules/archive/lib/constellation-memories';

export default async function ArchiveConstellationPage() {
  const session = await requirePagePermission('archiveRelation:read');
  const container = createServerContainer();
  const initial = await loadConstellationMemories(
    session.authContext,
    session.role,
    container,
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Constelação VL6"
        description="Uma Central de Memória viva: escolha um período ou deixe a própria história da Verdadeira Luz nº 06 trazer lembranças, imagens, eventos e gestões até você."
        backHref="/acervo"
      />

      <section className="from-primary via-primary to-primary-dark relative overflow-hidden rounded-[22px] bg-gradient-to-br px-6 py-8 text-white shadow-md sm:px-8 lg:px-10">
        <div className="border-accent/15 pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border" />
        <div className="border-accent/10 pointer-events-none absolute -right-8 -top-12 h-72 w-72 rounded-full border" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-accent flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <Sparkles size={16} /> A memória da Loja em movimento
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Você escolhe o tempo. A Constelação encontra as lembranças.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              Sem montar trilhas ou listas. A experiência cruza automaticamente Eventos,
              Gestões, itens, fotografias e pessoas identificadas no Acervo VL6 para revelar
              momentos reais da história da Verdadeira Luz nº 06.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-[23rem]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <History className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">{initial.stats.totalYears}</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">anos</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <Sparkles className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">{initial.stats.totalMemories}</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">memórias</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <Images className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">{initial.stats.totalPhotos}</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">fotografias</span>
            </div>
          </div>
        </div>
      </section>

      <MemoryConstellation initial={initial} />
    </div>
  );
}

import { createServerContainer } from '@vl6/infra';
import { Compass, Link2, Sparkles, Star } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { InteractiveConstellationExplorer } from '@/modules/archive/components/interactive-constellation-explorer';

export default async function ArchiveConstellationPage() {
  const session = await requirePagePermission('archiveRelation:read');

  const container = createServerContainer();
  const { groups } = await container.useCases.getConstellationRoots.execute(session.authContext);
  const availableRecords = groups.reduce((total, group) => total + group.childCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Constelação VL6"
        description="Uma experiência interativa para descobrir como pessoas, gestões, acontecimentos e documentos formam a memória da Verdadeira Luz nº 06."
        backHref="/acervo"
      />

      <section className="from-primary via-primary to-primary-dark relative overflow-hidden rounded-[22px] bg-gradient-to-br px-6 py-8 text-white shadow-md sm:px-8 lg:px-10">
        <div className="border-accent/15 pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border" />
        <div className="border-accent/10 pointer-events-none absolute -right-8 -top-12 h-72 w-72 rounded-full border" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-accent flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
              <Sparkles size={16} /> A memória ganha sentido quando se conecta
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Cada ponto guarda uma história. Cada ligação revela um legado.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              Escolha uma trilha, abra seus ramos e encontre os registros que unem Irmãos,
              gestões, eventos, coleções e documentos da Loja. Nada aqui é apenas decorativo:
              cada ponto conduz a um conteúdo real do Acervo VL6.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:w-[23rem]">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <Star className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">{groups.length}</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">trilhas</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <Link2 className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">{availableRecords}</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">registros</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
              <Compass className="text-accent" size={17} />
              <strong className="mt-3 block text-xl">Livre</strong>
              <span className="text-[10px] uppercase tracking-wider text-white/55">exploração</span>
            </div>
          </div>
        </div>
      </section>

      <InteractiveConstellationExplorer roots={groups} />
    </div>
  );
}

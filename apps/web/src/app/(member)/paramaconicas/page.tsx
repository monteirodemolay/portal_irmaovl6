import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Handshake, Lock, ShieldCheck, Users } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { ParamasonicMemberCard } from '@/modules/family-legacy/components/paramasonic-member-card';

export default async function ParamasonicCommunityPage() {
  const session = await requireSession();

  if (!hasPermission(session.authContext, 'paramasonicCommunity:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Área Paramaçônica indisponível"
        description="Este conteúdo é restrito a pessoas previamente autorizadas pela Verdadeira Luz nº 06."
      />
    );
  }

  const container = createServerContainer();
  const members = await container.useCases.listParamasonicMemberDirectory.execute(
    session.authContext,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
      <header className="border-border from-primary-dark to-primary relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-white shadow-sm sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <span className="text-accent flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
            <Handshake size={16} />
            Família Maçônica
          </span>
          <h1 className="font-display mt-3 text-3xl font-semibold">Comunidade Paramaçônica VL6</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            Um espaço de aproximação entre a Verdadeira Luz nº 06 e as organizações irmãs, liberado
            de forma gradual e responsável pela Administração da Loja.
          </p>
        </div>
        <Handshake
          aria-hidden
          size={180}
          strokeWidth={0.8}
          className="absolute -bottom-12 -right-8 text-white/10"
        />
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="border-border bg-surface rounded-xl border p-4">
          <ShieldCheck className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Acesso protegido</h2>
          <p className="text-muted mt-1 text-sm">Cada conta recebe somente as áreas autorizadas.</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <Users className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Diretório institucional</h2>
          <p className="text-muted mt-1 text-sm">Conheça os Irmãos e suas atuações publicadas.</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <Handshake className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Integração gradual</h2>
          <p className="text-muted mt-1 text-sm">
            Novos conteúdos serão liberados conforme a necessidade.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <span className="text-accent text-xs font-semibold uppercase tracking-wide">
            Diretório
          </span>
          <h2 className="font-display text-2xl font-semibold">Irmãos da Verdadeira Luz nº 06</h2>
          <p className="text-muted mt-1 text-sm">
            São exibidos apenas dados institucionais e informações voluntariamente publicadas por
            cada Irmão. Informações maçônicas internas e contatos pessoais permanecem protegidos.
          </p>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Diretório ainda sem registros disponíveis"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <ParamasonicMemberCard key={member.memberId} member={member} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

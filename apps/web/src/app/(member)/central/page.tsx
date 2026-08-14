import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import {
  Briefcase,
  Building2,
  Card,
  CardContent,
  ChevronRight,
  EmptyState,
  Input,
  Search,
  Users,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

export default async function CentralPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePagePermission('memberDirectory:read');
  const { q } = await searchParams;

  const container = createServerContainer();
  const result = await container.useCases.searchDirectory.execute(session.authContext, {
    termo: q,
  });
  const items = result.ok ? result.value : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <Users size={22} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Central VL6</h1>
          <p className="text-muted text-sm">
            Diretório voluntário dos Irmãos da Loja — só quem publicou algo aparece aqui.
          </p>
        </div>
      </div>

      <form method="get" className="max-w-md">
        <div className="relative">
          <Search
            size={16}
            className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <Input
            type="search"
            name="q"
            placeholder="Buscar por nome, profissão, empresa ou área…"
            defaultValue={q ?? ''}
            className="pl-9"
          />
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={<Search size={22} strokeWidth={1.75} />}
          title={q ? 'Nenhum resultado encontrado' : 'Ninguém publicou um perfil ainda'}
          description={
            q
              ? 'Tente buscar por outro nome, profissão ou empresa.'
              : 'Assim que algum Irmão publicar informações na Central, elas aparecem aqui.'
          }
        />
      ) : (
        <>
          <p className="text-muted text-sm">
            {items.length} {items.length === 1 ? 'Irmão encontrado' : 'Irmãos encontrados'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((profile) => (
              <Link key={profile.memberId} href={`/central/${profile.memberId}`} className="group">
                <Card className="hover:border-primary h-full transition-colors hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          fotoUrl={profile.fotoUrl}
                          nome={profile.nomeCompleto}
                          className="h-12 w-12"
                        />
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="truncate font-medium">{profile.nomeCompleto}</p>
                          <MemberDegreeBadge grau={profile.grau} compact />
                        </div>
                      </div>
                      <ChevronRight
                        size={18}
                        className="text-muted group-hover:text-primary mt-1 shrink-0 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {profile.profissional?.areaAtuacao && (
                        <p className="text-muted flex items-center gap-1.5 text-sm">
                          <Briefcase size={14} className="shrink-0" />
                          <span className="truncate">{profile.profissional.areaAtuacao}</span>
                        </p>
                      )}
                      {profile.negocios && profile.negocios.length > 0 && (
                        <p className="text-muted flex items-center gap-1.5 text-sm">
                          <Building2 size={14} className="shrink-0" />
                          <span className="truncate">{profile.negocios[0]?.nomeEmpresa}</span>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, EmptyState, Input } from '@vl6/ui';
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
      <div>
        <h1 className="font-display text-2xl font-semibold">Central VL6</h1>
        <p className="text-muted text-sm">
          Diretório voluntário dos Irmãos da Loja — só quem publicou algo aparece aqui.
        </p>
      </div>

      <form method="get" className="max-w-md">
        <Input
          type="search"
          name="q"
          placeholder="Buscar por nome, profissão, empresa ou área…"
          defaultValue={q ?? ''}
        />
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={q ? 'Nenhum resultado encontrado' : 'Ninguém publicou um perfil ainda'}
          description={
            q
              ? undefined
              : 'Assim que algum Irmão publicar informações na Central, elas aparecem aqui.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((profile) => (
            <Link key={profile.memberId} href={`/central/${profile.memberId}`}>
              <Card className="hover:border-primary h-full transition-colors">
                <CardContent className="flex flex-col gap-3 p-5">
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
                  {profile.profissional?.areaAtuacao && (
                    <p className="text-muted text-sm">{profile.profissional.areaAtuacao}</p>
                  )}
                  {profile.negocios && profile.negocios.length > 0 && (
                    <p className="text-muted text-sm">{profile.negocios[0]?.nomeEmpresa}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

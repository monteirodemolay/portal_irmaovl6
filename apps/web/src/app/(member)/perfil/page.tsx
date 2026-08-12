import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { SelfProfileForm } from '@/modules/membership/components/self-profile-form';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

export default async function ProfilePage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);

  const container = createServerContainer();
  const [member, myCommittees] = await Promise.all([
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    container.useCases.listMyCommittees.execute(session.authContext),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Meu Perfil</h1>

      {member ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-6 p-6">
              <div className="flex items-center gap-4">
                <MemberAvatar
                  fotoUrl={member.fotoUrl}
                  nome={member.nomeCompleto}
                  className="h-16 w-16"
                />
                <div className="flex flex-col gap-1.5">
                  <p className="font-display text-xl font-semibold">{member.nomeCompleto}</p>
                  <p className="text-muted text-sm">{current?.tenant.nome}</p>
                  <MemberDegreeBadge grau={member.grau} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-2">
                <div>
                  <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Dados maçônicos
                  </h2>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Iniciação</dt>
                      <dd>{formatDate(member.dataIniciacao)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Elevação</dt>
                      <dd>{formatDate(member.dataElevacao)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Exaltação</dt>
                      <dd>{formatDate(member.dataExaltacao)}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Dados de acesso
                  </h2>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">E-mail</dt>
                      <dd className="truncate">{member.email}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <SelfProfileForm member={member} />
        </>
      ) : (
        <Card className="max-w-md">
          <CardContent className="text-muted p-6 text-sm">
            Sua conta ainda não está vinculada a um cadastro de Irmão. Fale com a Secretaria da Loja
            para vincular seu usuário ao seu registro.
          </CardContent>
        </Card>
      )}

      {myCommittees.length > 0 && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Minhas Comissões</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {myCommittees.map((committee) => (
              <Badge key={committee.id} variant="accent">
                {committee.nome}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function DashboardPage() {
  const [session, current] = await Promise.all([getCurrentSession(), getCurrentTenant()]);
  if (!session || !current) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Olá, {session.user.email}</h1>
        <p className="text-muted">{current.tenant.nome}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          <CardDescription>Dados vindos da sessão autenticada e do Firestore.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="border-border flex justify-between border-b py-2">
            <span className="text-muted">Papel</span>
            <Badge variant="accent">{session.role?.nome ?? 'sem papel'}</Badge>
          </div>
          <div className="border-border flex justify-between border-b py-2">
            <span className="text-muted">Status da conta</span>
            <span>{session.user.statusConta}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted">Permissões</span>
            <span className="max-w-xs text-right font-mono text-xs">
              {session.authContext.permissions.join(', ') || '—'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

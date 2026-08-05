import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export default async function AdminDashboardPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Painel Administrativo</h1>
        <p className="text-muted">{current?.tenant.nome}</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Sessão atual</CardTitle>
          <CardDescription>{session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-muted text-sm">
          Use o menu à esquerda para gerenciar Irmãos, Gestões, Usuários e Conteúdo.
        </CardContent>
      </Card>
    </div>
  );
}

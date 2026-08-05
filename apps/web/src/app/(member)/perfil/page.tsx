import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { SelfProfileForm } from '@/modules/membership/components/self-profile-form';

export default async function ProfilePage() {
  const session = await requireSession();

  const container = createServerContainer();
  const [member, myCommittees] = await Promise.all([
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    container.useCases.listMyCommittees.execute(session.authContext),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Meu Perfil</h1>
      {member ? (
        <SelfProfileForm member={member} />
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

import { createServerContainer } from '@vl6/infra';
import { Card, CardContent } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { SelfProfileForm } from '@/modules/membership/components/self-profile-form';

export default async function ProfilePage() {
  const session = await requireSession();

  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );

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
    </div>
  );
}

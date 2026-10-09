import { redirect } from 'next/navigation';
import { Card, CardContent } from '@vl6/ui';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import type { EditTab } from '@/modules/central/components/profile-shared';

const EDIT_SECTIONS: readonly EditTab[] = [
  'geral',
  'pessoal',
  'profissional',
  'empresa',
  'afiliacoes',
  'contatos',
  'redes',
];

export default async function MeuEspacoRedirect({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; tab?: string }>;
}) {
  const session = await requireSession();
  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );

  if (!member) {
    return (
      <Card className="max-w-md">
        <CardContent className="text-muted p-6 text-sm">
          Sua conta ainda não está vinculada a um cadastro de Irmão. Fale com a Secretaria da Loja
          para vincular seu usuário ao seu registro.
        </CardContent>
      </Card>
    );
  }

  const params = await searchParams;
  const requested = params.editar ?? params.tab;
  const section = EDIT_SECTIONS.includes(requested as EditTab) ? (requested as EditTab) : null;

  if (section) {
    redirect(`/irmaos/${member.id}?editar=${section}#editor-${section}`);
  }

  redirect(`/irmaos/${member.id}`);
}

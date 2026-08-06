import Link from 'next/link';
import { Button } from '@vl6/ui';

export default function PlatformDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-xl font-semibold">Lojas</h1>
      <p className="text-muted text-sm">
        Listagem e gestão cross-tenant (billing, monitoramento, suporte) chegam no painel completo
        do Administrador Geral. Por enquanto, o onboarding de novas Lojas já está disponível.
      </p>
      <Button asChild className="w-fit">
        <Link href="/plataforma/lojas/nova">Criar nova Loja</Link>
      </Button>
    </div>
  );
}

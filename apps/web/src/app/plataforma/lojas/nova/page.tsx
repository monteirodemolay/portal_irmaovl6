import { OnboardTenantForm } from '@/modules/tenancy/components/onboard-tenant-form';

export default function NewTenantPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Nova Loja</h1>
        <p className="text-muted text-sm">
          Cria a Loja, a marca/configurações padrão, os papéis de fábrica e a primeira conta de
          Administrador — tudo em um passo.
        </p>
      </div>
      <OnboardTenantForm />
    </div>
  );
}

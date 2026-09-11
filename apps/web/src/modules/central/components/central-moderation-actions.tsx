'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from '@vl6/ui';
import {
  migrateMemberEmpresaToNegociosAction,
  reactivateCentralProfileAction,
  suspendCentralProfileAction,
  type MigrateMemberEmpresaToNegociosRowResult,
} from '../actions/central-actions';

export function SuspendCentralProfileButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState('');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Suspender
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender publicação de {memberName}?</DialogTitle>
          <DialogDescription>
            A exibição do perfil na Central é congelada — a configuração do Irmão fica preservada e
            volta como estava ao reativar. Isso não é uma retirada voluntária, é uma moderação
            administrativa.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivo da suspensão (obrigatório)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending || !motivo.trim()}
            onClick={() => startTransition(() => suspendCentralProfileAction(memberId, motivo))}
          >
            {isPending ? 'Suspendendo…' : 'Confirmar suspensão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACAO_LABELS: Record<MigrateMemberEmpresaToNegociosRowResult['acao'], string> = {
  criado: 'Migrado',
  ja_existia_negocio_com_mesmo_nome: 'Já existia',
  sem_empresa_preenchida: 'Sem empresa',
};

/**
 * Migração única do antigo "Empresa atual" (`Member.empresa`) pra "Empresas
 * e negócios" — passo manual pós-merge desta feature. Idempotente: pode
 * clicar mais de uma vez sem duplicar (ver `MigrateMemberEmpresaToNegociosUseCase`).
 */
export function MigrateEmpresaButton() {
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<MigrateMemberEmpresaToNegociosRowResult[] | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setReport(await migrateMemberEmpresaToNegociosAction());
          })
        }
      >
        {isPending ? 'Migrando…' : "Migrar 'Empresa atual' para Negócios"}
      </Button>
      {report && (
        <div className="border-border bg-surface max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-border sticky top-0 border-b bg-inherit text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Irmão</th>
                <th className="px-3 py-2 font-medium">Empresa</th>
                <th className="px-3 py-2 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {report.map((row) => (
                <tr key={row.memberId} className="border-border border-b last:border-0">
                  <td className="px-3 py-2">{row.nomeCompleto}</td>
                  <td className="text-muted px-3 py-2">{row.empresaMigrada ?? '—'}</td>
                  <td className="px-3 py-2">{ACAO_LABELS[row.acao]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ReactivateCentralProfileButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => reactivateCentralProfileAction(memberId))}
    >
      {isPending ? 'Reativando…' : 'Reativar'}
    </Button>
  );
}

'use client';

import { useState, useTransition } from 'react';
import type { ActiveMembersReconciliationResultRow } from '@vl6/domain';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@vl6/ui';
import { applyActiveMembersReconciliationAction } from '../actions/reconciliation-actions';

const CONFIRM_PHRASE = 'DESATIVAR';

/**
 * Botão "Aplicar" da reconciliação de cadastro ativo — bloqueia acesso ao
 * Portal e/ou muda a Situação de todo Irmão fora da lista de ativos (ver
 * `ApplyActiveMembersReconciliationUseCase`). Ação em massa afetando acesso
 * de pessoas reais: exige digitar uma palavra de confirmação antes de
 * liberar o botão, mesmo padrão de segurança extra usado em ações
 * destrutivas em lote noutros pontos do Portal.
 */
export function ApplyReconciliationButton({ affectedCount }: { affectedCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [confirmText, setConfirmText] = useState('');
  const [results, setResults] = useState<ActiveMembersReconciliationResultRow[] | null>(null);

  function handleApply() {
    startTransition(async () => {
      const outcome = await applyActiveMembersReconciliationAction();
      setResults(outcome);
    });
  }

  if (results) {
    return (
      <div className="border-border bg-background rounded-lg border p-4 text-sm">
        <p className="font-semibold">
          {results.length} Irmão(s) alterado(s). Recarregue a página pra ver o estado atualizado.
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-xs">
          {results.map((row) => (
            <li key={row.memberId} className="text-muted">
              {row.nomeCompleto}
              {row.situacaoAlterada && ' · Situação alterada pra Desligado'}
              {row.acessoBloqueado && ' · acesso ao Portal bloqueado'}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Aplicar reconciliação</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar {affectedCount} Irmão(s)?</DialogTitle>
          <DialogDescription>
            Quem está fora da lista de ativos vai ter o acesso ao Portal bloqueado agora — quem
            estava com Situação "Ativo" também vira "Desligado" (motivo "Outro", pra o senhor
            confirmar depois). Ninguém é excluído: o cadastro continua existindo e pode ser
            corrigido a qualquer momento em "Situação Maçônica".
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm-reconciliation">
            Digite <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> pra confirmar
          </Label>
          <Input
            id="confirm-reconciliation"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending || confirmText !== CONFIRM_PHRASE}
            onClick={handleApply}
          >
            {isPending ? 'Aplicando…' : 'Confirmar e aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button, Input } from '@vl6/ui';
import { firebaseAuth } from '@/lib/firebase/client';
import { deleteMyAccountAction } from '../actions/delete-my-account-action';

/**
 * "Excluir minha conta de acesso" (LGPD, docs/architecture) — mostra as
 * duas listas exigidas pelo escopo (o que é excluído vs. o que permanece
 * como registro institucional) antes de qualquer ação destrutiva.
 * Reautenticação recente: reenvia a senha pro próprio Firebase Auth logo
 * antes de chamar a Server Action — nunca chama a exclusão sem confirmar
 * a senha primeiro.
 *
 * Implementação técnica — não substitui revisão jurídica da LGPD.
 */
export function DeleteAccountSection({ email }: { email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch {
      setError('Senha incorreta. Tente novamente.');
      setIsSubmitting(false);
      return;
    }

    const result = await deleteMyAccountAction();
    if (!result.ok) {
      setError(result.error ?? 'Não foi possível excluir sua conta.');
      setIsSubmitting(false);
      return;
    }

    await firebaseAuth.signOut();
    router.replace('/login');
  }

  return (
    <div className="border-border rounded-lg border p-5">
      <h2 className="font-display text-lg font-semibold">Excluir minha conta de acesso</h2>
      <p className="text-muted mt-1 text-sm">
        Você perde o acesso ao Portal imediatamente. Seu registro maçônico não é apagado.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            Serão excluídos ou anonimizados
          </p>
          <ul className="mt-1.5 list-inside list-disc text-xs text-red-900">
            <li>Login (Firebase Auth) e sessões ativas</li>
            <li>Documento da conta de acesso</li>
            <li>Preferências de comunicação</li>
            <li>Notificações pessoais</li>
            <li>Compromissos, tarefas e anotações pessoais</li>
            <li>Favoritos da Biblioteca</li>
            <li>Integração com Google Agenda</li>
          </ul>
        </div>
        <div className="border-border bg-background rounded-lg border p-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            Permanecem como registro institucional
          </p>
          <ul className="text-muted mt-1.5 list-inside list-disc text-xs">
            <li>Cadastro maçônico (CIM, graus, cargos, datas)</li>
            <li>Histórico institucional e auditorias</li>
          </ul>
        </div>
      </div>

      {!confirming ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="mt-4"
          onClick={() => setConfirming(true)}
        >
          Solicitar exclusão
        </Button>
      ) : (
        <div className="border-border mt-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/40 p-4">
          <p className="text-sm font-medium">Confirme sua senha para continuar:</p>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha atual"
          />
          <label className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            Entendo que essa ação é imediata e não pode ser desfeita.
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!password || !acknowledged || isSubmitting}
              onClick={handleConfirm}
            >
              {isSubmitting ? 'Excluindo…' : 'Excluir definitivamente'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                setConfirming(false);
                setPassword('');
                setError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

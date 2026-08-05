'use client';

import { useEffect, useState } from 'react';
import {
  multiFactor,
  onAuthStateChanged,
  TotpMultiFactorGenerator,
  type MultiFactorInfo,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import { Badge, Button, Input } from '@vl6/ui';
import { firebaseAuth } from '@/lib/firebase/client';

/**
 * MFA (TOTP) via Firebase Auth Multi-Factor — requer Identity Platform
 * habilitado no projeto Firebase (não vem ativado no Firebase Auth padrão;
 * decisão de infraestrutura fora do código, ver docs/architecture/07). Sem
 * essa habilitação, `getSession()`/`generateSecret()` falham com um erro do
 * próprio SDK — as mensagens abaixo cobrem o caso mais comum (login não
 * recente), mas qualquer outra falha do SDK também cai no mesmo aviso.
 *
 * `enroll()` exige login recente; em vez de um fluxo de reautenticação
 * dedicado, pedimos para o usuário sair e entrar de novo quando isso falha.
 */
export function MfaEnrollmentPanel() {
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => onAuthStateChanged(firebaseAuth, setUser), []);

  if (!user) {
    return <p className="text-muted text-sm">Carregando…</p>;
  }

  const factors: MultiFactorInfo[] = multiFactor(user).enrolledFactors;

  async function startEnrollment() {
    if (!user) return;
    setError(null);
    setIsPending(true);
    try {
      const session = await multiFactor(user).getSession();
      const generatedSecret = await TotpMultiFactorGenerator.generateSecret(session);
      setSecret(generatedSecret);
    } catch {
      setError(
        'Não foi possível iniciar o cadastro do MFA. Saia e entre novamente antes de tentar de novo.',
      );
    } finally {
      setIsPending(false);
    }
  }

  async function confirmEnrollment() {
    if (!user || !secret) return;
    setError(null);
    setIsPending(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, 'Aplicativo autenticador');
      setSecret(null);
      setCode('');
      setUser(firebaseAuth.currentUser);
    } catch {
      setError('Código inválido. Confira o app autenticador e tente novamente.');
    } finally {
      setIsPending(false);
    }
  }

  async function unenroll(factorUid: string) {
    if (!user) return;
    setError(null);
    setIsPending(true);
    try {
      await multiFactor(user).unenroll(factorUid);
      setUser(firebaseAuth.currentUser);
    } catch {
      setError('Não foi possível desativar o MFA. Tente novamente.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {factors.length > 0 && (
        <div className="flex flex-col gap-2">
          {factors.map((factor) => (
            <div key={factor.uid} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="success">Ativo</Badge>
                <span>{factor.displayName ?? 'Aplicativo autenticador'}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => unenroll(factor.uid)}
              >
                Desativar
              </Button>
            </div>
          ))}
        </div>
      )}

      {factors.length === 0 && !secret && (
        <Button
          type="button"
          size="sm"
          className="w-fit"
          disabled={isPending}
          onClick={startEnrollment}
        >
          {isPending ? 'Preparando…' : 'Ativar verificação em duas etapas'}
        </Button>
      )}

      {secret && (
        <div className="border-border flex flex-col gap-3 rounded border p-4">
          <p className="text-sm">
            No seu app autenticador (Google Authenticator, Authy, 1Password…), escolha{' '}
            <strong>inserir chave manualmente</strong> e cole o código abaixo:
          </p>
          <code className="bg-background break-all rounded p-2 text-xs">{secret.secretKey}</code>
          <p className="text-sm">Depois, digite o código de 6 dígitos gerado pelo app:</p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            className="max-w-32"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending || code.length !== 6}
              onClick={confirmEnrollment}
            >
              {isPending ? 'Confirmando…' : 'Confirmar'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                setSecret(null);
                setCode('');
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

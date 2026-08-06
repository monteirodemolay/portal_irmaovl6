'use client';

import { useState, type FormEvent } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { firebaseAuth } from '@/lib/firebase/client';

/**
 * Troca de senha self-service. Exige reautenticação (senha atual) antes de
 * `updatePassword`, já que o SDK do Firebase recusa a operação se a sessão
 * não for "recente" — reautenticar aqui evita depender do usuário sair e
 * entrar de novo (ver o mesmo problema em MfaEnrollmentPanel).
 */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const user = firebaseAuth.currentUser;
    if (!user?.email) {
      setError('Sessão inválida. Saia e entre novamente.');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }

    setIsPending(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'auth/invalid-credential'
      ) {
        setError('Senha atual incorreta.');
      } else {
        setError('Não foi possível trocar a senha. Tente novamente.');
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <FormField label="Senha atual" htmlFor="currentPassword">
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Nova senha" htmlFor="newPassword">
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Confirmar nova senha" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Senha alterada com sucesso.</p>}
      <Button type="submit" disabled={isPending} size="sm" className="w-fit">
        {isPending ? 'Trocando…' : 'Trocar senha'}
      </Button>
    </form>
  );
}

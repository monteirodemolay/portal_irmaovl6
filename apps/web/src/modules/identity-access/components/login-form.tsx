'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  getMultiFactorResolver,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
  type UserCredential,
} from 'firebase/auth';
import { loginSchema, type LoginInput } from '@vl6/shared';
import { Button, Eye, EyeOff, Input, Lock, Mail } from '@vl6/ui';
import { firebaseAuth } from '@/lib/firebase/client';
import { useDictionary } from '@/lib/i18n/dictionary-context';

type FieldIcon = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** Input com ícone à esquerda — envolve o `Input` do design system sem alterar seu contrato público. */
function IconField({
  icon: Icon,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon: FieldIcon }) {
  return (
    <div className="relative">
      <Icon
        size={18}
        strokeWidth={1.7}
        className="text-muted pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
      />
      <Input className={`h-12 pl-11 ${className ?? ''}`} {...props} />
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-foreground mb-2 block text-xs font-bold">
      {children}
    </label>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dictionary = useDictionary();
  const [serverError, setServerError] = useState<string | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  // Só alterna a visibilidade do valor já digitado (type do input) — não
  // afeta validação, submissão nem nenhuma outra regra de autenticação.
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmitForgotPassword() {
    setIsSendingReset(true);
    setResetFeedback(null);
    try {
      await sendPasswordResetEmail(firebaseAuth, forgotPasswordEmail);
      setResetFeedback({ ok: true, message: dictionary.login.forgotPasswordSuccess });
    } catch {
      setResetFeedback({ ok: false, message: dictionary.login.forgotPasswordError });
    } finally {
      setIsSendingReset(false);
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function finishLogin(credential: UserCredential) {
    const idToken = await credential.user.getIdToken();

    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setServerError(body.message ?? dictionary.login.errorGeneric);
      return;
    }

    const body = (await response.json()) as { redirectTo: string };
    router.replace(searchParams.get('redirect') ?? body.redirectTo);
    router.refresh();
  }

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        values.email,
        values.password,
      );
      await finishLogin(credential);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'auth/multi-factor-auth-required'
      ) {
        setMfaResolver(getMultiFactorResolver(firebaseAuth, error as MultiFactorError));
        return;
      }
      setServerError(dictionary.login.errorInvalidCredentials);
    }
  }

  async function onSubmitMfa() {
    if (!mfaResolver) return;
    const hint = mfaResolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) {
      setServerError(dictionary.login.errorNoTotpFactor);
      return;
    }

    setIsVerifyingMfa(true);
    setServerError(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, mfaCode);
      const credential = await mfaResolver.resolveSignIn(assertion);
      await finishLogin(credential);
    } catch {
      setServerError(dictionary.login.errorInvalidMfaCode);
    } finally {
      setIsVerifyingMfa(false);
    }
  }

  if (showForgotPassword) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div>
          <FieldLabel htmlFor="forgotPasswordEmail">{dictionary.login.email}</FieldLabel>
          <IconField
            icon={Mail}
            id="forgotPasswordEmail"
            type="email"
            autoComplete="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
          />
        </div>
        {resetFeedback && (
          <p className={`text-sm ${resetFeedback.ok ? 'text-muted' : 'text-red-600'}`}>
            {resetFeedback.message}
          </p>
        )}
        <Button
          type="button"
          className="h-12 w-full text-sm font-bold"
          disabled={isSendingReset || !forgotPasswordEmail}
          onClick={onSubmitForgotPassword}
        >
          {isSendingReset
            ? dictionary.login.forgotPasswordSubmitting
            : dictionary.login.forgotPasswordSubmit}
        </Button>
        <button
          type="button"
          onClick={() => {
            setShowForgotPassword(false);
            setResetFeedback(null);
          }}
          className="text-muted hover:text-foreground text-center text-sm underline"
        >
          {dictionary.login.backToLogin}
        </button>
      </div>
    );
  }

  if (mfaResolver) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div>
          <FieldLabel htmlFor="mfaCode">{dictionary.login.mfaCodeLabel}</FieldLabel>
          <Input
            id="mfaCode"
            className="h-12 text-center text-lg tracking-[0.4em]"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />
        </div>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button
          type="button"
          className="h-12 w-full text-sm font-bold"
          disabled={isVerifyingMfa || mfaCode.length !== 6}
          onClick={onSubmitMfa}
        >
          {isVerifyingMfa ? dictionary.login.mfaVerifying : dictionary.login.mfaConfirm}
        </Button>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-5">
      {searchParams.get('reivindicado') && (
        <p className="border-accent/30 bg-accent/10 text-accent rounded-lg border p-3 text-sm">
          Acesso criado! Entre com o e-mail e a senha que você acabou de definir.
        </p>
      )}
      <div>
        <FieldLabel htmlFor="email">{dictionary.login.email}</FieldLabel>
        <IconField
          icon={Mail}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          {...register('email')}
        />
        {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <FieldLabel htmlFor="password">{dictionary.login.password}</FieldLabel>
        <div className="relative">
          <IconField
            icon={Lock}
            className="pr-11"
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            className="text-muted hover:bg-background hover:text-foreground absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
          >
            {showPassword ? (
              <EyeOff size={18} strokeWidth={1.7} />
            ) : (
              <Eye size={18} strokeWidth={1.7} />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="-mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-accent hover:text-foreground text-xs font-semibold underline underline-offset-2"
        >
          {dictionary.login.forgotPasswordLink}
        </button>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting}
        className="h-[54px] w-full text-sm font-bold tracking-wide shadow-md"
      >
        {isSubmitting ? dictionary.login.submitting : dictionary.login.submit}
      </Button>
    </form>
  );
}

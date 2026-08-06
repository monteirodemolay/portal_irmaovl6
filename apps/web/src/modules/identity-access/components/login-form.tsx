'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  getMultiFactorResolver,
  signInWithEmailAndPassword,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
  type UserCredential,
} from 'firebase/auth';
import { loginSchema, type LoginInput } from '@vl6/shared';
import { Button, Input } from '@vl6/ui';
import { firebaseAuth } from '@/lib/firebase/client';
import { useDictionary } from '@/lib/i18n/dictionary-context';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dictionary = useDictionary();
  const [serverError, setServerError] = useState<string | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);

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

    router.replace(searchParams.get('redirect') ?? '/dashboard');
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

  if (mfaResolver) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mfaCode" className="text-sm font-medium">
            {dictionary.login.mfaCodeLabel}
          </label>
          <Input
            id="mfaCode"
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
          disabled={isVerifyingMfa || mfaCode.length !== 6}
          onClick={onSubmitMfa}
        >
          {isVerifyingMfa ? dictionary.login.mfaVerifying : dictionary.login.mfaConfirm}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {dictionary.login.email}
        </label>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {dictionary.login.password}
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? dictionary.login.submitting : dictionary.login.submit}
      </Button>
    </form>
  );
}

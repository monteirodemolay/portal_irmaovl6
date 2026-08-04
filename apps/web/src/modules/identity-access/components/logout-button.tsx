'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Button } from '@vl6/ui';
import { firebaseAuth } from '@/lib/firebase/client';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    await signOut(firebaseAuth);
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout}>
      Sair
    </Button>
  );
}

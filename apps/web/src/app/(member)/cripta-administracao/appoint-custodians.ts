'use server';

import { revalidatePath } from 'next/cache';
import { getAdminFirestore, createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';

export async function appointCustodians(formData: FormData) {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) throw new Error('Acesso negado.');
  const masterId = String(formData.get('masterId') ?? '');
  const secondId = String(formData.get('secondId') ?? '');
  const minutes = String(formData.get('minutes') ?? '').trim();
  if (!masterId || !secondId || masterId === secondId || minutes.length < 5 || minutes.length > 160) {
    throw new Error('Indique dois irmãos distintos e a referência da ata.');
  }
  const container = createServerContainer();
  const [master, second] = await Promise.all([
    container.repositories.member.findById(masterId),
    container.repositories.member.findById(secondId),
  ]);
  if ([master, second].some((member) => !member || member.tenantId !== session.authContext.tenantId || member.situacao !== 'ativo' || !member.userId)) {
    throw new Error('Os dois responsáveis precisam ser irmãos Ativos com acesso ao Portal.');
  }
  const db = getAdminFirestore();
  const ref = db.collection('criptaGovernanceV1').doc(session.authContext.tenantId);
  const audit = ref.collection('events').doc();
  const now = new Date().toISOString();
  const batch = db.batch();
  batch.set(ref, { masterId, secondId, minutes, updatedAt: now, updatedBy: session.user.id });
  batch.create(audit, { type: 'custodians-appointed', masterId, secondId, minutes, at: now, actorId: session.user.id });
  await batch.commit();
  revalidatePath('/cripta-administracao');
}

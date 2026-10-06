'use server';

import { withCriptaOperation } from '@/modules/cripta/lib/reset-control';
import { revalidatePath } from 'next/cache';
import { getAdminFirestore, createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';

export async function appointCustodians(formData: FormData) {
  const session = await requirePagePermission('tenant:manage');
  return withCriptaOperation(session.authContext.tenantId, async () => {
    const commissionMemberIds = [1, 2, 3]
      .map((number) => String(formData.get(`guardian${number}Id`) ?? ''))
      .filter(Boolean);
    const nextOpeningDate = String(formData.get('nextOpeningDate') ?? '');
    const minutes = String(formData.get('minutes') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim();
    if (
      !commissionMemberIds.length ||
      !/^\d{4}-\d{2}-\d{2}$/.test(nextOpeningDate) ||
      Number.isNaN(Date.parse(`${nextOpeningDate}T12:00:00Z`)) ||
      minutes.length < 5 ||
      minutes.length > 160 ||
      reason.length < 8 ||
      reason.length > 300
    ) {
      throw new Error('Indique a Comissão, a próxima data, a ata e o motivo da designação.');
    }
    const master = await currentCriptaMaster(session.authContext.tenantId);
    if (!master)
      throw new Error(
        'Cadastre o Venerável Mestre na gestão vigente e vincule sua conta antes desta indicação.',
      );
    const masterId = master.member.id;
    if (
      commissionMemberIds.includes(masterId) ||
      new Set(commissionMemberIds).size !== commissionMemberIds.length
    ) {
      throw new Error('Escolha integrantes diferentes entre si e do Venerável Mestre.');
    }
    const container = createServerContainer();
    const members = await Promise.all(
      commissionMemberIds.map((id) => container.repositories.member.findById(id)),
    );
    if (
      members.some(
        (member) =>
          !member ||
          member.tenantId !== session.authContext.tenantId ||
          member.situacao !== 'ativo' ||
          !member.userId,
      )
    ) {
      throw new Error('Os indicados precisam ser irmãos Ativos com acesso ao Portal.');
    }
    const db = getAdminFirestore();
    const ref = db.collection('criptaGovernanceV1').doc(session.authContext.tenantId);
    const audit = ref.collection('events').doc();
    const now = new Date().toISOString();
    await db.runTransaction(async (transaction) => {
      const previous = (await transaction.get(ref)).data();
      const designation = {
        masterOffice: 'veneravel_mestre',
        masterAtDesignationId: masterId,
        masterTermId: master.termId,
        commissionMemberIds,
        nextOpeningDate,
        minutes,
        reason,
        designatedAt: now,
        designatedBy: session.user.id,
      };
      transaction.set(ref, {
        ...designation,
        masterId,
        updatedAt: now,
        updatedBy: session.user.id,
      });
      transaction.create(audit, {
        type: previous ? 'commission-updated' : 'commission-appointed',
        previous: previous
          ? {
              masterId: previous.masterAtDesignationId ?? previous.masterId ?? null,
              commissionMemberIds: previous.commissionMemberIds ?? [],
              nextOpeningDate: previous.nextOpeningDate ?? null,
            }
          : null,
        ...designation,
        at: now,
        actorId: session.user.id,
      });
    });
    revalidatePath('/cripta-administracao');
    revalidatePath('/cripta-projetor');
  });
}

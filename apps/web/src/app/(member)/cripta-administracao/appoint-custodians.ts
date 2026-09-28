'use server';

import { revalidatePath } from 'next/cache';
import { getAdminFirestore, createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';

export async function appointCustodians(formData: FormData) {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) throw new Error('Acesso negado.');
  const openingSecondId = String(formData.get('openingSecondId') ?? '');
  const closingSecondId = String(formData.get('closingSecondId') ?? '');
  const alternateIds = [String(formData.get('alternate1Id') ?? ''), String(formData.get('alternate2Id') ?? '')].filter(Boolean);
  const minutes = String(formData.get('minutes') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!openingSecondId || !closingSecondId || minutes.length < 5 || minutes.length > 160 || reason.length < 8 || reason.length > 300) {
    throw new Error('Indique os responsáveis, a ata e o motivo da designação ou substituição.');
  }
  const master = await currentCriptaMaster(session.authContext.tenantId);
  if (!master) throw new Error('Cadastre o Venerável Mestre na gestão vigente e vincule sua conta antes desta indicação.');
  const masterId = master.member.id;
  if ([openingSecondId, closingSecondId, ...alternateIds].includes(masterId) ||
      alternateIds.some((id) => [openingSecondId, closingSecondId].includes(id)) || new Set(alternateIds).size !== alternateIds.length) {
    throw new Error('O substituto deve ser diferente do Venerável e dos segundos responsáveis.');
  }
  const container = createServerContainer();
  const selected = [...new Set([openingSecondId, closingSecondId, ...alternateIds])];
  const members = await Promise.all(selected.map((id) => container.repositories.member.findById(id)));
  if (members.some((member) => !member || member.tenantId !== session.authContext.tenantId || member.situacao !== 'ativo' || !member.userId)) {
    throw new Error('Os indicados precisam ser irmãos Ativos com acesso ao Portal.');
  }
  const db = getAdminFirestore();
  const ref = db.collection('criptaGovernanceV1').doc(session.authContext.tenantId);
  const audit = ref.collection('events').doc();
  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const previous = (await transaction.get(ref)).data();
    const designation = { masterOffice: 'veneravel_mestre', masterAtDesignationId: masterId,
      masterTermId: master.termId, openingSecondId, closingSecondId, alternateIds,
      minutes, reason, designatedAt: now, designatedBy: session.user.id };
    transaction.set(ref, { ...designation, masterId, secondId: openingSecondId, updatedAt: now,
      updatedBy: session.user.id }, { merge: true });
    transaction.create(audit, { type: previous ? 'custodians-replaced' : 'custodians-appointed',
      previous: previous ? { masterId: previous.masterId ?? null, openingSecondId: previous.openingSecondId ?? previous.secondId ?? null,
        closingSecondId: previous.closingSecondId ?? null, alternateIds: previous.alternateIds ?? [] } : null,
      ...designation, at: now, actorId: session.user.id });
  });
  revalidatePath('/cripta-administracao');
}

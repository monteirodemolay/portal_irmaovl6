import { validGuardianDigests } from '@/modules/cripta/lib/guardian-file-check';
import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { webcrypto } from 'node:crypto';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { criptaCryptoRef, readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import { initialGuardianShares } from '@/modules/cripta/lib/guardian-shares';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { sealRef } from '@/modules/cripta/lib/seal-state';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';
import type { CriptaPublicKey } from '@/modules/cripta/lib/cripta-key';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store, private' };
const BASE64URL = /^[A-Za-z0-9_-]{40,48}$/;
const CODE_PATTERN = /^LAC-[A-Z0-9-]{5,48}$|^VL6-[A-Z0-9-]{8,48}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function isPublicKey(value: unknown): value is CriptaPublicKey {
  if (!value || typeof value !== 'object') return false;
  const key = value as Record<string, unknown>;
  return (
    Object.keys(key).sort().join(',') === 'crv,kty,x,y' &&
    key.kty === 'EC' &&
    key.crv === 'P-256' &&
    typeof key.x === 'string' &&
    BASE64URL.test(key.x) &&
    typeof key.y === 'string' &&
    BASE64URL.test(key.y)
  );
}

/** Records, online, the Renovação that was computed entirely offline (scripts/cripta/abertura-
 * offline, step 4) — this route never sees a private key or a Shamir share, only the new PUBLIC
 * key and the new .lacre's header fields, uploaded from the offline tool's
 * `renovacao-resultado-*.json`. A Renovação is only legitimate while the writing window is
 * closed (no new letters arriving under the key being retired mid-process) — see
 * docs/architecture/cripta-reabertura-ficha-e-cerimonia.md §10. */
export const POST = criptaRoute(async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const tenantId = session.authContext.tenantId;

  const current = await readCriptaPublicKey(tenantId);
  if (!current)
    return NextResponse.json({ error: 'A Cripta ainda não foi inaugurada.' }, { status: 409 });
  if (await isOnlineOpen(tenantId))
    return NextResponse.json(
      { error: 'Feche o recebimento de cartas antes de registrar uma Renovação.' },
      { status: 409 },
    );

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const guardianMemberIds = Array.isArray(body?.guardianMemberIds)
    ? (body!.guardianMemberIds as unknown[])
    : [];
  const minutes = typeof body?.minutes === 'string' ? body.minutes.trim() : '';
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
  const newCode = typeof body?.newCode === 'string' ? body.newCode.trim().toUpperCase() : '';
  const newInventoryDigest =
    typeof body?.newInventoryDigest === 'string' ? body.newInventoryDigest : '';
  const newLetters = body?.newLetters;
  const newDrafts = body?.newDrafts;

  if (
    !isPublicKey(body?.newPublicKey) ||
    (body?.guardianShareDigests !== undefined &&
      !validGuardianDigests(body.guardianShareDigests, current.totalGuardians)) ||
    guardianMemberIds.length !== current.totalGuardians ||
    !guardianMemberIds.every((id): id is string => typeof id === 'string' && id.length > 0) ||
    new Set(guardianMemberIds).size !== guardianMemberIds.length ||
    minutes.length < 5 ||
    minutes.length > 160 ||
    !CODE_PATTERN.test(newCode) ||
    !DIGEST_PATTERN.test(newInventoryDigest) ||
    !Number.isInteger(newLetters) ||
    (newLetters as number) < 0 ||
    !Number.isInteger(newDrafts) ||
    (newDrafts as number) < 0
  ) {
    return NextResponse.json(
      {
        error:
          'Confira a chave pública nova, os Guardiões (sem repetição), a ata e os dados do novo .lacre (código, digesto, totais) do resultado da Renovação offline.',
      },
      { status: 400 },
    );
  }
  try {
    await webcrypto.subtle.importKey(
      'jwk',
      body!.newPublicKey as CriptaPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );
  } catch {
    return NextResponse.json({ error: 'Chave pública nova inválida.' }, { status: 400 });
  }

  const master = await currentCriptaMaster(tenantId);
  const db = getAdminFirestore();
  const governance = (await db.collection('criptaGovernanceV1').doc(tenantId).get()).data();
  const commissionMemberIds = Array.isArray(governance?.commissionMemberIds)
    ? (governance.commissionMemberIds as string[])
    : [];
  if (!master || !commissionMemberIds.length) {
    return NextResponse.json(
      { error: 'Nomeie a Comissão de Guarda e confirme o Venerável vigente antes da Renovação.' },
      { status: 409 },
    );
  }
  const container = createServerContainer();
  const members = await Promise.all(
    (guardianMemberIds as string[]).map((id) => container.repositories.member.findById(id)),
  );
  if (
    members.some(
      (member) =>
        !member ||
        member.tenantId !== tenantId ||
        member.situacao !== 'ativo' ||
        !member.userId ||
        member.id === master.member.id,
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Todo novo Guardião precisa ser um Irmão Ativo com conta vinculada, e nenhum pode ser o Venerável.',
      },
      { status: 400 },
    );
  }

  const cryptoRef = criptaCryptoRef(tenantId);
  const seal = sealRef(tenantId);
  const at = new Date().toISOString();
  const newState = {
    ...current,
    guardianShareDigests: (body!.guardianShareDigests as string[] | undefined) ?? [], // Never retain old commitments.
    publicKey: body!.newPublicKey as CriptaPublicKey,
    guardianMemberIds: guardianMemberIds as string[],
    guardianShares: initialGuardianShares(guardianMemberIds as string[]),
    lastRenewedAt: at,
    renewalCount: (typeof current.renewalCount === 'number' ? current.renewalCount : 0) + 1,
  };
  const canonical = {
    code: newCode,
    sealedAt: at,
    inventoryDigest: newInventoryDigest,
    previousCode: null,
    minutes,
    closingMasterId: master.member.id,
    closingSecondId: commissionMemberIds[0]!,
    commissionMemberIds,
    nextOpeningDate: governance?.nextOpeningDate as string | undefined,
  };
  try {
    const previousReceipt = await db.runTransaction(async (transaction) => {
      const sealSnap = await transaction.get(seal);
      const previous = sealSnap.data();
      transaction.update(cryptoRef, newState);
      transaction.create(cryptoRef.collection('events').doc(), {
        type: 'renovacao.concluida',
        guardianMemberIds: newState.guardianMemberIds,
        reason: reason || null,
        at,
        actorId: session.user.id,
        minutes,
      });
      const receipt = {
        ...canonical,
        previousCode: previous?.code ?? null,
        receiptDigest: receiptDigest({ ...canonical, previousCode: previous?.code ?? null }),
        count: (newLetters as number) + (newDrafts as number),
        letters: newLetters as number,
        drafts: newDrafts as number,
        status: 'sealed' as const,
        version: 1,
        createdBy: session.user.id,
        note: 'Lacre gerado por Renovação de Guardiões — reselado offline, chave trocada.',
        export: {
          receiptCode: newCode,
          exportedAt: at,
          note: 'Gerado offline pela ferramenta de Renovação.',
        },
      };
      transaction.set(seal, receipt);
      transaction.create(seal.collection('events').doc(), {
        type: 'renovacao.sealed',
        ...receipt,
        actorId: session.user.id,
      });
      return previous;
    });
    return NextResponse.json(
      { renewed: true, newCode, previousCode: previousReceipt?.code ?? null },
      { status: 201, headers },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível registrar a Renovação.' },
      { status: 409 },
    );
  }
});

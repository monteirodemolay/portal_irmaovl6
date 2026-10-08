import 'server-only';
import { getAdminFirestore } from '@vl6/infra';
import type { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';

const TENANT_ROOTS = [
  'criptaOnlineDraftsV1',
  'criptaAccountKeysV1',
  'criptaDepositLocksV1',
  'criptaCryptoV1',
  'criptaGovernanceV1',
  'criptaOnlineOpeningV1',
  'criptaSealsV1',
] as const;
const TENANT_COLLECTIONS = [
  'criptaOnlineCapsulesV1',
  'criptaCleanupPendingV1',
  'criptaIndividualEventsV2',
  'criptaTestCapsulesV1',
  'criptaStorageObjectsV1',
] as const;

/** Explicit allowlist. Never scan or delete the Wix folder, member records or tenant root.
 * listDocuments includes missing parent documents, so orphan subcollections are visited too. */
async function descendants(ref: DocumentReference): Promise<DocumentSnapshot[]> {
  const [snap, collections] = await Promise.all([ref.get(), ref.listCollections()]);
  const children = await Promise.all(
    collections.map(async (collection) => {
      const refs = await collection.listDocuments();
      return (await Promise.all(refs.map(descendants))).flat();
    }),
  );
  return [...children.flat(), ...(snap.exists ? [snap] : [])];
}

export async function resetInventory(tenantId: string, ownerUid: string) {
  const db = getAdminFirestore();
  const roots = await Promise.all(
    TENANT_ROOTS.map((name) => descendants(db.collection(name).doc(tenantId))),
  );
  const flat = await Promise.all(
    TENANT_COLLECTIONS.map((name) => db.collection(name).where('tenantId', '==', tenantId).get()),
  );
  // Old pilot records predate tenancy. Only the signed-in pilot's own records
  // without a tenant (or with this tenant) can be discarded; never another user's.
  const legacyTests = await db
    .collection('criptaTestCapsulesV1')
    .where('uid', '==', ownerUid)
    .get();
  const legacyRef = db.collection('criptaPilotV1').doc(ownerUid);
  const legacyParent = (await legacyRef.get()).data();
  const legacy =
    !legacyParent?.tenantId || legacyParent.tenantId === tenantId
      ? await descendants(legacyRef)
      : [];
  const docs = [
    ...new Map(
      [
        ...roots.flat(),
        ...flat.flatMap((snap) => snap.docs),
        ...legacy,
        ...legacyTests.docs.filter(
          (doc) => !doc.data().tenantId || doc.data().tenantId === tenantId,
        ),
      ].map((doc) => [doc.ref.path, doc]),
    ).values(),
  ];
  const files = [
    ...new Set(
      docs
        .map((doc) => doc.data()?.fileId)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ];
  const count = (prefix: string) =>
    docs.filter((doc) => doc.ref.path.startsWith(prefix) && doc.ref.path.split('/').length === 2)
      .length;
  return {
    docs,
    files,
    summary: {
      records: docs.length,
      files: files.length,
      letters: count('criptaOnlineCapsulesV1/'),
      drafts: docs.filter((doc) =>
        doc.ref.path.startsWith(`criptaOnlineDraftsV1/${tenantId}/users/`),
      ).length,
      legacyTests:
        count('criptaTestCapsulesV1/') +
        legacy.filter((doc) => doc.ref.path.includes('/capsules/')).length,
    },
  };
}

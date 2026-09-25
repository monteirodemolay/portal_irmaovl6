import { hasPermission } from '@vl6/domain';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { deletePrivateCiphertext, downloadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
const collection = () => getAdminFirestore().collection('criptaTestCapsulesV1');

async function find(request: Request, id: string) {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'tenant:manage') ||
      !canAccessCriptaPilot(session.user.email) || !/^[a-f0-9-]{36}$/.test(id)) return null;
  const reference = collection().doc(id);
  const snap = await reference.get();
  const data = snap.data();
  if (!data || data.uid !== session.user.id || data.kind !== 'fictional-test-only') return null;
  if (request.method === 'DELETE' && request.headers.get('origin') !== new URL(request.url).origin) return null;
  return { reference, data };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await find(request, (await params).id);
  if (!found || found.data.expiresAt <= new Date().toISOString()) {
    return NextResponse.json({ error: 'Ensaio expirado ou não encontrado.' }, { status: 404 });
  }
  try {
    const bytes = await downloadPrivateCiphertext(found.data.fileId as string, found.data.sha256 as string);
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="cripta-teste-cifrado.json"',
      'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return NextResponse.json({ error: 'Falha de integridade ou leitura.' }, { status: 502 }); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await find(request, (await params).id);
  if (!found) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  try {
    await deletePrivateCiphertext(found.data.fileId as string);
    await found.reference.delete();
    return NextResponse.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Exclusão não confirmada. Verifique novamente.' }, { status: 502 }); }
}

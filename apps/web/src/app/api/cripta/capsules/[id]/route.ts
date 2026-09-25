import { hasPermission } from '@vl6/domain';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { getCapsule, readWindow } from '@/modules/cripta/lib/vault-inventory';
import { canAcceptRealContent } from '@/modules/cripta/lib/operation-policy';
import { downloadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'tenant:manage') || !canAccessCriptaPilot(session.user.email)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!canAcceptRealContent(process.env.CRIPTA_REAL_CONTENT_ENABLED, await readWindow(), new Date())) {
    return NextResponse.json({ error: 'Cripta fechada.' }, { status: 423 });
  }
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  const capsule = await getCapsule(session.user.id, id);
  if (!capsule?.fileId || !capsule.sha256) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 });
  try {
    const bytes = await downloadPrivateCiphertext(capsule.fileId, capsule.sha256);
    return new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private',
        'Content-Disposition': 'attachment; filename="cripta-capsula-cifrada.json"',
        'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível confirmar a integridade do pacote.' }, { status: 502 });
  }
}

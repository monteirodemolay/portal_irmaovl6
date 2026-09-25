import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import { downloadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await activeCriptaSession();
  const { id } = await params;
  if (!session || !/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const doc = await getAdminFirestore().collection('criptaOnlineCapsulesV1').doc(id).get();
  const data = doc.data();
  if (!data || data.uid !== session.user.id || data.tenantId !== session.authContext.tenantId || data.status !== 'ready') {
    return NextResponse.json({ error: 'Carta não encontrada.' }, { status: 404 });
  }
  try {
    const bytes = await downloadPrivateCiphertext(data.fileId as string, data.sha256 as string);
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cripta-carta-${id}.json"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'X-Cripta-SHA256': data.sha256 as string,
    } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível conferir e exportar o pacote cifrado.' }, { status: 502 });
  }
}

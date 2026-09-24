import { NextResponse, type NextRequest } from 'next/server';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { loadConstellationMemories } from '@/modules/archive/lib/constellation-memories';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!hasPermission(session.authContext, 'archiveRelation:read')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const rawYear = request.nextUrl.searchParams.get('year');
  const year = rawYear ? Number(rawYear) : undefined;
  if (year !== undefined && (!Number.isInteger(year) || year < 1947 || year > 2200)) {
    return NextResponse.json({ error: 'invalid_year' }, { status: 400 });
  }

  const container = createServerContainer();
  const bundle = await loadConstellationMemories(
    session.authContext,
    session.role,
    container,
    year ? { year } : {},
  );

  return NextResponse.json(bundle);
}

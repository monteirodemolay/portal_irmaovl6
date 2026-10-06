import { NextResponse, type NextRequest } from 'next/server';
import { get } from '@vercel/blob';
import { canReadKnowledge, hasPermission, knowledgeLessons } from '@vl6/domain';
import { createServerContainer, FirestoreKnowledgeRepository } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
export const runtime = 'nodejs';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { courseId, lessonId } = await params,
      container = createServerContainer(),
      repo = new FirestoreKnowledgeRepository(container.db),
      c = await repo.findCourse(courseId),
      member = await container.repositories.member.findByUserId(
        session.authContext.tenantId,
        session.authContext.uid,
      );
    const preview =
      request.nextUrl.searchParams.get('preview') === '1' &&
      (hasPermission(session.authContext, 'knowledge:manage') ||
        hasPermission(session.authContext, 'tenant:manage'));
    if (
      !c ||
      c.tenantId !== session.authContext.tenantId ||
      c.deletedAt ||
      (!preview &&
        !canReadKnowledge(member, c, session.authContext.tenantId, session.authContext.uid))
    )
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const lesson = knowledgeLessons(c).find((l) => l.id === lessonId),
      asset = lesson?.assetId ? await repo.findAsset(lesson.assetId) : null;
    if (!asset || asset.courseId !== courseId || asset.tenantId !== c.tenantId || asset.deletedAt)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const token = process.env.KNOWLEDGE_BLOB_READ_WRITE_TOKEN;
    if (!token) return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
    const range = request.headers.get('range');
    if (range && !/^bytes=\d*-\d*$/.test(range))
      return NextResponse.json({ error: 'invalid_range' }, { status: 416 });
    const result = await get(asset.pathname, {
      access: 'private',
      token,
      ...(range ? { headers: { Range: range } } : {}),
    });
    if (!result || result.statusCode !== 200 || !result.stream)
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const headers: Record<string, string> = { 'Accept-Ranges': 'bytes' };
    for (const key of ['content-length', 'content-range']) {
      const v = result.headers.get(key);
      if (v) headers[key] = v;
    }
    return new NextResponse(result.stream, {
      status: result.headers.has('content-range') ? 206 : 200,
      headers: {
        ...headers,
        'Content-Type': asset.contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.filename)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 503 });
  }
}

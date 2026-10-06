import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { head } from '@vercel/blob';
import { createServerContainer, FirestoreKnowledgeRepository } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { hasPermission } from '@vl6/domain';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const token = process.env.KNOWLEDGE_BLOB_READ_WRITE_TOKEN;
  if (!token)
    return NextResponse.json(
      { error: 'O armazenamento privado do Conhecimento ainda não foi configurado.' },
      { status: 503 },
    );
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const session = await getCurrentSession();
        if (
          !session ||
          !(
            hasPermission(session.authContext, 'knowledge:manage') ||
            hasPermission(session.authContext, 'tenant:manage')
          )
        )
          throw new Error('Sem permissão para anexar arquivos.');
        const data = JSON.parse(clientPayload ?? '{}') as { courseId?: string };
        if (!data.courseId) throw new Error('Salve o rascunho antes de anexar.');
        const repo = new FirestoreKnowledgeRepository(createServerContainer().db),
          c = await repo.findCourse(data.courseId);
        if (!c || c.tenantId !== session.authContext.tenantId || c.deletedAt)
          throw new Error('Formação inválida.');
        const prefix = `tenants/${session.authContext.tenantId}/conhecimento/${c.id}/`;
        if (
          !pathname.startsWith(prefix) ||
          !/^[-a-zA-Z0-9_./]+$/.test(pathname) ||
          pathname.includes('..')
        )
          throw new Error('Caminho inválido.');
        return {
          allowedContentTypes: [
            'video/mp4',
            'video/webm',
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          maximumSizeInBytes: 250 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            tenantId: c.tenantId,
            courseId: c.id,
            uid: session.authContext.uid,
            assetId: randomUUID(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // O SDK verifica a assinatura deste callback; não depende de cookie no webhook.
        const data = JSON.parse(tokenPayload ?? '{}') as {
          tenantId: string;
          courseId: string;
          uid: string;
          assetId: string;
        };
        const metadata = await head(blob.url, { token });
        if (!new URL(blob.url).hostname.endsWith('.private.blob.vercel-storage.com'))
          throw new Error('O arquivo deve estar em um armazenamento privado.');
        const now = new Date(),
          repo = new FirestoreKnowledgeRepository(createServerContainer().db);
        await repo.createAsset({
          id: data.assetId,
          tenantId: data.tenantId,
          courseId: data.courseId,
          pathname: blob.pathname,
          filename: blob.pathname.split('/').pop() ?? 'Arquivo',
          sizeBytes: metadata.size,
          contentType: blob.contentType,
          createdBy: data.uid,
          updatedBy: data.uid,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          status: 'active',
          ativo: true,
        });
      },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: 'Não foi possível autorizar o envio. Confira a permissão e o armazenamento privado.',
      },
      { status: 400 },
    );
  }
}

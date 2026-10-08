import type { NewsComment } from '@vl6/domain';
import type { createServerContainer } from '@vl6/infra';

/**
 * Nome de exibição de quem comentou, por `autorId` (uid) — comentário só
 * guarda o uid (`NewsComment.autorId`), nunca o nome, então tanto a lista
 * pública quanto o painel de moderação precisam resolver isso contra o
 * cadastro de Irmão antes de renderizar. Busca só os uids distintos da
 * página atual (nunca todo o tenant).
 */
export async function resolveCommentAuthorNames(
  container: ReturnType<typeof createServerContainer>,
  tenantId: string,
  comments: NewsComment[],
): Promise<Record<string, string>> {
  const uniqueAuthorIds = Array.from(new Set(comments.map((comment) => comment.autorId)));
  const entries = await Promise.all(
    uniqueAuthorIds.map(async (autorId) => {
      const member = await container.repositories.member.findByUserId(tenantId, autorId);
      return [autorId, member?.nomeCompleto ?? 'Irmão'] as const;
    }),
  );
  return Object.fromEntries(entries);
}

import { NextResponse, type NextRequest } from 'next/server';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { resolveApiKeyContext } from '@/lib/api/resolve-api-key-context';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { listMembersQuerySchema } from './schema';

const ROUTE = 'GET /api/v1/members';

// Por API Key (não por IP): cada integração de terceiro tem sua própria cota.
const membersRateLimiter = new RateLimiter();

/**
 * Lista o Cadastro de Irmãos — endpoint pensado para integrações de
 * terceiros (docs/architecture/10-roadmap.md v2.0), autenticado só por
 * API Key (`Authorization: Bearer <chave>`), nunca por cookie de sessão —
 * é a única rota de `/api/v1` sem fallback de sessão web, deliberado.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const authContext = await resolveApiKeyContext(request);
  if (!authContext) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limit = membersRateLimiter.check(authContext.uid, { limit: 100, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return rateLimitResponse(limit);
  }

  if (!hasPermission(authContext, 'member:read')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const parsed = listMembersQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { cursor, limit: pageLimit, ...filters } = parsed.data;

  const container = createServerContainer();
  const page = await container.useCases.searchMembers.execute(authContext, filters, {
    cursor,
    limit: pageLimit,
  });

  return NextResponse.json({
    items: page.items.map((member) => ({
      id: member.id,
      nomeCompleto: member.nomeCompleto,
      nomeMaconico: member.nomeMaconico,
      email: member.email,
      matricula: member.matricula,
      grau: member.grau,
      situacao: member.situacao,
      cim: member.cim,
      cidade: member.endereco?.cidade ?? null,
      dataIniciacao: member.dataIniciacao?.toISOString() ?? null,
    })),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  });
});

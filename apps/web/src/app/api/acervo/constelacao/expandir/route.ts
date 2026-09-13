import { NextResponse, type NextRequest } from 'next/server';
import type { ExpandNodeInput } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Expande um nó da Constelação da Memória explorável — rota de API comum
 * (não Server Action) de propósito: uma Server Action chamada fora de um
 * `<form>` ainda passa pelo pipeline de ações do Next.js, que revalida a
 * árvore de Server Components da rota atual a cada chamada — em
 * `/acervo/constelacao` isso refaz `GetConstellationRootsUseCase` (varre o
 * tenant inteiro) a cada clique num nó só pra abrir um ramo, e o
 * `router.refresh()` implícito jogava o scroll de volta pro topo da
 * página. Um `fetch` comum não recarrega nada além da resposta JSON deste
 * endpoint — abrir um ramo fica rápido e não mexe na posição de rolagem.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let input: ExpandNodeInput;
  try {
    input = (await request.json()) as ExpandNodeInput;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const container = createServerContainer();
  const result = await container.useCases.expandConstellationNode.execute(
    session.authContext,
    input,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  return NextResponse.json(result.value);
}

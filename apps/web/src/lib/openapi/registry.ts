import { extendZodWithOpenApi, OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { z } from 'zod';
import { loginBodySchema } from '@/app/api/v1/auth/login/schema';
import { webVitalsBodySchema } from '@/app/api/v1/web-vitals/schema';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-constants';

extendZodWithOpenApi(z);

/**
 * Documento OpenAPI 3.1 gerado a partir dos mesmos schemas Zod que as
 * rotas usam pra validar entrada — docs/architecture/07-fluxo-
 * autenticacao.md §7.5 e docs/architecture/10-roadmap.md v1.3. Servido em
 * `/api/v1/openapi.json` (route.ts irmão deste arquivo).
 *
 * Nota sobre autenticação: a arquitetura original previa um par
 * access/refresh token (Bearer JWT) para esta API. O que existe hoje é o
 * fluxo de sessão via cookie HttpOnly do próprio app (login troca um ID
 * Token do Firebase por um cookie de sessão) — é isso que este documento
 * descreve, não o design aspiracional de token Bearer ainda não
 * implementado.
 */
const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'sessionCookie', {
  type: 'apiKey',
  in: 'cookie',
  name: SESSION_COOKIE_NAME,
  description:
    'Cookie de sessão HttpOnly emitido por POST /api/v1/auth/login. Definido automaticamente pelo navegador em requisições same-origin.',
});

const errorResponseSchema = z.object({ error: z.string() }).openapi('ErrorResponse');

function errorResponse(description: string) {
  return {
    description,
    content: { 'application/json': { schema: errorResponseSchema } },
  };
}

const rateLimitedResponse = {
  description: 'Limite de requisições excedido.',
  headers: z.object({ 'Retry-After': z.string().describe('Segundos até a próxima tentativa.') }),
  content: { 'application/json': { schema: errorResponseSchema } },
};

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  summary: 'Troca um ID Token do Firebase Authentication por um cookie de sessão',
  tags: ['Autenticação'],
  request: {
    body: {
      content: { 'application/json': { schema: loginBodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Login bem-sucedido — cookie de sessão definido na resposta.',
      content: {
        'application/json': {
          schema: z.object({ user: z.object({ uid: z.string(), email: z.string() }) }),
        },
      },
    },
    400: errorResponse('Corpo da requisição inválido.'),
    401: errorResponse('ID Token inválido ou expirado.'),
    403: errorResponse('Conta bloqueada, pendente, ou sem vínculo com este tenant.'),
    404: errorResponse('Nenhum tenant resolvido para o host da requisição.'),
    429: rateLimitedResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  summary: 'Revoga a sessão corrente (e sessões antigas do mesmo usuário)',
  tags: ['Autenticação'],
  security: [{ sessionCookie: [] }],
  responses: {
    200: {
      description: 'Sessão revogada.',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/admin/members/export',
  summary: 'Exporta o Cadastro de Irmãos filtrado em Excel ou PDF',
  tags: ['Administração'],
  security: [{ sessionCookie: [] }],
  request: {
    query: z.object({
      format: z.enum(['xlsx', 'pdf']).optional().openapi({ description: 'Padrão: xlsx.' }),
      nome: z.string().optional(),
      grau: z.string().optional(),
      situacao: z.string().optional(),
      cidade: z.string().optional(),
      cim: z.string().optional(),
      cargo: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Arquivo gerado (até 1000 registros).',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: z.string().openapi({ format: 'binary' }),
        },
        'application/pdf': { schema: z.string().openapi({ format: 'binary' }) },
      },
    },
    401: errorResponse('Sessão ausente ou inválida.'),
    403: errorResponse('Sem a permissão member:read.'),
    429: rateLimitedResponse,
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/web-vitals',
  summary: 'Recebe uma métrica Core Web Vitals (CLS, FCP, INP, LCP, TTFB) do cliente',
  tags: ['Observabilidade'],
  request: {
    body: {
      content: { 'application/json': { schema: webVitalsBodySchema } },
    },
  },
  responses: {
    204: { description: 'Métrica registrada — sem corpo de resposta.' },
    400: errorResponse('Corpo da requisição inválido.'),
    429: rateLimitedResponse,
  },
});

export function generateOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Portal do Irmão — API REST',
      version: '1.0.0',
      description:
        'API REST do Portal do Irmão (docs/architecture/07-fluxo-autenticacao.md §7.5). Autenticação via cookie de sessão HttpOnly — ver o security scheme `sessionCookie`.',
    },
    servers: [{ description: 'Origem atual', url: '/' }],
  });
}

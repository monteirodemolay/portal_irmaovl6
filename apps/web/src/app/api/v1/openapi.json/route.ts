import { NextResponse } from 'next/server';
import { generateOpenApiDocument } from '@/lib/openapi/registry';

/**
 * Documento OpenAPI 3.1 da API REST — docs/architecture/07-fluxo-
 * autenticacao.md §7.5 e docs/architecture/10-roadmap.md v1.3,
 * "publicação do OpenAPI". Gerado uma vez por processo (a definição das
 * rotas é estática, não depende da requisição).
 */
const document = generateOpenApiDocument();

export function GET(): NextResponse {
  return NextResponse.json(document);
}

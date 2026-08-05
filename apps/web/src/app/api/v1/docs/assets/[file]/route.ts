import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Serve os arquivos estáticos do `swagger-ui-dist` (self-hosted, sem CDN
 * externa) usados pela página de docs em `../route.ts`. Allowlist explícita
 * em vez de servir qualquer caminho do pacote — evita virar um path
 * traversal genérico dentro de `node_modules`.
 */
const ASSETS: Record<string, string> = {
  'swagger-ui-bundle.js': 'text/javascript; charset=utf-8',
  'swagger-ui.css': 'text/css; charset=utf-8',
};

const DIST_DIR = path.join(process.cwd(), 'node_modules', 'swagger-ui-dist');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { file } = await params;
  const contentType = ASSETS[file];
  if (!contentType) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const contents = await readFile(path.join(DIST_DIR, file));
  return new NextResponse(new Uint8Array(contents), { headers: { 'content-type': contentType } });
}

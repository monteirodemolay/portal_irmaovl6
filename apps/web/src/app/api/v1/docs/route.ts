import { NextResponse } from 'next/server';

/**
 * Swagger UI para a API REST, só em desenvolvimento — docs/architecture/
 * 07-fluxo-autenticacao.md §7.5 ("visualizável via Swagger UI em ambiente
 * de desenvolvimento"). Assets do `swagger-ui-dist` servidos localmente
 * por `assets/[file]/route.ts`, sem CDN externa.
 */
export function GET(): NextResponse {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Portal do Irmão — API REST</title>
    <link rel="stylesheet" href="/api/v1/docs/assets/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/v1/docs/assets/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.SwaggerUIBundle({
          url: '/api/v1/openapi.json',
          dom_id: '#swagger-ui',
        });
      };
    </script>
  </body>
</html>`;

  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

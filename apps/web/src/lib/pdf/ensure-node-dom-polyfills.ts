/**
 * `pdfjs-dist` (usado por `pdf-parse` na importação de Irmãos via PDF, ver
 * `modules/membership/actions/member-actions.ts`) tenta, no carregamento do
 * próprio módulo, usar `DOMMatrix`/`ImageData`/`Path2D` — globals de browser
 * que em Node só existem via um polyfill que ele mesmo tenta carregar do
 * pacote nativo opcional `@napi-rs/canvas`. Esse binário nativo não fica
 * disponível de forma confiável no runtime serverless da Vercel (confirmado
 * em produção: "Cannot find module '@napi-rs/canvas'" nos logs), e sem ele
 * o `pdfjs-dist` quebra com `ReferenceError: DOMMatrix is not defined` — não
 * no momento em que a Server Action roda, mas assim que o Next pré-carrega
 * o módulo da rota (`unstable_preloadEntries`, dispara já ao navegar pra
 * `/admin/pessoas/irmaos/importar`, antes de qualquer upload). Como usamos
 * só extração de texto (nunca renderização), stubs vazios bastam — desde
 * que existam ANTES desse pré-carregamento, por isso são registrados no
 * `register()` do `instrumentation.ts` (roda na inicialização do servidor),
 * não dentro da própria Server Action.
 */
export function ensureNodePdfDomPolyfills(): void {
  const g = globalThis as { DOMMatrix?: unknown; ImageData?: unknown; Path2D?: unknown };
  g.DOMMatrix ??= class DOMMatrixStub {};
  g.ImageData ??= class ImageDataStub {};
  g.Path2D ??= class Path2DStub {};
}

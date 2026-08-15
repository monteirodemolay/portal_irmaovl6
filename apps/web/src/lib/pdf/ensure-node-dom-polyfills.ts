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

/**
 * Mesmo problema de arquivo ausente no runtime da Vercel, mas num arquivo
 * diferente: `pdfjs-dist`, em Node, sempre roda um "fake worker" (mesma
 * thread, sem worker_thread de verdade) — mas mesmo esse fake worker
 * carrega o código de `pdf.worker.mjs` via `import()` **dinâmico com
 * caminho calculado em runtime** (não um literal de string). Esse padrão
 * de import é exatamente o que o rastreador de arquivos da Vercel
 * (`@vercel/nft`) não consegue detectar de forma estática, então o arquivo
 * não vai para o bundle da função serverless — confirmado em produção:
 * "Setting up fake worker failed: Cannot find module '.../pdf.worker.mjs'".
 *
 * A correção: `pdfjs-dist` primeiro confere se `globalThis.pdfjsWorker` já
 * existe antes de tentar esse import dinâmico — se existir, usa direto e
 * pula o import problemático. Fazemos nós mesmos o import do worker, mas
 * com um caminho **literal** (`pdfjs-dist/legacy/build/pdf.worker.mjs`),
 * que o Next/Vercel conseguem rastrear e empacotar corretamente.
 */
export async function ensurePdfWorkerAvailable(): Promise<void> {
  const g = globalThis as { pdfjsWorker?: { WorkerMessageHandler: unknown } };
  if (g.pdfjsWorker) return;

  const { WorkerMessageHandler } = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
  g.pdfjsWorker = { WorkerMessageHandler };
}

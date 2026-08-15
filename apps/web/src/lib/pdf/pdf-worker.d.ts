/**
 * `pdfjs-dist` não publica tipos para o entry point do worker legado — só
 * usamos essa importação pra dar pro `pdfjs-dist` (via `globalThis.pdfjsWorker`)
 * um `WorkerMessageHandler` já carregado, ver `ensurePdfWorkerAvailable`.
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}

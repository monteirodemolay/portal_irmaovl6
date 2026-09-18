'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Button, Camera, RefreshCw, Sparkles } from '@vl6/ui';
import { lookupLibraryBookAction } from '../actions/library-actions';
import {
  extractCoverSuggestion,
  extractBarcodeCandidate,
  extractSynopsisSuggestion,
  isValidIsbn,
  normalizeBookCode,
  type BookCatalogSuggestion,
} from '../lib/book-catalog-assistant';

export interface BookCaptureResult extends BookCatalogSuggestion {
  anoPublicacao?: number;
  editora?: string;
  palavrasChave?: string[];
}

export function BookCaptureAssistant({
  onSuggestion,
  initialCoverUrl,
}: {
  onSuggestion: (suggestion: BookCaptureResult) => void;
  initialCoverUrl?: string | null;
}) {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialCoverUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!coverFile) {
      setPreviewUrl(initialCoverUrl ?? null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile, initialCoverUrl]);

  const canAnalyze = useMemo(() => Boolean(coverFile || backFile), [backFile, coverFile]);

  const analyze = async () => {
    if (!canAnalyze) return;
    setBusy(true);
    setError(null);
    setMessage('Preparando o leitor…');
    try {
      let barcode = '';
      if (backFile || coverFile) {
        setMessage('Lendo o código de barras…');
        try {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          const imageUrl = URL.createObjectURL(backFile ?? coverFile!);
          try {
            barcode = normalizeBookCode((await reader.decodeFromImageUrl(imageUrl)).getText());
          } finally {
            URL.revokeObjectURL(imageUrl);
          }
        } catch {
          // Nem toda capa ou contracapa contém um código legível; o OCR ainda será executado.
        }
      }

      const { createWorker, OEM } = await import('tesseract.js');
      const worker = await createWorker('por', OEM.LSTM_ONLY, {
        logger: (progress) => {
          if (progress.status !== 'recognizing text') return;
          setMessage(`Lendo o texto… ${Math.round(progress.progress * 100)}%`);
        },
      });
      let coverText = '';
      let backText = '';
      try {
        if (coverFile) coverText = (await worker.recognize(coverFile)).data.text;
        if (backFile) backText = (await worker.recognize(backFile)).data.text;
      } finally {
        await worker.terminate();
      }
      barcode ||= extractBarcodeCandidate(backText) ?? '';

      setMessage('Consultando os dados bibliográficos…');
      const localSuggestion = {
        ...extractCoverSuggestion(coverText),
        sinopse: extractSynopsisSuggestion(backText),
        codigoBarras: barcode || undefined,
        isbn: barcode && isValidIsbn(barcode) ? barcode : undefined,
      };
      const catalog = await lookupLibraryBookAction({
        code: barcode || undefined,
        query: coverText || undefined,
      });
      onSuggestion({
        titulo: catalog.titulo || localSuggestion.titulo,
        autor: catalog.autor || localSuggestion.autor,
        anoPublicacao: catalog.anoPublicacao,
        editora: catalog.editora,
        isbn: catalog.isbn || localSuggestion.isbn,
        codigoBarras: localSuggestion.codigoBarras,
        sinopse: catalog.sinopse || localSuggestion.sinopse,
        palavrasChave: catalog.palavrasChave,
      });
      setMessage(
        catalog.found
          ? 'Dados localizados e preenchidos. Confira antes de publicar.'
          : 'Texto lido e campos sugeridos. Confira antes de publicar.',
      );
    } catch {
      setError(
        'Não foi possível concluir a leitura. Você pode tentar outra foto ou preencher manualmente.',
      );
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="grid content-start gap-4">
      <div className="bg-surface overflow-hidden rounded-xl border">
        {previewUrl ? (
          // A prévia usa uma URL temporária criada pelo próprio navegador.
          <img
            src={previewUrl}
            alt="Prévia da capa"
            className="aspect-[3/4] w-full object-contain"
          />
        ) : (
          <div className="text-muted flex aspect-[3/4] flex-col items-center justify-center gap-2 bg-stone-50 text-sm">
            <BookOpen size={42} />
            <span>Capa da obra</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border p-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={16} /> Assistente de cadastro
          </p>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Fotografe a capa e a contracapa. O leitor sugere os dados; o Bibliotecário confirma.
          </p>
        </div>

        <label className="grid gap-1 text-sm font-medium">
          Enviar foto da capa
          <input
            className="block w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-2"
            type="file"
            name="capaUpload"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setCoverFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Camera size={16} /> Fotografar a capa
          </span>
          <input
            className="block w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-2"
            type="file"
            name="capaCamera"
            accept="image/*"
            capture="environment"
            onChange={(event) => setCoverFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Enviar contracapa ou código
          <input
            className="block w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-2"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setBackFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          <span className="flex items-center gap-2">
            <Camera size={16} /> Fotografar contracapa ou código
          </span>
          <input
            className="block w-full min-w-0 text-xs file:mr-2 file:rounded file:border-0 file:bg-stone-100 file:px-3 file:py-2"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setBackFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>

        <Button type="button" onClick={analyze} disabled={!canAnalyze || busy} className="w-full">
          {busy ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {busy ? 'Analisando…' : 'Ler e preencher dados'}
        </Button>
        {message && <p className="text-xs text-green-700">{message}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <p className="text-muted text-xs">
          O OCR roda no aparelho; apenas o texto e o código são usados para consultar catálogos
          públicos. Fotos nítidas, retas e sem reflexo produzem melhores resultados.
        </p>
      </div>
    </aside>
  );
}

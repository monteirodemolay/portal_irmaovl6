'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import jsQR from 'jsqr';
import type { LibraryCopy, LibraryItem } from '@vl6/domain';
import {
  BookOpen,
  Badge,
  Button,
  Camera,
  Card,
  CardContent,
  CheckCircle2,
  Input,
  RotateCcw,
  cn,
} from '@vl6/ui';
import {
  registerLibraryDirectLoanAction,
  registerLibraryDirectReturnAction,
} from '../actions/library-actions';

/**
 * `BarcodeDetector` ainda não está nos tipos padrão do DOM (lib.dom.d.ts) —
 * suportado nativamente por Chrome/Edge/Android (motor de detecção do
 * próprio sistema, muito mais rápido e confiável que decodificação em JS).
 * Onde falta (Firefox, Safari mais antigo), cai para `jsQR` lendo os frames
 * via canvas.
 */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorLike;
}

interface MemberOption {
  id: string;
  nomeCompleto: string;
  temAcessoPortal: boolean;
}

interface BagEntry {
  key: string;
  libraryItemId: string;
  copyId: string | null;
  titulo: string;
  autor: string | null;
  capaUrl: string | null;
  codigoTombo: string | null;
  prazoEmprestimoDias: number;
  error?: string;
}

interface ReturnEntry {
  key: string;
  titulo: string;
  codigoTombo: string | null;
  message: string;
}

type Mode = 'retirada' | 'devolucao';

const todayIso = () => new Date().toISOString().slice(0, 10);
const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Extrai o id do exemplar de um QR escaneado (URL da etiqueta) ou de um tombo digitado. */
function parseScanCode(raw: string): { copyId: string | null; tombo: string } {
  const value = raw.trim();
  const match = value.match(/\/acervo\/biblioteca\/exemplares\/([^/?#]+)/);
  if (match?.[1]) return { copyId: match[1], tombo: value };
  return { copyId: null, tombo: value };
}

/** Bipe curto de confirmação — mesmo princípio de leitor de código de balcão. */
function playScanBeep() {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => ctx.close();
  } catch {
    // Sem áudio disponível (permissão, navegador) — o retorno visual já basta.
  }
}

export function PresentialCheckout({
  items,
  copies,
  members,
}: {
  items: LibraryItem[];
  copies: LibraryCopy[];
  members: MemberOption[];
}) {
  const [mode, setMode] = useState<Mode>('retirada');
  const [scan, setScan] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [titleQuery, setTitleQuery] = useState('');
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [member, setMember] = useState<MemberOption | null>(null);
  const [checkedOutAt, setCheckedOutAt] = useState(todayIso());
  const [dueAt, setDueAt] = useState(addDaysIso(21));
  const [summary, setSummary] = useState<{ ok: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const [, startReturnTransition] = useTransition();
  // Já abre a câmera ao entrar na tela — essa página só existe pra escanear e
  // entregar (ou receber de volta) na hora; o Bibliotecário não devia
  // precisar tocar em nada antes.
  const [cameraOpen, setCameraOpen] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState<{ titulo: string; kind: Mode } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastCameraCodeRef = useRef<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O loop da câmera roda dentro de um `requestAnimationFrame` que só é
  // recriado quando a câmera abre/fecha — usa um ref pro modo atual pra não
  // precisar reiniciar o stream toda vez que o Bibliotecário troca entre
  // "Retirar" e "Devolver".
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const physicalItems = useMemo(() => items.filter((item) => item.formato !== 'digital'), [items]);
  const availableByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const copy of copies)
      if (copy.situacao === 'disponivel')
        map.set(copy.libraryItemId, (map.get(copy.libraryItemId) ?? 0) + 1);
    return map;
  }, [copies]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const titleSuggestions = useMemo(() => {
    const query = titleQuery.trim().toLowerCase();
    if (!query) return [];
    return physicalItems
      .filter(
        (item) =>
          (item.titulo ?? '').toLowerCase().includes(query) &&
          (availableByItem.get(item.id) ?? 0) > 0,
      )
      .slice(0, 8);
  }, [titleQuery, physicalItems, availableByItem]);

  const memberSuggestions = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return [];
    return members
      .filter((option) => option.nomeCompleto.toLowerCase().includes(query))
      .slice(0, 8);
  }, [memberQuery, members]);

  function switchMode(next: Mode) {
    setMode(next);
    setScanError(null);
    setScan('');
    lastCameraCodeRef.current = null;
    scanRef.current?.focus();
  }

  function addBagEntry(entry: BagEntry) {
    if (bag.length === 0) setDueAt(addDaysIso(entry.prazoEmprestimoDias));
    setBag((current) => [...current.filter((e) => e.key !== entry.key), entry]);
  }

  function processRetiradaScan(raw: string): boolean {
    if (!raw.trim()) return false;
    const { copyId, tombo } = parseScanCode(raw);
    const copy = copyId
      ? copies.find((c) => c.id === copyId)
      : copies.find((c) => c.codigoTombo.toLowerCase() === tombo.toLowerCase());
    if (!copy) {
      setScanError('Exemplar não encontrado. Confira o QR ou o tombo digitado.');
      return false;
    }
    if (copy.situacao !== 'disponivel') {
      setScanError(`Este exemplar está "${copy.situacao}", não pode ser retirado agora.`);
      return false;
    }
    const item = itemById.get(copy.libraryItemId);
    if (!item) {
      setScanError('Obra do exemplar não encontrada.');
      return false;
    }
    setScanError(null);
    const titulo = item.titulo ?? 'Obra sem título';
    addBagEntry({
      key: copy.id,
      libraryItemId: item.id,
      copyId: copy.id,
      titulo,
      autor: item.autor ?? null,
      capaUrl: item.capaUrl ?? null,
      codigoTombo: copy.codigoTombo,
      prazoEmprestimoDias: item.prazoEmprestimoDias ?? 21,
    });
    playScanBeep();
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    setScanFlash({ titulo, kind: 'retirada' });
    flashTimeoutRef.current = setTimeout(() => setScanFlash(null), 1800);
    return true;
  }

  /**
   * Devolução: sem sacola, sem escolher Irmão, sem datas — escaneou,
   * devolveu. O exemplar volta pra estante que já estava associada a ele.
   */
  function processDevolucaoScan(raw: string): boolean {
    if (!raw.trim()) return false;
    const { copyId, tombo } = parseScanCode(raw);
    const copy = copyId
      ? copies.find((c) => c.id === copyId)
      : copies.find((c) => c.codigoTombo.toLowerCase() === tombo.toLowerCase());
    if (!copy) {
      setScanError('Exemplar não encontrado. Confira o QR ou o tombo digitado.');
      return false;
    }
    setScanError(null);
    const titulo = itemById.get(copy.libraryItemId)?.titulo ?? 'Obra';
    startReturnTransition(async () => {
      const fd = new FormData();
      fd.set('copyId', copy.id);
      const result = await registerLibraryDirectReturnAction({ error: null }, fd);
      if (result.error) {
        setScanError(result.error);
        return;
      }
      playScanBeep();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      setScanFlash({ titulo, kind: 'devolucao' });
      flashTimeoutRef.current = setTimeout(() => setScanFlash(null), 1800);
      setReturns((current) => [
        {
          key: `${copy.id}-${Date.now()}`,
          titulo,
          codigoTombo: copy.codigoTombo,
          message: result.success ?? 'Devolução registrada.',
        },
        ...current,
      ]);
    });
    return true;
  }

  function processScan(raw: string): boolean {
    return mode === 'retirada' ? processRetiradaScan(raw) : processDevolucaoScan(raw);
  }

  function handleScan(event: FormEvent) {
    event.preventDefault();
    if (processScan(scan)) setScan('');
    scanRef.current?.focus();
  }

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    setCameraError(null);
    lastCameraCodeRef.current = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        const BarcodeDetectorCtor = (
          window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
        ).BarcodeDetector;
        const detector = BarcodeDetectorCtor
          ? new BarcodeDetectorCtor({ formats: ['qr_code'] })
          : null;
        const canvas = detector ? null : document.createElement('canvas');
        const ctx = canvas?.getContext('2d', { willReadFrequently: true }) ?? null;

        const tick = async () => {
          if (cancelled) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            let text: string | undefined;
            try {
              if (detector) {
                const results = await detector.detect(video);
                text = results[0]?.rawValue;
              } else if (ctx && canvas) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
                text =
                  jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
                    ?.data ?? undefined;
              }
            } catch {
              // Frame instável (foco, movimento) — tenta de novo no próximo ciclo.
            }
            if (text && text !== lastCameraCodeRef.current) {
              lastCameraCodeRef.current = text;
              if (modeRef.current === 'retirada') processRetiradaScan(text);
              else processDevolucaoScan(text);
            }
          }
          if (!cancelled) rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setCameraError('Não foi possível acessar a câmera do aparelho.');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [cameraOpen]);

  function addByTitle(item: LibraryItem) {
    addBagEntry({
      key: `item:${item.id}`,
      libraryItemId: item.id,
      copyId: null,
      titulo: item.titulo ?? 'Obra sem título',
      autor: item.autor ?? null,
      capaUrl: item.capaUrl ?? null,
      codigoTombo: null,
      prazoEmprestimoDias: item.prazoEmprestimoDias ?? 21,
    });
    setTitleQuery('');
  }

  function removeFromBag(key: string) {
    setBag((current) => current.filter((entry) => entry.key !== key));
  }

  function confirmCheckout() {
    if (!member || bag.length === 0) return;
    setSummary(null);
    startTransition(async () => {
      let ok = 0;
      const remaining: BagEntry[] = [];
      for (const entry of bag) {
        const fd = new FormData();
        fd.set('memberId', member.id);
        fd.set('libraryItemId', entry.libraryItemId);
        if (entry.copyId) fd.set('copyId', entry.copyId);
        fd.set('checkedOutAt', checkedOutAt);
        fd.set('dueAt', dueAt);
        const result = await registerLibraryDirectLoanAction({ error: null }, fd);
        if (result.error) remaining.push({ ...entry, error: result.error });
        else ok++;
      }
      setBag(remaining);
      setSummary({ ok, failed: remaining.length });
      if (remaining.length === 0) {
        setMember(null);
        setMemberQuery('');
        setCheckedOutAt(todayIso());
        setDueAt(addDaysIso(21));
      }
      scanRef.current?.focus();
    });
  }

  return (
    <div className="grid gap-6">
      {/* Seletor de modo — dois botões grandes, tipo autoatendimento de
          mercado: ou tá retirando, ou tá devolvendo, nunca as duas coisas
          misturadas na mesma tela. */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => switchMode('retirada')}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-5 text-base font-semibold transition-colors',
            mode === 'retirada'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-surface text-muted hover:bg-accent/5',
          )}
        >
          <BookOpen size={26} />
          Retirar
        </button>
        <button
          type="button"
          onClick={() => switchMode('devolucao')}
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-5 text-base font-semibold transition-colors',
            mode === 'devolucao'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border bg-surface text-muted hover:bg-accent/5',
          )}
        >
          <RotateCcw size={26} />
          Devolver
        </button>
      </div>

      <div className={cn('grid gap-6', mode === 'retirada' && 'lg:grid-cols-[1.1fr_0.9fr]')}>
        <div className="grid gap-4">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Escaneie o exemplar</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCameraOpen((open) => !open)}
                >
                  <Camera size={16} />
                  {cameraOpen ? 'Fechar câmera' : 'Usar câmera'}
                </Button>
              </div>
              {cameraOpen && (
                <div className="grid gap-2">
                  {/*
                    Quadrado fixo — mesmo tamanho e mesma forma sempre, em
                    qualquer tela e em qualquer resolução que a câmera do
                    aparelho devolver. O `<video>` preenche esse quadrado via
                    `object-cover` (corta o excesso, nunca estica nem redefine
                    o tamanho da caixa) — assim a leitura nunca "sai do
                    padrão" e desestrutura o resto da página.
                  */}
                  <div
                    className={`relative mx-auto aspect-square w-full max-w-[320px] touch-manipulation overflow-hidden rounded-lg border-4 bg-black transition-colors ${
                      scanFlash ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      playsInline
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/60"
                    />
                    {scanFlash && (
                      <div className="animate-in fade-in absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-600/90 text-center text-white">
                        <CheckCircle2 size={48} />
                        <p className="px-4 text-lg font-semibold">
                          {scanFlash.kind === 'devolucao'
                            ? 'Livro devolvido!'
                            : 'Livro reconhecido!'}
                        </p>
                        <p className="px-4 text-sm">{scanFlash.titulo}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-muted text-xs">
                    {mode === 'retirada'
                      ? 'Aponte a câmera para o QR da etiqueta — a obra é adicionada à sacola automaticamente ao reconhecer o código.'
                      : 'Aponte a câmera para o QR da etiqueta — a devolução é registrada na hora, sem precisar de mais nada.'}
                  </p>
                  {cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
                </div>
              )}
              <form onSubmit={handleScan} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <Input
                  ref={scanRef}
                  autoFocus
                  value={scan}
                  onChange={(event) => setScan(event.target.value)}
                  placeholder="Aponte o leitor para o QR da etiqueta ou digite o tombo…"
                  className="h-12 text-base"
                />
                <Button type="submit" className="h-12 w-full sm:w-auto">
                  {mode === 'retirada' ? 'Adicionar' : 'Registrar devolução'}
                </Button>
              </form>
              {scanError && <p className="text-sm text-red-600">{scanError}</p>}
              {scanFlash && !cameraOpen && (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 size={18} />
                  {scanFlash.kind === 'devolucao' ? 'Livro devolvido' : 'Livro reconhecido'}:{' '}
                  {scanFlash.titulo}
                </p>
              )}
              <p className="text-muted text-xs">
                A etiqueta de cada exemplar tem um QR fixo — use a câmera acima, escaneie com um
                leitor USB (digita aqui automaticamente) ou digite o tombo manualmente.
              </p>
            </CardContent>
          </Card>

          {mode === 'retirada' ? (
            <>
              <Card>
                <CardContent className="grid gap-3 p-4 sm:p-5">
                  <h2 className="font-semibold">Ou busque pelo nome da obra</h2>
                  <div className="relative">
                    <Input
                      value={titleQuery}
                      onChange={(event) => setTitleQuery(event.target.value)}
                      placeholder="Digite o título…"
                    />
                    {titleSuggestions.length > 0 && (
                      <ul className="border-border bg-surface absolute z-10 mt-1 w-full rounded border shadow-md">
                        {titleSuggestions.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => addByTitle(item)}
                              className="hover:bg-accent/10 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                            >
                              <span className="min-w-0 truncate">{item.titulo}</span>
                              <Badge variant="outline" className="shrink-0">
                                {availableByItem.get(item.id) ?? 0} disponíveis
                              </Badge>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="grid gap-3 p-4 sm:p-5">
                  <h2 className="font-semibold">Sacola ({bag.length})</h2>
                  {bag.length === 0 ? (
                    <p className="text-muted text-sm">Nenhuma obra adicionada ainda.</p>
                  ) : (
                    <ul className="grid gap-2">
                      {bag.map((entry) => (
                        <li
                          key={entry.key}
                          className="flex items-center gap-3 rounded-lg border p-2 sm:p-3"
                        >
                          <div className="bg-surface text-muted flex h-14 w-10 shrink-0 items-center justify-center overflow-hidden rounded border">
                            {entry.capaUrl ? (
                              <img
                                src={entry.capaUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BookOpen size={18} aria-hidden="true" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <b className="block truncate text-sm">{entry.titulo}</b>
                            <span className="text-muted block truncate text-xs">
                              {entry.autor ?? 'Autoria não informada'}
                            </span>
                            <span className="text-muted block text-xs">
                              {entry.codigoTombo
                                ? `Tombo ${entry.codigoTombo}`
                                : 'Exemplar a definir'}
                            </span>
                            {entry.error && (
                              <span className="block text-xs text-red-600">{entry.error}</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromBag(entry.key)}
                          >
                            Remover
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="grid gap-3 p-4 sm:p-5">
                <h2 className="font-semibold">Devolvidos agora ({returns.length})</h2>
                {returns.length === 0 ? (
                  <p className="text-muted text-sm">
                    Nenhuma devolução registrada ainda nesta sessão.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {returns.map((entry) => (
                      <li
                        key={entry.key}
                        className="flex items-center gap-3 rounded-lg border p-2 sm:p-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <b className="block truncate text-sm">{entry.titulo}</b>
                          <span className="text-muted block truncate text-xs">
                            {entry.codigoTombo ? `Tombo ${entry.codigoTombo}` : entry.message}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {mode === 'retirada' && (
          <Card className="h-fit">
            <CardContent className="grid gap-4 p-4 sm:p-5">
              <h2 className="font-semibold">Quem está retirando</h2>
              <div className="relative">
                <Input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Buscar Irmão pelo nome…"
                  disabled={Boolean(member)}
                />
                {memberSuggestions.length > 0 && (
                  <ul className="border-border bg-surface absolute z-10 mt-1 w-full rounded border shadow-md">
                    {memberSuggestions.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setMember(option);
                            setMemberQuery('');
                          }}
                          className="hover:bg-accent/10 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                        >
                          <span className="min-w-0 truncate">{option.nomeCompleto}</span>
                          {!option.temAcessoPortal && (
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              sem Portal
                            </Badge>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {member && (
                <div className="bg-accent/10 flex items-center justify-between gap-2 rounded-lg px-3 py-2">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {member.nomeCompleto}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    {!member.temAcessoPortal && (
                      <Badge variant="outline" className="text-[10px]">
                        sem Portal
                      </Badge>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMember(null)}>
                      Trocar
                    </Button>
                  </div>
                </div>
              )}
              {member && !member.temAcessoPortal && (
                <p className="text-muted text-xs">
                  {member.nomeCompleto} ainda não tem acesso ao Portal — o empréstimo fica
                  registrado normalmente, mas ele não vai conseguir acompanhar em &quot;Meus
                  empréstimos&quot; até fazer o cadastro.
                </p>
              )}

              <h2 className="mt-2 font-semibold">Datas</h2>
              <label className="grid gap-1 text-xs">
                Retirada
                <Input
                  type="date"
                  value={checkedOutAt}
                  onChange={(event) => setCheckedOutAt(event.target.value)}
                  max={todayIso()}
                />
              </label>
              <label className="grid gap-1 text-xs">
                Devolução prevista
                <Input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  min={checkedOutAt}
                />
              </label>

              <div className="bg-surface sticky bottom-2 z-20 -mx-1 grid gap-2 rounded-lg border p-2 shadow-lg lg:static lg:mx-0 lg:border-0 lg:p-0 lg:shadow-none">
                <Button
                  type="button"
                  className="h-12 w-full text-base"
                  disabled={!member || bag.length === 0 || pending}
                  onClick={confirmCheckout}
                >
                  {pending
                    ? 'Registrando…'
                    : `Confirmar retirada${bag.length ? ` de ${bag.length} obra(s)` : ''}`}
                </Button>
                {summary && (
                  <p className={`text-sm ${summary.failed ? 'text-amber-700' : 'text-green-700'}`}>
                    {summary.ok} empréstimo(s) registrado(s)
                    {summary.failed ? ` · ${summary.failed} com erro (veja a sacola)` : '.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

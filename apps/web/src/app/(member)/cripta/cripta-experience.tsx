'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

type Section = 'visao' | 'cartas' | 'arquivos' | 'video' | 'audios' | 'destinatarios' | 'saida';
type DraftFile = { id: string; file: File; kind: 'foto' | 'video' | 'audio'; url: string };
type Letter = { id: string; title: string; body: string };

const LIMIT = { foto: 5 * 1024 * 1024, video: 60 * 1024 * 1024, audio: 10 * 1024 * 1024 };
const MAX_TOTAL = 150 * 1024 * 1024;
const panels: { id: Section; title: string; description: string }[] = [
  { id: 'visao', title: 'Visão geral', description: 'O que poderá ser guardado' },
  { id: 'cartas', title: 'Cartas', description: 'Até 5 cartas escritas aqui' },
  { id: 'arquivos', title: 'Fotos', description: 'Até 10 fotografias' },
  { id: 'video', title: 'Apresentação', description: 'Um vídeo de até 1 minuto' },
  { id: 'audios', title: 'Áudios', description: 'Até 2 mensagens de voz' },
  { id: 'destinatarios', title: 'Destinatários', description: 'Quem poderá receber' },
  { id: 'saida', title: 'Quite-placet', description: 'Devolução e exclusão' },
];

const formatSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`;

export function CriptaExperience() {
  const [section, setSection] = useState<Section>('visao');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<DraftFile[]>([]);
  const [recipient, setRecipient] = useState('');
  const [instructions, setInstructions] = useState('');
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState<'video' | 'audio' | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    filesRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const used = files.reduce((sum, entry) => sum + entry.file.size, 0);
  const ofKind = (kind: DraftFile['kind']) => files.filter((entry) => entry.kind === kind);

  function acceptFile(file: File, kind: DraftFile['kind']) {
    const current = filesRef.current;
    const maxCount = kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1;
    if (current.filter((item) => item.kind === kind).length >= maxCount) {
      setMessage(`Limite de ${maxCount} arquivo(s) de ${kind}. Remova um antes de adicionar outro.`); return;
    }
    if (file.size > LIMIT[kind] || current.reduce((sum, item) => sum + item.file.size, 0) + file.size > MAX_TOTAL) {
      setMessage(`Arquivo acima do limite: ${kind} até ${formatSize(LIMIT[kind])}; total até 150 MB.`); return;
    }
    const valid = kind === 'foto' ? file.type.startsWith('image/') : file.type.startsWith(`${kind === 'video' ? 'video' : 'audio'}/`);
    if (!valid) { setMessage('Formato incompatível com esta área.'); return; }
    if (kind === 'video' || kind === 'audio') {
      const preview = document.createElement(kind);
      const tempUrl = URL.createObjectURL(file);
      preview.preload = 'metadata';
      preview.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        if (!Number.isFinite(preview.duration) || preview.duration > (kind === 'video' ? 60 : 180)) {
          setMessage(`Duração inválida: ${kind === 'video' ? 'vídeo até 1 minuto' : 'áudio até 3 minutos'}.`); return;
        }
        addLocal(file, kind);
      };
      preview.onerror = () => { URL.revokeObjectURL(tempUrl); setMessage('Não foi possível conferir a duração deste arquivo.'); };
      preview.src = tempUrl;
      return;
    }
    addLocal(file, kind);
  }

  function addLocal(file: File, kind: DraftFile['kind']) {
    const current = filesRef.current;
    const max = kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1;
    if (current.filter((entry) => entry.kind === kind).length >= max ||
        current.reduce((sum, entry) => sum + entry.file.size, 0) + file.size > MAX_TOTAL) {
      setMessage('Limite atingido; remova um arquivo antes de adicionar outro.'); return;
    }
    setFiles((items) => [...items, { id: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file) }]);
    setMessage('Adicionado à prévia local. O arquivo ainda não foi enviado ao servidor.');
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>, kind: DraftFile['kind']) {
    [...(event.target.files ?? [])].forEach((file) => acceptFile(file, kind));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, kind: DraftFile['kind']) {
    event.preventDefault();
    [...event.dataTransfer.files].forEach((file) => acceptFile(file, kind));
  }

  async function startRecording(kind: 'video' | 'audio') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Seu navegador não permite gravação nesta página. Escolha um arquivo existente.'); return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { audio: true, video: true } : { audio: true });
      const capture = new MediaRecorder(media);
      stream.current = media;
      recorder.current = capture;
      chunks.current = [];
      capture.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      capture.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        setRecording(null);
        const blob = new Blob(chunks.current, { type: capture.mimeType });
        if (blob.size && Date.now() - startedAt.current <= (kind === 'video' ? 61_000 : 181_000)) {
          acceptFile(new File([blob], `ensaio-${kind}.${kind === 'video' ? 'webm' : 'webm'}`, { type: capture.mimeType }), kind);
        }
      };
      startedAt.current = Date.now();
      capture.start(1000);
      setRecording(kind);
      timer.current = setTimeout(() => capture.state === 'recording' && capture.stop(), kind === 'video' ? 60_000 : 180_000);
    } catch { setMessage('Permissão de câmera ou microfone negada. Escolha um arquivo existente.'); }
  }

  function stopRecording() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  function saveLetter() {
    if (!title.trim() || !body.trim()) { setMessage('Preencha título e texto da carta.'); return; }
    if (body.length > 20_000) { setMessage('O texto ultrapassa 20 mil caracteres.'); return; }
    if (editingId) setLetters((entries) => entries.map((entry) => entry.id === editingId ? { ...entry, title: title.trim(), body: body.trim() } : entry));
    else if (letters.length < 5) setLetters((entries) => [...entries, { id: crypto.randomUUID(), title: title.trim(), body: body.trim() }]);
    else { setMessage('Limite de 5 cartas.'); return; }
    setEditingId(null); setTitle(''); setBody('');
    setMessage('Carta mantida apenas na memória desta aba para demonstrar a interface.');
  }

  function filePicker(kind: DraftFile['kind'], accept: string) {
    return <div className="space-y-4">
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, kind)} className="rounded-2xl border-2 border-dashed border-[#c9a449]/70 bg-[#c9a449]/5 p-7 text-center">
        <p className="font-medium">Arraste {kind === 'foto' ? 'fotos' : kind === 'video' ? 'um vídeo' : 'áudios'} aqui</p>
        <p className="mt-1 text-sm text-muted">ou selecione do computador ou celular</p>
        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-[#123c69] px-4 py-2 text-sm font-semibold text-white">Escolher arquivo<input type="file" accept={accept} multiple={kind !== 'video'} onChange={(event) => handleInput(event, kind)} className="sr-only" /></label>
      </div>
      {ofKind(kind).map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{entry.file.name}</p><p className="text-muted">{formatSize(entry.file.size)} · prévia local</p></div>
        {kind === 'foto' ? <img src={entry.url} alt="Prévia selecionada" className="h-16 w-16 rounded object-cover" /> : kind === 'video' ? <video controls src={entry.url} className="h-24 max-w-48" /> : <audio controls src={entry.url} className="max-w-56" />}
        <button type="button" className="rounded border px-3 py-2" onClick={() => { URL.revokeObjectURL(entry.url); setFiles((items) => items.filter((item) => item.id !== entry.id)); }}>Remover</button>
      </div>)}
    </div>;
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-14">
    <header className="rounded-3xl bg-gradient-to-br from-[#06172e] to-[#123c69] p-7 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3bd62]">Cripta do Irmão · apresentação restrita</p>
      <h1 className="mt-3 font-serif text-4xl">Um lugar para preservar sua mensagem</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">Veja como será criar cartas, reunir memórias e escolher seus destinatários. Cada etapa tem seu próprio espaço.</p>
    </header>
    <div role="alert" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Protótipo: use somente conteúdo inventado.</strong> Cartas e arquivos desta tela permanecem temporariamente nesta aba. Não há envio, salvamento, criptografia destas prévias nem recuperação após fechar ou recarregar a página. A Cripta real ainda não está habilitada.</div>
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-[#c9a449] bg-card p-3 text-sm">{message}</p>}
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <nav aria-label="Áreas da Cripta" className="flex gap-2 overflow-x-auto lg:flex-col">
        {panels.map((panel) => <button type="button" key={panel.id} onClick={() => setSection(panel.id)} aria-current={section === panel.id ? 'page' : undefined} className={`min-w-40 rounded-xl border p-3 text-left text-sm lg:min-w-0 ${section === panel.id ? 'border-[#c9a449] bg-[#0a2547] text-white' : 'bg-card'}`}><span className="block font-semibold">{panel.title}</span><span className={`mt-1 block text-xs ${section === panel.id ? 'text-slate-200' : 'text-muted'}`}>{panel.description}</span></button>)}
      </nav>
      <main className="min-h-96 rounded-2xl border bg-card p-5 sm:p-8">
        {section === 'visao' && <><h2 className="font-serif text-3xl">Minha Cripta</h2><p className="mt-3 text-sm leading-7 text-muted">Nesta prévia, você pode experimentar cada área. Nada será enviado ou preservado.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{panels.slice(1, 6).map((panel) => <button type="button" key={panel.id} onClick={() => setSection(panel.id)} className="rounded-xl border p-5 text-left hover:border-[#c9a449]"><strong>{panel.title}</strong><p className="mt-1 text-sm text-muted">{panel.description}</p></button>)}</div><p className="mt-6 text-sm">Espaço selecionado: <strong>{formatSize(used)} de 150 MB</strong> · {letters.length} de 5 cartas</p></>}
        {section === 'cartas' && <><h2 className="font-serif text-3xl">Minhas cartas</h2><p className="mt-2 text-sm text-muted">Escreva uma carta no computador ou celular. Até 5 cartas, com 20 mil caracteres cada.</p><label htmlFor="cripta-title" className="mt-6 block text-sm font-semibold">Título</label><input id="cripta-title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" /><label htmlFor="cripta-body" className="mt-4 block text-sm font-semibold">Texto da carta</label><textarea id="cripta-body" maxLength={20_000} rows={9} value={body} onChange={(event) => setBody(event.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" /><p className="text-right text-xs text-muted">{body.length}/20.000 caracteres</p><button type="button" onClick={saveLetter} className="mt-3 rounded-lg bg-[#123c69] px-5 py-2 text-sm font-semibold text-white">{editingId ? 'Atualizar prévia' : 'Adicionar à prévia'}</button><div className="mt-6 space-y-2">{letters.map((letter) => <div key={letter.id} className="flex items-center justify-between rounded-xl border p-4"><span className="truncate font-medium">{letter.title}</span><div className="flex gap-3 text-sm"><button type="button" onClick={() => { setEditingId(letter.id); setTitle(letter.title); setBody(letter.body); }}>Editar</button><button type="button" onClick={() => { setLetters((items) => items.filter((item) => item.id !== letter.id)); if (editingId === letter.id) { setEditingId(null); setTitle(''); setBody(''); } }}>Remover</button></div></div>)}</div></>}
        {section === 'arquivos' && <><h2 className="font-serif text-3xl">Minhas fotos</h2><p className="mb-6 mt-2 text-sm text-muted">Até 10 fotos de 5 MB cada. Validação completa de segurança será necessária antes do envio real.</p>{filePicker('foto', 'image/*')}</>}
        {section === 'video' && <><h2 className="font-serif text-3xl">Minha apresentação</h2><p className="mt-2 text-sm text-muted">Um vídeo de até 1 minuto e 60 MB. Escolha um vídeo ou grave uma mensagem de teste.</p><button type="button" disabled={recording !== null || ofKind('video').length > 0} onClick={() => startRecording('video')} className="my-5 rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Gravar vídeo</button>{recording === 'video' && <button type="button" onClick={stopRecording} className="ml-3 rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Parar gravação</button>}{filePicker('video', 'video/*')}</>}
        {section === 'audios' && <><h2 className="font-serif text-3xl">Minhas mensagens de voz</h2><p className="mt-2 text-sm text-muted">Até 2 áudios de 3 minutos e 10 MB cada. Revise ouvindo a prévia antes de sair.</p><button type="button" disabled={recording !== null || ofKind('audio').length >= 2} onClick={() => startRecording('audio')} className="my-5 rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Gravar áudio</button>{recording === 'audio' && <button type="button" onClick={stopRecording} className="ml-3 rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Parar gravação</button>}{filePicker('audio', 'audio/*')}</>}
        {section === 'destinatarios' && <><h2 className="font-serif text-3xl">Destinatários e instruções</h2><p className="mt-2 text-sm leading-7 text-muted">A versão futura permitirá definir quem pode receber cada item e como a Loja deverá proceder. Esta prévia não registra nomes nem envia mensagens.</p><label htmlFor="recipient" className="mt-6 block text-sm font-semibold">Destinatário fictício para testar a tela</label><input id="recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="Ex.: Pessoa de teste" className="mt-1 w-full rounded-lg border bg-background p-3" /><label htmlFor="instructions" className="mt-4 block text-sm font-semibold">Orientações fictícias</label><textarea id="instructions" rows={4} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" /><p className="mt-3 text-xs text-muted">Estas informações são descartadas ao fechar ou atualizar a página.</p></>}
        {section === 'saida' && <><h2 className="font-serif text-3xl">Saída da Loja</h2><p className="mt-3 text-sm leading-7">Com o quite-placet confirmado, a Cripta individual ficará bloqueada para novas alterações. O irmão poderá optar pela devolução de seu conteúdo em pacote cifrado ou solicitar a exclusão, conforme o procedimento institucional aprovado.</p><ol className="mt-6 list-inside list-decimal space-y-3 text-sm leading-6"><li>Confirmar a identidade e o desligamento.</li><li>Preparar apenas o conteúdo do irmão e conferir a leitura da devolução.</li><li>Revogar acessos e retirar o conteúdo das cópias online e físicas, com conferência documentada.</li></ol><p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Este processo ainda é um conceito. Nenhum botão nesta página solicita quite-placet ou executa exclusão.</p></>}
      </main>
    </div>
    <p className="text-xs leading-6 text-muted">A área técnica de cifra, chaves e ensaios permanece separada no Laboratório V1. Limites exibidos são propostas para validação. Nesta página, arquivos escolhidos ficam na memória local e não constituem backup.</p>
  </div>;
}

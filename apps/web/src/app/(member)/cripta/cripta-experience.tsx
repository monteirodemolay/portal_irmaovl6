'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { decodeLetter, encodeLetter, openCapsule, sealCapsule } from '@/modules/cripta/lib/sealed-capsule';

type Section = 'visao' | 'cartas' | 'arquivos' | 'video' | 'audios' | 'destinatarios';
type DraftFile = { id: string; file: File; kind: 'foto' | 'video' | 'audio'; url: string; letterId: string };
type Letter = { id: string; title: string; body: string; recipient: string };

const LIMIT = { foto: 5 * 1024 * 1024, video: 60 * 1024 * 1024, audio: 10 * 1024 * 1024 };
const MAX_TOTAL = 150 * 1024 * 1024;
const panels: { id: Section; title: string; description: string }[] = [
  { id: 'visao', title: 'Visão geral', description: 'O que poderá ser guardado' },
  { id: 'cartas', title: 'Cartas', description: 'Até 5 cartas escritas aqui' },
  { id: 'arquivos', title: 'Fotos', description: 'Até 10 fotos por carta' },
  { id: 'video', title: 'Apresentação', description: 'Um vídeo de até 1 minuto' },
  { id: 'audios', title: 'Áudios', description: 'Até 2 mensagens de voz' },
  { id: 'destinatarios', title: 'Destinatários', description: 'Quem recebe cada carta' },
];

const formatSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`;

export function CriptaExperience() {
  const [section, setSection] = useState<Section>('visao');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [letterRecipient, setLetterRecipient] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearPhrase, setClearPhrase] = useState('');
  const [files, setFiles] = useState<DraftFile[]>([]);
  const [message, setMessage] = useState('');
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [working, setWorking] = useState(false);
  const [recording, setRecording] = useState<'video' | 'audio' | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discardRecording = useRef(false);
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
  const selectedLetter = letters.find((entry) => entry.id === selectedLetterId);

  async function exportSealedLetter(letter: Letter) {
    if (exportPassphrase.length < 16 || working) { setMessage('Informe uma frase secreta com pelo menos 16 caracteres.'); return; }
    setWorking(true);
    try {
      const envelope = await sealCapsule(encodeLetter(letter), exportPassphrase);
      const url = URL.createObjectURL(new Blob([JSON.stringify(envelope)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `cripta-carta-ensaio-${letter.id}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage('Carta fictícia exportada cifrada. Guarde a frase separadamente e teste a restauração em outro dispositivo. Anexos não estão incluídos.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível cifrar a carta.');
    } finally { setExportPassphrase(''); setWorking(false); }
  }

  async function importSealedLetter(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || working) return;
    if (file.size > 1_500_000 || importPassphrase.length < 16) {
      setMessage('Selecione um pacote de até 1,5 MB e informe a frase secreta de pelo menos 16 caracteres.'); return;
    }
    setWorking(true);
    try {
      const value: unknown = JSON.parse(await file.text());
      const letter = decodeLetter(await openCapsule(value, importPassphrase));
      if (!letter.title.trim() || letter.title.length > 80 || !letter.body.trim() || letter.body.length > 20_000 ||
          !letter.recipient.trim() || letter.recipient.length > 100 || letters.length >= 5) {
        throw new Error('Carta inválida ou limite de cinco cartas atingido.');
      }
      const id = crypto.randomUUID();
      setLetters((items) => [...items, { ...letter, id }]);
      setSelectedLetterId(id);
      setSection('cartas');
      setMessage('Carta fictícia restaurada nesta aba. Nenhum dado foi enviado ao servidor.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível restaurar o pacote.');
    } finally { setImportPassphrase(''); setWorking(false); }
  }

  function clearLocalPreview() {
    if (clearPhrase !== 'APAGAR') return;
    discardRecording.current = true;
    stopRecording();
    files.forEach((entry) => URL.revokeObjectURL(entry.url));
    setFiles([]); setLetters([]); setSelectedLetterId(null); setEditingId(null);
    setTitle(''); setBody(''); setLetterRecipient('');
    setConfirmClear(false); setClearPhrase('');
    setMessage('Prévia local limpa. Este ensaio não apaga dados do servidor ou cópias físicas.');
  }

  function downloadLetterImage(letter: Letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 1680;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const lines: string[] = [];
    ctx.font = '31px Georgia, serif';
    for (const paragraph of letter.body.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > 980 && line) { lines.push(line); line = word; }
        else line = next;
      }
      lines.push(line);
    }
    const perPage = 29;
    const pages = Math.max(1, Math.ceil(lines.length / perPage));
    for (let page = 0; page < pages; page++) {
      ctx.fillStyle = '#f8f1e4'; ctx.fillRect(0, 0, 1200, 1680);
      ctx.strokeStyle = '#b69a62'; ctx.lineWidth = 3; ctx.strokeRect(72, 72, 1056, 1536);
      ctx.strokeStyle = '#e0cfab'; ctx.strokeRect(86, 86, 1028, 1508);
      ctx.fillStyle = '#927035'; ctx.textAlign = 'center'; ctx.font = '24px Georgia, serif';
      ctx.fillText('CRIPTA DO IRMÃO  ·  PRÉVIA FICTÍCIA', 600, 150);
      ctx.fillStyle = '#26344a'; ctx.font = 'bold 46px Georgia, serif';
      ctx.fillText(letter.title.slice(0, 42), 600, 244);
      ctx.fillStyle = '#927035'; ctx.font = '25px Georgia, serif';
      ctx.fillText(`Para ${letter.recipient.slice(0, 55)}`, 600, 290);
      ctx.textAlign = 'left'; ctx.font = '31px Georgia, serif';
      lines.slice(page * perPage, (page + 1) * perPage).forEach((line, index) => ctx.fillText(line, 112, 330 + index * 42));
      ctx.textAlign = 'center'; ctx.font = '22px Georgia, serif'; ctx.fillStyle = '#927035';
      ctx.fillText(`Página ${page + 1} de ${pages}  ·  Não armazenada no Portal`, 600, 1550);
      const link = document.createElement('a');
      link.download = `carta-ficticia-${page + 1}.png`;
      link.href = canvas.toDataURL('image/png'); link.click();
    }
  }

  function acceptFile(file: File, kind: DraftFile['kind']) {
    const current = filesRef.current;
    if (!selectedLetterId || !letters.some((letter) => letter.id === selectedLetterId)) {
      setMessage('Escolha ou escreva primeiro a carta à qual esta mídia pertence.'); return;
    }
    const maxCount = kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1;
    if (current.filter((item) => item.kind === kind && (kind !== 'foto' || item.letterId === selectedLetterId)).length >= maxCount) {
      setMessage(`Limite de ${maxCount} arquivo(s) de ${kind}. Remova um antes de adicionar outro.`); return;
    }
    if (file.size > LIMIT[kind] || current.reduce((sum, item) => sum + item.file.size, 0) + file.size > MAX_TOTAL) {
      setMessage(`Arquivo acima do limite: ${kind} até ${formatSize(LIMIT[kind])}; total até 150 MB.`); return;
    }
    const valid = kind === 'foto' ? file.type.startsWith('image/') : file.type.startsWith(`${kind === 'video' ? 'video' : 'audio'}/`);
    if (!valid) { setMessage('Formato incompatível com esta área.'); return; }
    const targetLetterId = selectedLetterId;
    if (kind === 'video' || kind === 'audio') {
      const preview = document.createElement(kind);
      const tempUrl = URL.createObjectURL(file);
      preview.preload = 'metadata';
      preview.onloadedmetadata = () => {
        URL.revokeObjectURL(tempUrl);
        if (!Number.isFinite(preview.duration) || preview.duration > (kind === 'video' ? 60 : 180)) {
          setMessage(`Duração inválida: ${kind === 'video' ? 'vídeo até 1 minuto' : 'áudio até 3 minutos'}.`); return;
        }
        addLocal(file, kind, targetLetterId);
      };
      preview.onerror = () => { URL.revokeObjectURL(tempUrl); setMessage('Não foi possível conferir a duração deste arquivo.'); };
      preview.src = tempUrl;
      return;
    }
    addLocal(file, kind, targetLetterId);
  }

  function addLocal(file: File, kind: DraftFile['kind'], targetLetterId: string | null) {
    const current = filesRef.current;
    const max = kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1;
    if (!targetLetterId || !letters.some((letter) => letter.id === targetLetterId)) {
      setMessage('Selecione uma carta antes de adicionar a mídia.'); return;
    }
    if (current.filter((entry) => entry.kind === kind && (kind !== 'foto' || entry.letterId === targetLetterId)).length >= max ||
        current.reduce((sum, entry) => sum + entry.file.size, 0) + file.size > MAX_TOTAL) {
      setMessage('Limite atingido; remova um arquivo antes de adicionar outro.'); return;
    }
    const next = [...current, { id: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file), letterId: targetLetterId }];
    filesRef.current = next;
    setFiles(next);
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
      const targetLetterId = selectedLetterId;
      const capture = new MediaRecorder(media);
      stream.current = media;
      recorder.current = capture;
      chunks.current = [];
      capture.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      capture.onstop = () => {
        media.getTracks().forEach((track) => track.stop());
        setRecording(null);
        const blob = new Blob(chunks.current, { type: capture.mimeType });
        if (discardRecording.current) return;
        if (blob.size && blob.size <= LIMIT[kind] && Date.now() - startedAt.current <= (kind === 'video' ? 61_000 : 181_000)) {
          // O próprio temporizador limitou a gravação; alguns WebM gravados
          // pelo navegador apresentam duração indefinida nos metadados.
          addLocal(new File([blob], `ensaio-${kind}.webm`, { type: capture.mimeType }), kind, targetLetterId);
        } else if (blob.size) {
          setMessage('A gravação ultrapassou o limite de tempo ou tamanho. Grave novamente.');
        }
      };
      startedAt.current = Date.now();
      discardRecording.current = false;
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
    if (!letterRecipient.trim()) { setMessage('Informe um destinatário fictício para esta carta.'); return; }
    if (editingId) { setLetters((entries) => entries.map((entry) => entry.id === editingId ? { ...entry, title: title.trim(), body: body.trim(), recipient: letterRecipient.trim() } : entry)); setSelectedLetterId(editingId); }
    else if (letters.length < 5) { const id = crypto.randomUUID(); setLetters((entries) => [...entries, { id, title: title.trim(), body: body.trim(), recipient: letterRecipient.trim() }]); setSelectedLetterId(id); }
    else { setMessage('Limite de 5 cartas.'); return; }
    setEditingId(null); setTitle(''); setBody(''); setLetterRecipient('');
    setMessage('Carta mantida apenas na memória desta aba para demonstrar a interface.');
  }

  function filePicker(kind: DraftFile['kind'], accept: string) {
    return <div className="space-y-4">
      <label htmlFor={`attach-${kind}`} className="block text-sm font-semibold text-[#142a43]">Vincular à carta</label>
      <select id={`attach-${kind}`} value={selectedLetterId ?? ''} onChange={(event) => setSelectedLetterId(event.target.value || null)} className="w-full rounded-xl border border-[#dbcda9] bg-white p-3 text-sm">
        <option value="">Selecione uma carta</option>
        {letters.map((letter) => <option key={letter.id} value={letter.id}>{letter.title} — para {letter.recipient}</option>)}
      </select>
      {!letters.length && <p className="text-sm text-[#8a6330]">Crie uma carta antes de adicionar mídias.</p>}
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, kind)} className="rounded-2xl border-2 border-dashed border-[#c9a449]/70 bg-[radial-gradient(circle_at_top,#fffdf7,#f2ebdb)] p-9 text-center shadow-inner">
        <p className="font-medium">Arraste {kind === 'foto' ? 'fotos' : kind === 'video' ? 'um vídeo' : 'áudios'} aqui</p>
        <p className="mt-1 text-sm text-muted">ou selecione do computador ou celular</p>
        <label className="mt-4 inline-block cursor-pointer rounded-lg bg-[#123c69] px-4 py-2 text-sm font-semibold text-white">Escolher arquivo<input type="file" accept={accept} multiple={kind !== 'video'} onChange={(event) => handleInput(event, kind)} className="sr-only" /></label>
      </div>
      {ofKind(kind).filter((entry) => entry.letterId === selectedLetterId).map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbcda9] bg-white p-3 text-sm">
        <div className="min-w-0 flex-1"><p className="truncate font-medium">{entry.file.name}</p><p className="text-muted">{formatSize(entry.file.size)} · anexo da carta · prévia local</p></div>
        {kind === 'foto' ? <img src={entry.url} alt="Prévia selecionada" className="h-16 w-16 rounded object-cover" /> : kind === 'video' ? <video controls src={entry.url} className="h-24 max-w-48" /> : <audio controls src={entry.url} className="max-w-56" />}
        <button type="button" className="rounded border px-3 py-2" onClick={() => { URL.revokeObjectURL(entry.url); setFiles((items) => items.filter((item) => item.id !== entry.id)); }}>Remover</button>
      </div>)}
    </div>;
  }

  return <div className="mx-auto max-w-6xl space-y-6 pb-14">
    <header className="relative overflow-hidden rounded-[2rem] border border-[#b99b5c]/40 bg-[radial-gradient(ellipse_at_75%_10%,#344d67_0%,#112640_43%,#06172e_100%)] p-8 text-white shadow-[0_24px_65px_-35px_#06172e] sm:p-12">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border border-[#c9a449]/20 shadow-[0_0_0_35px_#c9a44908,0_0_0_75px_#c9a44908]" />
      <div className="relative max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.25em] text-[#e3bd62]">Cripta do Irmão · espaço pessoal</p>
      <h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">Há memórias que merecem atravessar o tempo.</h1>
      <div className="mt-5 h-px w-24 bg-[#c9a449]" /><p className="mt-5 text-sm leading-7 text-slate-200">Escreva suas cartas. Reúna imagens e mensagens em sua própria voz. Escolha quem deverá recebê-las no futuro.</p></div>
    </header>
    <div role="alert" className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Protótipo: use somente conteúdo inventado.</strong> As cartas e mídias desta aba não são salvas no servidor. É possível exportar uma carta cifrada para testar restauração offline; os anexos continuam fora desse arquivo. A Cripta real ainda não está habilitada.</div>
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-[#c9a449] bg-card p-3 text-sm">{message}</p>}
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <nav aria-label="Áreas da Cripta" className="flex gap-2 overflow-x-auto lg:flex-col">
        {panels.map((panel, index) => <button type="button" key={panel.id} onClick={() => setSection(panel.id)} aria-current={section === panel.id ? 'page' : undefined} className={`min-w-40 rounded-2xl border p-4 text-left text-sm shadow-sm transition-colors lg:min-w-0 ${section === panel.id ? 'border-[#c9a449] bg-[#0a2547] text-white shadow-[#0a2547]/20' : 'border-[#d9c9a8]/50 bg-[#f7f3ea] hover:border-[#c9a449]'}`}><span className={`mb-2 block font-serif text-xl ${section === panel.id ? 'text-[#e3bd62]' : 'text-[#a48242]'}`}>{String(index + 1).padStart(2, '0')}</span><span className="block font-semibold">{panel.title}</span><span className={`mt-1 block text-xs ${section === panel.id ? 'text-slate-200' : 'text-muted'}`}>{panel.description}</span></button>)}
      </nav>
      <main className="min-h-96 rounded-[2rem] border border-[#dbcda9] bg-[#fbf8f1] p-5 shadow-[0_22px_60px_-45px_#06172e] sm:p-9">
        {section === 'visao' && <><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Seu espaço de memórias</p><h2 className="mt-2 font-serif text-4xl text-[#142a43]">Minha Cripta</h2><p className="mt-3 text-sm leading-7 text-[#536074]">Cada lembrança tem seu lugar. Explore as áreas abaixo e veja como será preparar a sua mensagem.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{panels.slice(1).map((panel, index) => <button type="button" key={panel.id} onClick={() => setSection(panel.id)} className="group rounded-2xl border border-[#d7c9a9] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#ac8740] hover:shadow-md"><span className="font-serif text-3xl text-[#ae8c4d]">{['✉', '▧', '▷', '♫', '✧'][index]}</span><strong className="mt-3 block font-serif text-xl text-[#172e47]">{panel.title}</strong><p className="mt-1 text-sm text-[#5c6775]">{panel.description}</p></button>)}</div><div className="mt-8 rounded-2xl border border-[#d7c9a9] bg-white p-5 text-sm text-[#243449]"><p>Espaço selecionado: <strong>{formatSize(used)} de 150 MB</strong> · {letters.length} de 5 cartas</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ece8dd]"><div className="h-full rounded-full bg-[#c9a449]" style={{ width: `${Math.min(100, used / MAX_TOTAL * 100)}%` }} /></div></div><div className="mt-8 border-t border-[#d7c9a9] pt-6"><h3 className="font-serif text-xl text-[#142a43]">Limpar minha Cripta</h3><p className="mt-2 text-sm leading-6 text-[#5c6775]">Na versão operacional, o irmão poderá solicitar a exclusão de todo o próprio conteúdo durante a janela de abertura. Neste ensaio, o botão limpa apenas as prévias desta aba.</p>{!confirmClear ? <button type="button" onClick={() => setConfirmClear(true)} className="mt-4 rounded-lg border border-red-700/60 px-4 py-2 text-sm font-semibold text-red-800">Excluir todas as prévias</button> : <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4"><label htmlFor="clear-confirm" className="block text-sm font-semibold text-red-900">Para confirmar, digite APAGAR</label><input id="clear-confirm" autoComplete="off" value={clearPhrase} onChange={(event) => setClearPhrase(event.target.value)} className="mt-2 w-full max-w-64 rounded border border-red-300 bg-white p-2" /><div className="mt-3 flex gap-3"><button type="button" disabled={clearPhrase !== 'APAGAR'} onClick={clearLocalPreview} className="rounded-lg bg-red-800 px-4 py-2 text-sm text-white disabled:opacity-40">Limpar prévia local</button><button type="button" onClick={() => { setConfirmClear(false); setClearPhrase(''); }} className="rounded-lg border px-4 py-2 text-sm">Cancelar</button></div></div>}</div></>}
        {section === 'cartas' && <>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Uma mensagem, um destinatário</p>
          <h2 className="mt-2 font-serif text-4xl text-[#142a43]">Cartas e lembranças</h2>
          <p className="mt-3 text-sm leading-7 text-[#536074]">Cada carta reúne sua mensagem, um destinatário e até 10 fotografias. Vídeos e áudios também poderão ser vinculados à carta.</p>
          <div className="mt-7 rounded-2xl border border-[#dbcda9] bg-white p-5 shadow-sm">
            <label htmlFor="cripta-title" className="block text-sm font-semibold">Título da carta</label>
            <input id="cripta-title" maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Uma mensagem para o futuro" className="mt-2 w-full rounded-lg border bg-background p-3" />
            <label htmlFor="cripta-recipient" className="mt-5 block text-sm font-semibold">Para quem será esta carta?</label>
            <input id="cripta-recipient" maxLength={100} value={letterRecipient} onChange={(event) => setLetterRecipient(event.target.value)} placeholder="Use um nome inventado neste ensaio" className="mt-2 w-full rounded-lg border bg-background p-3" />
            <label htmlFor="cripta-body" className="mt-5 block text-sm font-semibold">Sua mensagem</label>
            <textarea id="cripta-body" maxLength={20_000} rows={9} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Comece a escrever sua carta fictícia..." className="mt-2 w-full rounded-lg border bg-background p-3 leading-7" />
            <p className="mt-2 text-right text-xs text-muted">{body.length}/20.000 caracteres</p>
            <button type="button" onClick={saveLetter} className="mt-3 rounded-lg bg-[#123c69] px-5 py-3 text-sm font-semibold text-white">{editingId ? 'Atualizar carta' : 'Concluir carta e visualizar'}</button>
          </div>
          <div className="mt-6 rounded-2xl border border-[#dbcda9] bg-[#f5eedf] p-5"><h3 className="font-serif text-xl text-[#142a43]">Ensaio de recuperação de carta</h3><p className="mt-2 text-sm leading-6 text-[#536074]">Crie uma carta fictícia, escolha uma frase longa, baixe o pacote cifrado e abra-o neste ou em outro aparelho. A frase não é enviada ao portal. Fotos, áudio e vídeo não fazem parte deste ensaio.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Frase para exportar<input type="password" autoComplete="new-password" value={exportPassphrase} onChange={(event) => setExportPassphrase(event.target.value)} className="mt-2 w-full rounded-lg border bg-white p-3" /></label><label className="text-sm font-semibold">Frase para restaurar<input type="password" autoComplete="off" value={importPassphrase} onChange={(event) => setImportPassphrase(event.target.value)} className="mt-2 w-full rounded-lg border bg-white p-3" /></label></div><label className="mt-4 inline-block cursor-pointer rounded-lg border border-[#b99552] bg-white px-4 py-2 text-sm font-semibold">Abrir pacote cifrado<input type="file" accept=".json,application/json" onChange={importSealedLetter} disabled={working} className="sr-only" /></label></div>
          <div className="mt-8 space-y-3">{letters.map((letter) => <div key={letter.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dbcda9] bg-white p-4">
            <button type="button" onClick={() => setSelectedLetterId(letter.id)} className="min-w-0 text-left font-serif text-lg text-[#142a43] hover:underline">✉ &nbsp;{letter.title}<span className="block pl-8 font-sans text-xs text-muted">Para {letter.recipient} · {files.filter((entry) => entry.letterId === letter.id).length} anexo(s)</span></button>
            <div className="flex gap-3 text-sm"><button type="button" disabled={working} onClick={() => exportSealedLetter(letter)} className="font-semibold text-[#123c69] disabled:opacity-50">Baixar cifrada</button><button type="button" onClick={() => { setEditingId(letter.id); setTitle(letter.title); setBody(letter.body); setLetterRecipient(letter.recipient); setSelectedLetterId(letter.id); }}>Editar</button><button type="button" onClick={() => {
              files.filter((entry) => entry.letterId === letter.id).forEach((entry) => URL.revokeObjectURL(entry.url));
              setFiles((items) => items.filter((entry) => entry.letterId !== letter.id));
              setLetters((items) => items.filter((item) => item.id !== letter.id));
              if (selectedLetterId === letter.id) setSelectedLetterId(null);
              if (editingId === letter.id) { setEditingId(null); setTitle(''); setBody(''); setLetterRecipient(''); }
            }}>Remover</button></div>
          </div>)}</div>
          {selectedLetter && <div className="mt-8"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-serif text-xl text-[#142a43]">Prévia da carta</h3><button type="button" onClick={() => downloadLetterImage(selectedLetter)} className="rounded-lg border border-[#b99552] bg-white px-4 py-2 text-sm font-semibold text-[#142a43]">Baixar imagem PNG da carta</button></div>
            <article className="relative mx-auto max-w-2xl border border-[#ccb682] bg-[#f8f1e4] p-7 text-[#26344a] shadow-[0_16px_35px_-20px_#45351c] sm:p-12"><div className="pointer-events-none absolute inset-3 border border-[#dfcfac]" /><div className="relative"><p className="text-center text-[10px] font-semibold uppercase tracking-[.2em] text-[#94733c]">Cripta do Irmão · Prévia fictícia</p><div className="mx-auto mt-4 h-px w-16 bg-[#c9a449]" /><h4 className="mt-7 break-words text-center font-serif text-3xl">{selectedLetter.title}</h4><p className="mt-5 text-sm text-[#927035]">Para {selectedLetter.recipient}</p><p className="mt-7 whitespace-pre-wrap break-words font-serif text-base leading-8">{selectedLetter.body}</p>
              {files.some((entry) => entry.kind === 'foto' && entry.letterId === selectedLetter.id) && <div className="mt-9 grid grid-cols-2 gap-3 border-t border-[#dfcfac] pt-6 sm:grid-cols-3">{files.filter((entry) => entry.kind === 'foto' && entry.letterId === selectedLetter.id).map((entry) => <img key={entry.id} src={entry.url} alt="Foto anexa à carta fictícia" className="aspect-square w-full rounded object-cover" />)}</div>}
              <p className="mt-10 text-center text-xs text-[#927035]">Esta visualização não foi armazenada no Portal</p></div></article>
            <p className="mt-3 text-xs text-muted">O PNG contém somente o texto. Fotos, áudio e vídeo permanecem como anexos separados nesta prévia.</p>
          </div>}
        </>}
        {section === 'arquivos' && <><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Fotografias e lembranças</p><h2 className="mt-2 font-serif text-4xl text-[#142a43]">Fotos da carta</h2><p className="mb-6 mt-3 text-sm leading-7 text-muted">Escolha uma carta e acrescente até 10 fotos de 5 MB cada. Elas acompanharão aquela mensagem e terão o mesmo destinatário.</p>{filePicker('foto', 'image/*')}</>}
        {section === 'video' && <><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Sua presença em imagem</p><h2 className="mt-2 font-serif text-4xl text-[#142a43]">Apresentação em vídeo</h2><p className="mt-3 text-sm leading-7 text-muted">Um vídeo de até 1 minuto e 60 MB, vinculado à carta escolhida. Escolha um vídeo ou grave uma mensagem de teste.</p><button type="button" disabled={recording !== null || ofKind('video').length > 0 || !selectedLetterId} onClick={() => startRecording('video')} className="my-5 rounded-lg border border-[#b99552] bg-white px-4 py-2 text-sm disabled:opacity-50">Gravar vídeo</button>{recording === 'video' && <button type="button" onClick={stopRecording} className="ml-3 rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Parar gravação</button>}{filePicker('video', 'video/*')}</>}
        {section === 'audios' && <><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Sua voz preservada</p><h2 className="mt-2 font-serif text-4xl text-[#142a43]">Mensagens de voz</h2><p className="mt-3 text-sm leading-7 text-muted">Até 2 áudios de 3 minutos e 10 MB cada, vinculados à carta escolhida. Revise ouvindo a prévia.</p><button type="button" disabled={recording !== null || ofKind('audio').length >= 2 || !selectedLetterId} onClick={() => startRecording('audio')} className="my-5 rounded-lg border border-[#b99552] bg-white px-4 py-2 text-sm disabled:opacity-50">Gravar áudio</button>{recording === 'audio' && <button type="button" onClick={stopRecording} className="ml-3 rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Parar gravação</button>}{filePicker('audio', 'audio/*')}</>}
        {section === 'destinatarios' && <><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#96763c]">Entrega individual</p><h2 className="mt-2 font-serif text-4xl text-[#142a43]">A quem se destina</h2><p className="mt-3 text-sm leading-7 text-muted">O destinatário é escolhido em cada carta. Na versão operacional, será necessário confirmar sua identidade e definir uma forma de abertura que não entregue à Loja a chave de leitura.</p><div className="mt-7 space-y-3">{letters.map((letter) => <div key={letter.id} className="rounded-xl border border-[#dbcda9] bg-white p-5"><h3 className="font-serif text-xl text-[#142a43]">{letter.title}</h3><p className="mt-2 text-sm">Destinatário da prévia: <strong>{letter.recipient}</strong></p><p className="mt-1 text-xs text-muted">{files.filter((entry) => entry.letterId === letter.id).length} arquivo(s) vinculado(s)</p><button type="button" onClick={() => { setSection('cartas'); setEditingId(letter.id); setTitle(letter.title); setBody(letter.body); setLetterRecipient(letter.recipient); setSelectedLetterId(letter.id); }} className="mt-3 text-sm font-semibold text-[#123c69] underline">Alterar destinatário</button></div>)}{!letters.length && <p className="rounded-xl border border-[#dbcda9] bg-white p-5 text-sm">Escreva sua primeira carta para definir um destinatário.</p>}</div></>}
      </main>
    </div>
    <p className="text-xs leading-6 text-muted">A área técnica de cifra, chaves e ensaios permanece separada no Laboratório V1. Limites exibidos são propostas para validação. Nesta página, arquivos escolhidos ficam na memória local e não constituem backup.</p>
  </div>;
}

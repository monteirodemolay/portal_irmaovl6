'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { openCapsule, sealCapsule } from '@/modules/cripta/lib/sealed-capsule';

type Kind = 'foto' | 'audio' | 'video';
type Attachment = { id: string; file: File; kind: Kind; url: string };
type Letter = { id: string; title: string; recipient: string; body: string; attachments: Attachment[] };
type Step = 'inicio' | 'escrever' | 'revisar';

const LIMIT = { foto: 5 * 1024 * 1024, audio: 10 * 1024 * 1024, video: 60 * 1024 * 1024 };
const MAX_TOTAL = 150 * 1024 * 1024;
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const TEST_BYTES = 650_000;

function toBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}

async function testPayload(letter: { title: string; recipient: string; body: string; attachments: Attachment[] }): Promise<Uint8Array> {
  if (letter.attachments.reduce((sum, item) => sum + item.file.size, 0) > TEST_BYTES) {
    throw new Error('Neste primeiro ensaio conectado, os anexos juntos devem ter até 650 KB. Use uma imagem pequena ou teste apenas o texto.');
  }
  const items = await Promise.all(letter.attachments.map(async (item) => ({
    kind: item.kind, name: item.file.name.slice(0, 120), type: item.file.type,
    data: toBase64(new Uint8Array(await item.file.arrayBuffer())),
  })));
  const bytes = new TextEncoder().encode(JSON.stringify({ format: 'vl6-fictional-test-v1',
    title: letter.title, recipient: letter.recipient, body: letter.body, attachments: items }));
  if (bytes.length > 1_000_000) throw new Error('Pacote de ensaio acima de 1 MB.');
  return bytes;
}

export function CriptaExperience() {
  const [step, setStep] = useState<Step>('inicio');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [remote, setRemote] = useState<Array<{ id: string; createdAt: string; expiresAt: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState<Kind | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const lettersRef = useRef(letters);
  lettersRef.current = letters;

  useEffect(() => {
    fetch('/api/cripta/test-capsules', { cache: 'no-store' }).then(async (response) => {
      if (response.ok) setRemote((await response.json() as { items: typeof remote }).items);
    }).catch(() => { /* UI can still be explored without the service */ });
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    lettersRef.current.forEach((letter) => letter.attachments.forEach((item) => URL.revokeObjectURL(item.url)));
  }, []);

  const count = (kind: Kind) => attachments.filter((item) => item.kind === kind).length;
  const total = attachments.reduce((sum, item) => sum + item.file.size, 0);

  function startNew() {
    if (letters.length >= 5) { setMessage('Limite de cinco cartas neste ensaio.'); return; }
    setEditingId(null); setTitle(''); setRecipient(''); setBody(''); setAttachments([]); setMessage(''); setStep('escrever');
  }

  function edit(letter: Letter) {
    setEditingId(letter.id); setTitle(letter.title); setRecipient(letter.recipient);
    setBody(letter.body);
    setAttachments(letter.attachments.map((item) => ({ ...item, url: URL.createObjectURL(item.file) })));
    setMessage(''); setStep('escrever');
  }

  function removeAttachment(id: string) {
    const item = attachments.find((entry) => entry.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setAttachments((entries) => entries.filter((entry) => entry.id !== id));
  }

  function addFile(file: File, kind: Kind) {
    const current = attachmentsRef.current;
    const n = current.filter((item) => item.kind === kind).length;
    if (n >= (kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1)) {
      setMessage('Limite desta mídia atingido. Remova um arquivo antes de incluir outro.'); return;
    }
    if (!file.type.startsWith(`${kind === 'foto' ? 'image' : kind}/`)) {
      setMessage('Escolha uma foto, um áudio ou um vídeo compatível.'); return;
    }
    if (file.size > LIMIT[kind] || current.reduce((sum, item) => sum + item.file.size, 0) + file.size > MAX_TOTAL) {
      setMessage(`Arquivo acima do limite. ${kind}: ${size(LIMIT[kind])}; total: 150 MB.`); return;
    }
    const accept = () => {
      const latest = attachmentsRef.current;
      if (latest.filter((item) => item.kind === kind).length >= (kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1)) return;
      const next = [...latest, { id: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file) }];
      attachmentsRef.current = next; setAttachments(next); setMessage('Arquivo incluído na prévia da carta. Ainda não foi enviado.');
    };
    if (kind === 'foto') { accept(); return; }
    const preview = document.createElement(kind);
    const url = URL.createObjectURL(file);
    preview.preload = 'metadata';
    preview.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (!Number.isFinite(preview.duration) || preview.duration > (kind === 'video' ? 60 : 180)) {
        setMessage(kind === 'video' ? 'Vídeo: no máximo 1 minuto.' : 'Áudio: no máximo 3 minutos.'); return;
      }
      accept();
    };
    preview.onerror = () => { URL.revokeObjectURL(url); setMessage('Não foi possível conferir a duração. Escolha outro arquivo.'); };
    preview.src = url;
  }

  function choose(event: ChangeEvent<HTMLInputElement>, kind: Kind) {
    Array.from(event.target.files ?? []).forEach((file) => addFile(file, kind));
    event.target.value = '';
  }
  function drop(event: DragEvent<HTMLDivElement>, kind: Kind) {
    event.preventDefault();
    Array.from(event.dataTransfer.files).forEach((file) => addFile(file, kind));
  }

  async function record(kind: 'audio' | 'video') {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Este navegador não permite gravar aqui. Escolha um arquivo do aparelho.'); return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia(kind === 'video' ? { video: true, audio: true } : { audio: true });
      const capture = new MediaRecorder(media);
      stream.current = media; recorder.current = capture; chunks.current = [];
      capture.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      capture.onstop = () => {
        media.getTracks().forEach((track) => track.stop()); setRecording(null);
        const blob = new Blob(chunks.current, { type: capture.mimeType });
        if (blob.size && blob.size <= LIMIT[kind]) {
          const file = new File([blob], `mensagem-${kind}.webm`, { type: capture.mimeType });
          const next = [...attachmentsRef.current, { id: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file) }];
          attachmentsRef.current = next; setAttachments(next);
        } else setMessage('A gravação excedeu o limite. Tente novamente.');
      };
      capture.start(1000); setRecording(kind);
      timer.current = setTimeout(() => { if (capture.state === 'recording') capture.stop(); }, kind === 'video' ? 60_000 : 180_000);
    } catch { setMessage('Não foi possível acessar câmera ou microfone. Você pode escolher um arquivo.'); }
  }
  function stopRecording() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  function review() {
    if (!recipient.trim() || !body.trim()) { setMessage('Informe para quem é a carta e escreva sua mensagem.'); return; }
    if (body.length > 20_000 || title.length > 80 || recipient.length > 100) { setMessage('O texto ultrapassa o limite permitido.'); return; }
    setMessage(''); setStep('revisar');
  }
  function keepPreview() {
    const letter: Letter = { id: editingId ?? crypto.randomUUID(), title: title.trim() || 'Minha carta',
      recipient: recipient.trim(), body: body.trim(), attachments };
    if (editingId) letters.find((item) => item.id === editingId)?.attachments.forEach((item) => URL.revokeObjectURL(item.url));
    setLetters((items) => editingId ? items.map((item) => item.id === editingId ? letter : item) : [...items, letter]);
    setAttachments([]); setEditingId(null); setMessage('Prévia guardada somente nesta aba. Fechar a página apaga esta versão. Nenhum arquivo foi enviado ao servidor.'); setStep('inicio');
  }
  function removeLetter(letter: Letter) {
    if (!window.confirm('Remover esta carta da prévia deste aparelho?')) return;
    letter.attachments.forEach((item) => URL.revokeObjectURL(item.url));
    setLetters((items) => items.filter((item) => item.id !== letter.id));
    setMessage('Carta removida da prévia local. Nenhum dado remoto foi alterado.');
  }

  async function depositTest() {
    if (busy || passphrase.length < 16) { setMessage('Use uma frase secreta de pelo menos 16 caracteres para este ensaio.'); return; }
    setBusy(true);
    try {
      const payload = await testPayload({ title: title.trim() || 'Minha carta', recipient: recipient.trim(), body: body.trim(), attachments });
      const sealed = await sealCapsule(payload, passphrase);
      const response = await fetch('/api/cripta/test-capsules', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sealed) });
      const result = await response.json() as { id?: string; createdAt?: string; expiresAt?: string; error?: string };
      if (!response.ok || !result.id || !result.createdAt || !result.expiresAt) throw new Error(result.error || 'Depósito de ensaio não confirmado.');
      setRemote((items) => [...items, { id: result.id!, createdAt: result.createdAt!, expiresAt: result.expiresAt! }]);
      setMessage('Carta fictícia cifrada no aparelho e enviada ao Wix. Reabra abaixo para conferir. O acesso expira em 48 horas; uma rotina diária tenta excluir o objeto após esse prazo.');
      setStep('inicio');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Ensaio falhou.'); }
    finally { setBusy(false); setPassphrase(''); }
  }

  async function openTest(id: string) {
    if (busy || passphrase.length < 16) { setMessage('Informe a frase secreta usada nesta carta fictícia.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/test-capsules/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível recuperar o pacote cifrado.');
      const clear = await openCapsule(await response.json(), passphrase);
      const value = JSON.parse(new TextDecoder().decode(clear)) as { format: string; title: string; recipient: string; body: string;
        attachments: Array<{ kind: Kind; name: string; type: string; data: string }> };
      if (value.format !== 'vl6-fictional-test-v1' || !Array.isArray(value.attachments) || value.attachments.length > 13 ||
          typeof value.title !== 'string' || typeof value.recipient !== 'string' || typeof value.body !== 'string') throw new Error('Formato de teste inválido.');
      const restored = value.attachments.map((entry) => {
        if (!['foto', 'audio', 'video'].includes(entry.kind) || typeof entry.data !== 'string' || entry.data.length > 1_000_000) throw new Error('Anexo inválido.');
        const file = new File([Uint8Array.from(atob(entry.data), (char) => char.charCodeAt(0))], entry.name, { type: entry.type });
        return { id: crypto.randomUUID(), file, kind: entry.kind, url: URL.createObjectURL(file) };
      });
      setEditingId(null); setTitle(value.title); setRecipient(value.recipient); setBody(value.body);
      setAttachments(restored); setStep('revisar');
      setMessage('Pacote recuperado do Wix, conferido pelo hash e aberto pela sua frase secreta no navegador. Esta é uma carta fictícia de ensaio.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o ensaio.'); }
    finally { setBusy(false); setPassphrase(''); }
  }

  async function deleteTest(id: string) {
    if (!window.confirm('Excluir este pacote fictício do Wix agora?')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/test-capsules/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('A exclusão no Wix não foi confirmada.');
      setRemote((items) => items.filter((item) => item.id !== id));
      setMessage('Exclusão solicitada ao Wix e registro de teste removido.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exclusão falhou.'); }
    finally { setBusy(false); }
  }

  function picker(kind: Kind, label: string, accept: string, description: string) {
    return <section className="rounded-2xl border border-[#ddd0b7] bg-white p-5">
      <h3 className="font-serif text-xl text-[#142a43]">{label} <span className="font-sans text-sm font-normal text-[#607084]">(opcional)</span></h3>
      <p className="mt-1 text-sm text-[#536074]">{description}</p>
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, kind)} className="mt-4 rounded-xl border-2 border-dashed border-[#c9a449] bg-[#faf7ef] p-5 text-center">
        <label className="inline-block cursor-pointer rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white">Escolher {kind === 'foto' ? 'fotos' : kind === 'audio' ? 'áudio' : 'vídeo'}<input type="file" accept={accept} multiple={kind === 'foto'} onChange={(event) => choose(event, kind)} className="sr-only" /></label>
        <p className="mt-2 text-xs text-[#536074]">Também pode arrastar arquivos para esta área.</p>
      </div>
      {kind !== 'foto' && <button type="button" disabled={recording !== null || count(kind) >= (kind === 'audio' ? 2 : 1)} onClick={() => record(kind)} className="mt-3 rounded-xl border border-[#a78648] px-4 py-3 text-sm font-semibold disabled:opacity-50">Gravar {kind === 'audio' ? 'minha voz' : 'um vídeo'}</button>}
      {recording === kind && <button type="button" onClick={stopRecording} className="ml-3 rounded-xl bg-red-800 px-4 py-3 text-sm text-white">Parar gravação</button>}
      {attachments.filter((item) => item.kind === kind).map((item) => <div key={item.id} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm">
        {kind === 'foto' ? <img src={item.url} alt="Foto incluída" className="h-16 w-16 rounded object-cover" /> : kind === 'video' ? <video controls src={item.url} className="h-24 max-w-48" /> : <audio controls src={item.url} className="max-w-56" />}
        <span className="min-w-0 flex-1 truncate">{item.file.name} · {size(item.file.size)}</span>
        <button type="button" onClick={() => removeAttachment(item.id)} className="rounded-lg border px-3 py-2">Remover</button>
      </div>)}
    </section>;
  }

  return <div className="mx-auto max-w-4xl space-y-6 pb-16">
    <header className="rounded-[2rem] bg-[radial-gradient(ellipse_at_top_right,#344d67,#112640_55%,#06172e)] p-8 text-white sm:p-12">
      <p className="text-xs font-semibold uppercase tracking-[.25em] text-[#e3bd62]">Cripta do Irmão</p>
      <h1 className="mt-4 font-serif text-4xl">Uma carta para quem você ama.</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-200">Escreva com calma. Se quiser, acrescente fotos, sua voz ou um vídeo. Cada carta e seus arquivos formam uma lembrança para a pessoa indicada.</p>
    </header>
    <div role="alert" className="rounded-2xl border border-amber-400 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Ensaio funcional: use apenas nomes e conteúdo fictícios.</strong> Prévia local desaparece ao fechar a aba. O acesso ao pacote de teste expira em 48 horas; a exclusão no Wix é tentada pela rotina diária e pode levar mais tempo. Você também pode solicitar a exclusão pelo botão abaixo. O armazenamento anual e a guarda em unidades externas ainda não estão habilitados.</div>
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-[#c9a449] bg-white p-4 text-sm">{message}</p>}
    {step === 'inicio' && <main className="rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">Meu espaço</p>
      <h2 className="mt-2 font-serif text-3xl text-[#142a43]">Minhas cartas</h2>
      <p className="mt-3 text-[#536074]">Você pode fazer apenas uma carta. Ela continuará como foi escrita até que você decida alterá-la. Fotos, áudio e vídeo são opcionais.</p>
      <button type="button" onClick={startNew} className="mt-7 rounded-xl bg-[#123c69] px-6 py-4 text-base font-semibold text-white">Escrever uma carta</button>
      <div className="mt-8 space-y-4">{letters.map((letter) => <article key={letter.id} className="rounded-2xl border border-[#d7c9a9] bg-white p-5">
        <h3 className="font-serif text-xl text-[#142a43]">{letter.title}</h3>
        <p className="mt-1 text-sm text-[#536074]">Para {letter.recipient} · {letter.attachments.length} arquivo(s) · apenas nesta aba</p>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => edit(letter)} className="rounded-xl bg-[#123c69] px-4 py-3 text-sm font-semibold text-white">Ver ou alterar carta</button><button type="button" onClick={() => removeLetter(letter)} className="rounded-xl border px-4 py-3 text-sm">Remover prévia</button></div>
      </article>)}{!letters.length && <p className="rounded-xl border border-dashed border-[#c9a449] p-5 text-sm text-[#536074]">Nenhuma carta criada nesta aba.</p>}</div>
      {remote.length > 0 && <section className="mt-8 rounded-2xl border border-[#d7c9a9] bg-white p-5"><h3 className="font-serif text-xl">Ensaios cifrados no Wix</h3><p className="mt-2 text-sm text-[#536074]">Somente datas aparecem no inventário. Para abrir, informe a frase secreta usada ao enviar.</p><label className="mt-4 block text-sm font-semibold">Frase secreta do ensaio<input type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label>{remote.map((item) => <div key={item.id} className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 text-sm"><span className="flex-1">Enviado em {new Date(item.createdAt).toLocaleString('pt-BR')} · expira em {new Date(item.expiresAt).toLocaleString('pt-BR')}</span><button type="button" disabled={busy} onClick={() => openTest(item.id)} className="rounded-xl bg-[#123c69] px-4 py-3 font-semibold text-white disabled:opacity-50">Reabrir e conferir</button><button type="button" disabled={busy} onClick={() => deleteTest(item.id)} className="rounded-xl border px-4 py-3 disabled:opacity-50">Excluir teste</button></div>)}</section>}
    </main>}
    {step === 'escrever' && <main className="space-y-6 rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">1 de 2 · Prepare sua carta</p><h2 className="mt-2 font-serif text-3xl text-[#142a43]">{editingId ? 'Alterar minha carta' : 'Escrever minha carta'}</h2><p className="mt-2 text-sm text-[#536074]">Só a pessoa que você indicar deverá receber esta carta. Os arquivos abaixo acompanharão a mesma carta.</p></div>
      <div className="space-y-5 rounded-2xl border border-[#ddd0b7] bg-white p-5">
        <label className="block font-semibold text-[#142a43]">Para quem é esta carta?<input value={recipient} maxLength={100} onChange={(event) => setRecipient(event.target.value)} placeholder="Use um nome fictício neste ensaio" className="mt-2 block w-full rounded-xl border p-4 font-normal" /></label>
        <label className="block font-semibold text-[#142a43]">Título <span className="font-normal text-[#607084]">(opcional)</span><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Minha mensagem" className="mt-2 block w-full rounded-xl border p-4 font-normal" /></label>
        <label className="block font-semibold text-[#142a43]">Escreva sua carta<textarea value={body} maxLength={20_000} onChange={(event) => setBody(event.target.value)} rows={10} placeholder="Escreva com suas próprias palavras..." className="mt-2 block w-full rounded-xl border p-4 font-serif font-normal leading-8" /></label>
      </div>
      <div><h3 className="font-serif text-2xl text-[#142a43]">Quer acrescentar alguma lembrança?</h3><p className="mt-1 text-sm text-[#536074]">Você pode seguir sem anexar nada.</p></div>
      {picker('foto', 'Fotografias', 'image/*', 'Até 10 fotos, de 5 MB cada.')}
      {picker('audio', 'Mensagem de voz', 'audio/*', 'Até 2 áudios, de 3 minutos e 10 MB cada.')}
      {picker('video', 'Vídeo', 'video/*', 'Um vídeo de até 1 minuto e 60 MB.')}
      <p className="text-sm text-[#536074]">Arquivos nesta carta: {size(total)} de 150 MB.</p>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={recording !== null} onClick={review} className="rounded-xl bg-[#123c69] px-6 py-4 font-semibold text-white disabled:opacity-50">Revisar minha carta</button><button type="button" onClick={() => { attachments.forEach((item) => URL.revokeObjectURL(item.url)); setAttachments([]); setStep('inicio'); }} className="rounded-xl border px-5 py-4">Voltar às cartas</button></div>
    </main>}
    {step === 'revisar' && <main className="rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">2 de 2 · Confira a prévia</p>
      <h2 className="mt-2 font-serif text-3xl text-[#142a43]">Sua carta está pronta para revisão</h2>
      <article className="mx-auto mt-7 max-w-2xl border border-[#ccb682] bg-[#f8f1e4] p-7 text-[#26344a] shadow-lg sm:p-12">
        <p className="text-center text-xs uppercase tracking-widest text-[#94733c]">Cripta do Irmão · prévia fictícia</p>
        <h3 className="mt-8 text-center font-serif text-3xl">{title.trim() || 'Minha carta'}</h3>
        <p className="mt-5 text-[#927035]">Para {recipient.trim()}</p>
        <p className="mt-8 whitespace-pre-wrap break-words font-serif leading-8">{body.trim()}</p>
        {attachments.filter((item) => item.kind === 'foto').length > 0 && <div className="mt-8 grid grid-cols-2 gap-3 border-t pt-6 sm:grid-cols-3">{attachments.filter((item) => item.kind === 'foto').map((item) => <img key={item.id} src={item.url} alt="Foto anexa" className="aspect-square w-full rounded object-cover" />)}</div>}
      </article>
      <div className="mt-6 rounded-xl border bg-white p-5 text-sm"><strong>Arquivos desta carta:</strong> {attachments.length || 'nenhum'}{attachments.map((item) => <p key={item.id} className="mt-2 break-all">{item.kind}: {item.file.name}</p>)}</div>
      <p className="mt-5 text-sm text-[#795521]">Use apenas uma carta fictícia. O envio conectado aceita até 650 KB de anexos no total e expira em 48 horas. Guarde a frase de ensaio separadamente para poder reabrir; ela não é enviada ao servidor.</p>
      <label className="mt-5 block text-sm font-semibold">Frase secreta para o ensaio conectado<input type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-2 block w-full rounded-xl border bg-white p-3" /></label>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={depositTest} className="rounded-xl bg-[#123c69] px-6 py-4 font-semibold text-white disabled:opacity-50">Enviar carta fictícia cifrada</button><button type="button" onClick={keepPreview} className="rounded-xl border px-6 py-4">Manter só nesta aba</button><button type="button" onClick={() => setStep('escrever')} className="rounded-xl border px-5 py-4">Voltar e alterar</button></div>
    </main>}
  </div>;
}

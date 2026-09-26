'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { openCapsule } from '@/modules/cripta/lib/sealed-capsule';

type Kind = 'foto' | 'audio' | 'video';
type Attachment = { id: string; file: File; kind: Kind; url: string };
type StoredDraft = { title: string; recipient: string; body: string;
  attachments: Array<{ kind: Kind; name: string; type: string; data: string }> };
type Step = 'inicio' | 'escrever' | 'revisar';

const LIMIT = { foto: 5 * 1024 * 1024, audio: 10 * 1024 * 1024, video: 60 * 1024 * 1024 };
const MAX_TOTAL = 650_000;
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const ONLINE_BYTES = 650_000;

function toBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}

async function onlinePayload(letter: { title: string; recipient: string; body: string; attachments: Attachment[] }): Promise<Uint8Array> {
  if (letter.attachments.reduce((sum, item) => sum + item.file.size, 0) > ONLINE_BYTES) {
    throw new Error('O envio atual aceita até 650 KB de anexos juntos. Escolha imagens pequenas ou envie apenas a carta.');
  }
  const items = await Promise.all(letter.attachments.map(async (item) => ({
    kind: item.kind, name: item.file.name.slice(0, 120), type: item.file.type,
    data: toBase64(new Uint8Array(await item.file.arrayBuffer())),
  })));
  const bytes = new TextEncoder().encode(JSON.stringify({ format: 'vl6-online-letter-v1',
    title: letter.title, recipient: letter.recipient, body: letter.body, attachments: items }));
  if (bytes.length > 1_000_000) throw new Error('Carta acima de 1 MB antes da cifragem.');
  return bytes;
}

export function CriptaExperience() {
  const [step, setStep] = useState<Step>('inicio');
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [remote, setRemote] = useState<Array<{ id: string; createdAt: string; legacy: boolean }>>([]);
  const [legacyId, setLegacyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receivingOpen, setReceivingOpen] = useState(false);
  const [openingChecked, setOpeningChecked] = useState(false);
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  const draftRevision = useRef(0);
  const draftSaved = useRef('');
  const draftValues = useRef({ title, recipient, body, attachments });
  draftValues.current = { title, recipient, body, attachments };
  const draftEnabled = useRef(false);
  const draftPending = useRef(false);
  const draftSaving = useRef<Promise<void> | null>(null);
  const [recording, setRecording] = useState<Kind | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useEffect(() => {
    fetch('/api/cripta/online-opening', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error('Estado indisponível.');
      setReceivingOpen((await response.json() as { open: boolean }).open === true);
    }).catch(() => setMessage('Não foi possível conferir se o recebimento está aberto. Tente atualizar a página.'))
      .finally(() => setOpeningChecked(true));
    fetch('/api/cripta/online-capsules', { cache: 'no-store' }).then(async (response) => {
      if (response.ok) setRemote((await response.json() as { items: typeof remote }).items);
    }).catch(() => { /* UI can still be explored without the service */ });
    fetch('/api/cripta/draft', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json() as { draft?: StoredDraft | null; revision?: number; error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível recuperar o rascunho.');
      if (result.draft) {
        setDraft(result.draft);
        draftSaved.current = JSON.stringify(result.draft);
      }
      draftRevision.current = result.revision ?? 0;
    }).catch((error) => setDraftStatus(error instanceof Error ? error.message : 'Rascunho indisponível.'))
      .finally(() => setDraftChecked(true));
  }, []);

  async function persistDraft() {
    if (!draftEnabled.current || !receivingOpen) return;
    if (draftSaving.current) { draftPending.current = true; return draftSaving.current; }
    const task = (async () => {
      do {
        draftPending.current = false;
        const values = draftValues.current;
        const bytes = await onlinePayload(values);
        const content = new TextDecoder().decode(bytes);
        if (content === draftSaved.current) continue;
        setDraftStatus('Salvando…');
        const response = await fetch('/api/cripta/draft', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: draftRevision.current, letter: JSON.parse(content) }),
        });
        const result = await response.json() as { revision?: number; updatedAt?: string; error?: string };
        if (!response.ok || !result.revision) throw new Error(result.error || 'Rascunho não salvo.');
        draftRevision.current = result.revision;
        draftSaved.current = content;
        setDraft(JSON.parse(content) as StoredDraft);
        setDraftStatus(`Salvo às ${new Date(result.updatedAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        if (draftEnabled.current) {
          const latest = await onlinePayload(draftValues.current);
          if (new TextDecoder().decode(latest) !== draftSaved.current) draftPending.current = true;
        }
      } while (draftPending.current && draftEnabled.current);
    })();
    const settled = task.catch((error) => {
      setDraftStatus(error instanceof Error ? error.message : 'Rascunho não salvo.');
    }).finally(() => { draftSaving.current = null; });
    draftSaving.current = settled;
    await settled;
  }

  useEffect(() => {
    if (step !== 'escrever' || !draftChecked || !receivingOpen || !draftEnabled.current ||
        (!recipient.trim() && !body.trim() && attachments.length === 0)) return;
    const timer = setTimeout(() => { void persistDraft(); }, 1500);
    return () => clearTimeout(timer);
  }, [step, title, recipient, body, attachments, draftChecked, receivingOpen]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
  }, []);

  const count = (kind: Kind) => attachments.filter((item) => item.kind === kind).length;
  const total = attachments.reduce((sum, item) => sum + item.file.size, 0);

  function startNew() {
    if (!draftChecked) return;
    draftEnabled.current = true;
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    setTitle(''); setRecipient(''); setBody(''); setAttachments([]); setMessage(''); setStep('escrever');
  }

  function continueDraft() {
    if (!draft) return;
    attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    const restored = draft.attachments.map((entry) => {
      const file = new File([Uint8Array.from(atob(entry.data), (char) => char.charCodeAt(0))], entry.name, { type: entry.type });
      return { id: crypto.randomUUID(), file, kind: entry.kind, url: URL.createObjectURL(file) };
    });
    draftEnabled.current = true;
    setTitle(draft.title); setRecipient(draft.recipient); setBody(draft.body);
    setAttachments(restored); setMessage(''); setStep('escrever');
  }

  function removeAttachment(id: string) {
    const item = attachments.find((entry) => entry.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setAttachments((entries) => entries.filter((entry) => entry.id !== id));
    setDraftStatus('Alterações ainda não salvas');
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
      setMessage('Os anexos desta carta devem somar no máximo 650 KB. Escolha um arquivo menor.'); return;
    }
    const accept = () => {
      const latest = attachmentsRef.current;
      if (latest.filter((item) => item.kind === kind).length >= (kind === 'foto' ? 10 : kind === 'audio' ? 2 : 1)) return;
      const next = [...latest, { id: crypto.randomUUID(), file, kind, url: URL.createObjectURL(file) }];
      attachmentsRef.current = next; setAttachments(next); setMessage('Arquivo incluído na prévia da carta. Ainda não foi enviado.');
      setDraftStatus('Alterações ainda não salvas');
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

  async function importWord(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.docx$/i.test(file.name) || file.size > 5_000_000) {
      setMessage('Escolha um documento Word .docx de até 5 MB.'); return;
    }
    try {
      const JSZip = (await import('jszip')).default;
      const archive = await JSZip.loadAsync(file);
      const entry = archive.file('word/document.xml');
      if (!entry) throw new Error('O arquivo não contém uma carta Word compatível.');
      const xml = await entry.async('string');
      if (xml.length > 1_000_000) throw new Error('O documento possui texto acima do limite.');
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      if (document.querySelector('parsererror')) throw new Error('Não foi possível ler o documento.');
      const paragraphs = Array.from(document.getElementsByTagName('w:p')).map((paragraph) =>
        Array.from(paragraph.getElementsByTagName('w:t')).map((node) => node.textContent ?? '').join(''),
      );
      const imported = paragraphs.join('\n').trim();
      if (!imported || imported.length > 20_000) throw new Error('O texto importado está vazio ou ultrapassa o limite da carta.');
      if (body.trim() && !window.confirm('Substituir o texto atual pelo conteúdo do Word? Confira antes de continuar.')) return;
      setBody(imported);
      setDraftStatus('Alterações ainda não salvas');
      setMessage('Texto do Word importado. Revise antes de guardar sua carta.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível importar o Word.'); }
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
        if (blob.size && blob.size <= LIMIT[kind] && blob.size + attachmentsRef.current.reduce((sum, item) => sum + item.file.size, 0) <= MAX_TOTAL) {
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

  async function review() {
    if (!recipient.trim() || !body.trim()) { setMessage('Informe para quem é a carta e escreva sua mensagem.'); return; }
    if (body.length > 20_000 || title.length > 80 || recipient.length > 100) { setMessage('O texto ultrapassa o limite permitido.'); return; }
    await persistDraft();
    try {
      const current = new TextDecoder().decode(await onlinePayload(draftValues.current));
      if (current !== draftSaved.current) { setMessage('Aguarde o rascunho ser salvo antes de continuar.'); return; }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Rascunho não salvo.'); return; }
    setMessage(''); setStep('revisar');
  }
  async function keepPreview() {
    await persistDraft();
    try {
      const current = new TextDecoder().decode(await onlinePayload(draftValues.current));
      if (draftSaved.current !== current) throw new Error('O rascunho ainda não foi salvo. Tente novamente.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Rascunho não salvo.'); return; }
    setMessage('Rascunho guardado. Você poderá continuar em outro aparelho enquanto a Cripta estiver aberta.');
    setStep('inicio');
  }

  async function depositTest() {
    if (!receivingOpen || !openingChecked) { setMessage('O recebimento está fechado. Aguarde a abertura pela Administração.'); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (draftSaving.current) await draftSaving.current;
      const payload = await onlinePayload({ title: title.trim() || 'Minha carta', recipient: recipient.trim(), body: body.trim(), attachments });
      const response = await fetch('/api/cripta/online-capsules', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: new TextDecoder().decode(payload) });
      const result = await response.json() as { id?: string; createdAt?: string; error?: string };
      if (!response.ok || !result.id || !result.createdAt) throw new Error(result.error || 'Envio não confirmado.');
      const check = await fetch(`/api/cripta/online-capsules/${result.id}`, { cache: 'no-store' });
      if (!check.ok || await check.text() !== new TextDecoder().decode(payload)) {
        throw new Error('A carta foi enviada, mas a leitura de conferência falhou. Atualize a página e confira antes de reenviar.');
      }
      setRemote((items) => [...items, { id: result.id!, createdAt: result.createdAt!, legacy: false }]);
      draftEnabled.current = false;
      const clear = await fetch('/api/cripta/draft', { method: 'DELETE' });
      if (clear.ok) { setDraft(null); draftSaved.current = ''; draftRevision.current = 0; setDraftStatus(''); }
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      setAttachments([]);
      setMessage(clear.ok
        ? 'Carta enviada ao Wix. Reabra abaixo para conferir os arquivos e o texto.'
        : 'Carta enviada. O rascunho antigo ainda aparece; reabra a carta antes de removê-lo.');
      setStep('inicio');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Envio falhou.'); }
    finally { setBusy(false); }
  }

  async function openTest(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/online-capsules/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível recuperar o pacote cifrado.');
      const delivered = await response.json() as { format?: string };
      if (delivered.format === 'vl6-capsule-v1' && passphrase.length < 16) {
        setLegacyId(id);
        setMessage('Esta carta foi enviada no formato antigo. Informe a frase usada naquela ocasião apenas para abri-la. As próximas cartas dispensam frase.');
        return;
      }
      const value = (delivered.format === 'vl6-capsule-v1'
        ? JSON.parse(new TextDecoder().decode(await openCapsule(delivered, passphrase)))
        : delivered) as { format: string; title: string; recipient: string; body: string;
        attachments: Array<{ kind: Kind; name: string; type: string; data: string }> };
      if (value.format !== 'vl6-online-letter-v1' || !Array.isArray(value.attachments) || value.attachments.length > 13 ||
          typeof value.title !== 'string' || typeof value.recipient !== 'string' || typeof value.body !== 'string') throw new Error('Formato de carta inválido.');
      const restored = value.attachments.map((entry) => {
        if (!['foto', 'audio', 'video'].includes(entry.kind) || typeof entry.data !== 'string' || entry.data.length > 1_000_000) throw new Error('Anexo inválido.');
        const file = new File([Uint8Array.from(atob(entry.data), (char) => char.charCodeAt(0))], entry.name, { type: entry.type });
        return { id: crypto.randomUUID(), file, kind: entry.kind, url: URL.createObjectURL(file) };
      });
      attachmentsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
      setTitle(value.title); setRecipient(value.recipient); setBody(value.body);
      setAttachments(restored); setStep('revisar');
      draftEnabled.current = false;
      setLegacyId(null);
      setPassphrase('');
      setMessage(delivered.format === 'vl6-capsule-v1'
        ? 'Carta antiga aberta. Se quiser dispensar a frase, envie esta carta novamente e depois exclua a versão antiga.'
        : 'Carta recuperada do Wix e aberta pela sua conta do Portal.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível abrir a carta.'); }
    finally { setBusy(false); }
  }

  async function deleteTest(id: string) {
    if (!window.confirm('Excluir esta carta do Wix? Esta ação não poderá ser desfeita.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/online-capsules/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('A exclusão no Wix não foi confirmada.');
      setRemote((items) => items.filter((item) => item.id !== id));
      setMessage('Carta excluída do Wix e retirada da lista.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exclusão falhou.'); }
    finally { setBusy(false); }
  }

  async function downloadOffline(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/online-capsules/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível reabrir a carta para exportação.');
      const letter = await response.json() as { format: string; title: string; recipient: string; body: string;
        attachments: Array<{ kind: Kind; name: string; type: string; data: string }> };
      if (letter.format !== 'vl6-online-letter-v1') throw new Error('Abra e migre esta carta antiga antes de gerar o arquivo HTML.');
      const { makeOfflinePackage } = await import('@/modules/cripta/lib/offline-package');
      const blob = await makeOfflinePackage(letter);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'CARTA_CRIPTA_VL6.zip';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('Arquivo da carta preparado. Abra o ZIP e confira ABRA_AQUI_A_CARTA.html com os anexos.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exportação indisponível.'); }
    finally { setBusy(false); }
  }

  function picker(kind: Kind, label: string, accept: string, description: string) {
    return <section className="rounded-2xl border border-[#ddd0b7] bg-white p-5">
      <h3 className="font-serif text-xl text-[#142a43]">{label} <span className="font-sans text-sm font-normal text-[#607084]">(opcional)</span></h3>
      <p className="mt-1 text-sm text-[#536074]">{description}</p>
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, kind)} className="mt-4 rounded-xl border-2 border-dashed border-[#c9a449] bg-[#faf7ef] p-5 text-center">
        <label className="inline-block cursor-pointer rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white">Escolher {kind === 'foto' ? 'fotos' : kind === 'audio' ? 'áudio' : 'vídeo'}<input type="file" accept={accept} multiple={kind === 'foto'} onChange={(event) => choose(event, kind)} className="sr-only" /></label>
        {kind === 'foto' && <label className="ml-2 inline-block cursor-pointer rounded-xl border border-[#a78648] bg-white px-5 py-3 font-semibold text-[#142a43]">Tirar foto<input type="file" accept="image/*" capture="environment" onChange={(event) => choose(event, 'foto')} className="sr-only" /></label>}
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
    <div role="status" className="rounded-2xl border border-amber-400 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Guarda online no Wix · {openingChecked ? receivingOpen ? 'recebimento aberto' : 'recebimento fechado' : 'conferindo abertura…'}.</strong> O rascunho fica guardado quando aparecer “Salvo”. As cópias em unidades externas ainda não foram vinculadas.</div>
    {message && <p role="status" aria-live="polite" className="rounded-xl border border-[#c9a449] bg-white p-4 text-sm">{message}</p>}
    {step === 'inicio' && <main className="rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">Meu espaço</p>
      <h2 className="mt-2 font-serif text-3xl text-[#142a43]">Minhas cartas</h2>
      <p className="mt-3 text-[#536074]">Escreva no seu tempo. Você pode continuar um rascunho salvo, conferir as cartas enviadas e anexar lembranças se desejar.</p>
      {draft && <article className="mt-7 rounded-2xl border border-[#d7c9a9] bg-white p-5">
        <h3 className="font-serif text-xl text-[#142a43]">Rascunho guardado</h3>
        <p className="mt-1 text-sm text-[#536074]">{draft.recipient ? `Para ${draft.recipient}` : 'Escolha o destinatário quando quiser'} · {draft.attachments.length} anexo(s)</p>
        <button type="button" disabled={!receivingOpen} onClick={continueDraft} className="mt-4 rounded-xl bg-[#123c69] px-6 py-4 font-semibold text-white disabled:opacity-50">Continuar minha carta</button>
      </article>}
      {!draft && <button type="button" disabled={!draftChecked || !receivingOpen} onClick={startNew} className="mt-7 rounded-xl bg-[#123c69] px-6 py-4 text-base font-semibold text-white disabled:opacity-50">Escrever minha carta</button>}
      {draftStatus && <p role="status" className="mt-3 text-sm text-[#536074]">{draftStatus}</p>}
      {remote.length > 0 && <section className="mt-8 rounded-2xl border border-[#d7c9a9] bg-white p-5"><h3 className="font-serif text-xl">Cartas enviadas ao Wix</h3><p className="mt-2 text-sm text-[#536074]">Abra suas cartas com a conta do Portal. As cartas antigas continuam protegidas pela frase usada no envio.</p>{remote.map((item) => <div key={item.id} className="mt-4 border-t pt-4 text-sm"><div className="flex flex-wrap items-center gap-3"><span className="flex-1">Enviado em {new Date(item.createdAt).toLocaleString('pt-BR')}{item.legacy ? ' · formato antigo' : ''}</span><button type="button" disabled={busy} onClick={() => openTest(item.id)} className="rounded-xl bg-[#123c69] px-4 py-3 font-semibold text-white disabled:opacity-50">Reabrir e conferir</button>{!item.legacy && <button type="button" disabled={busy} onClick={() => { void downloadOffline(item.id); }} className="rounded-xl border border-[#a78648] px-4 py-3 font-semibold disabled:opacity-50">Baixar carta para abrir sem internet</button>}<button type="button" disabled={busy} onClick={() => deleteTest(item.id)} className="rounded-xl border px-4 py-3 disabled:opacity-50">Excluir carta</button></div>{legacyId === item.id && <label className="mt-4 block font-semibold">Frase usada nesta carta antiga<input type="password" autoComplete="off" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-2 block w-full rounded-xl border p-3" /><span className="mt-2 block font-normal text-[#536074]">Digite a frase e clique em “Reabrir e conferir”.</span></label>}</div>)}</section>}
    </main>}
    {step === 'escrever' && <main className="space-y-6 rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">1 de 2 · Prepare sua carta</p><h2 className="mt-2 font-serif text-3xl text-[#142a43]">Escrever minha carta</h2><p className="mt-2 text-sm text-[#536074]">Indique a pessoa que deverá receber esta carta. Os arquivos abaixo acompanharão a mesma mensagem.</p></div>
      <p role="status" className="rounded-xl border border-[#ddd0b7] bg-white p-3 text-sm">{draftStatus || 'Escreva no seu tempo. O rascunho será salvo automaticamente.'}</p>
      <div className="space-y-5 rounded-2xl border border-[#ddd0b7] bg-white p-5">
        <label className="block font-semibold text-[#142a43]">Para quem é esta carta?<input value={recipient} maxLength={100} onChange={(event) => { setRecipient(event.target.value); setDraftStatus('Alterações ainda não salvas'); }} placeholder="Nome de quem deverá receber" className="mt-2 block w-full rounded-xl border p-4 font-normal" /></label>
        <details className="text-sm text-[#536074]"><summary className="cursor-pointer font-semibold">? Por que indicar uma pessoa?</summary><p>O nome orientará a futura entrega desta carta. Você poderá revisar antes de guardar.</p></details>
        <label className="block font-semibold text-[#142a43]">Título <span className="font-normal text-[#607084]">(opcional)</span><input value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); setDraftStatus('Alterações ainda não salvas'); }} placeholder="Minha mensagem" className="mt-2 block w-full rounded-xl border p-4 font-normal" /></label>
        <label className="block font-semibold text-[#142a43]">Escreva sua carta<textarea value={body} maxLength={20_000} onChange={(event) => { setBody(event.target.value); setDraftStatus('Alterações ainda não salvas'); }} rows={10} placeholder="Escreva com suas próprias palavras..." className="mt-2 block w-full rounded-xl border p-4 font-serif font-normal leading-8" /></label>
        <label className="inline-flex cursor-pointer items-center rounded-xl border border-[#a78648] px-4 py-3 font-semibold text-[#142a43]">Importar texto do Word (.docx)<input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => { void importWord(event); }} className="sr-only" /></label>
        <p className="text-sm text-[#536074]">O texto será colocado no editor para você conferir. Fotos e outros arquivos são adicionados abaixo.</p>
      </div>
      <div><h3 className="font-serif text-2xl text-[#142a43]">Quer acrescentar alguma lembrança?</h3><p className="mt-1 text-sm text-[#536074]">Você pode seguir sem anexar nada.</p></div>
      {picker('foto', 'Fotografias', 'image/*', 'Até 10 fotos; o envio atual aceita 650 KB de anexos juntos.')}
      {picker('audio', 'Mensagem de voz', 'audio/*', 'Até 2 áudios; 650 KB de anexos juntos nesta fase.')}
      {picker('video', 'Vídeo', 'video/*', 'Até 1 minuto; o envio atual aceita 650 KB de anexos juntos.')}
      <p className="text-sm text-[#536074]">Arquivos nesta carta: {Math.round(total / 1024)} KB de 650 KB.</p>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={recording !== null} onClick={review} className="rounded-xl bg-[#123c69] px-6 py-4 font-semibold text-white disabled:opacity-50">Revisar minha carta</button><button type="button" onClick={() => { void keepPreview(); }} className="rounded-xl border px-5 py-4">Guardar rascunho e voltar</button></div>
    </main>}
    {step === 'revisar' && <main className="rounded-[2rem] border border-[#ddd0b7] bg-[#fbf8f1] p-6 sm:p-9">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#96763c]">2 de 2 · Confira a prévia</p>
      <h2 className="mt-2 font-serif text-3xl text-[#142a43]">Sua carta está pronta para revisão</h2>
      <article className="mx-auto mt-7 max-w-2xl border border-[#ccb682] bg-[#f8f1e4] p-7 text-[#26344a] shadow-lg sm:p-12">
        <p className="text-center text-xs uppercase tracking-widest text-[#94733c]">Cripta do Irmão · minha carta</p>
        <h3 className="mt-8 text-center font-serif text-3xl">{title.trim() || 'Minha carta'}</h3>
        <p className="mt-5 text-[#927035]">Para {recipient.trim()}</p>
        <p className="mt-8 whitespace-pre-wrap break-words font-serif leading-8">{body.trim()}</p>
        {attachments.filter((item) => item.kind === 'foto').length > 0 && <div className="mt-8 grid grid-cols-2 gap-3 border-t pt-6 sm:grid-cols-3">{attachments.filter((item) => item.kind === 'foto').map((item) => <img key={item.id} src={item.url} alt="Foto anexa" className="aspect-square w-full rounded object-cover" />)}</div>}
      </article>
      <div className="mt-6 rounded-xl border bg-white p-5 text-sm"><strong>Arquivos desta carta:</strong> {attachments.length || 'nenhum'}{attachments.map((item) => <p key={item.id} className="mt-2 break-all">{item.kind}: {item.file.name}</p>)}</div>
      <p className="mt-5 text-sm text-[#795521]">O envio atual aceita até 650 KB de anexos juntos. Depois do envio, sua conta do Portal permite reabrir esta carta.</p>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={busy || !receivingOpen || !openingChecked} onClick={depositTest} className="rounded-xl bg-[#123c69] px-6 py-4 font-semibold text-white disabled:opacity-50">Guardar minha carta</button><button type="button" onClick={() => { void keepPreview(); }} className="rounded-xl border px-6 py-4">Guardar rascunho</button><button type="button" onClick={() => { draftEnabled.current = true; setStep('escrever'); }} className="rounded-xl border px-5 py-4">Voltar e alterar</button></div>
    </main>}
  </div>;
}

'use client';

import { useState, type ChangeEvent } from 'react';
import { Archive, Lock, ShieldCheck } from '@vl6/ui';
import {
  createLabKey, decryptLabCapsule, encryptLabCapsule, exportLabKey,
  importLabKey, parseLabBundle, type LabCapsule, type LabBundle,
} from '@/modules/cripta/lib/lab-crypto';

function downloadBundle(items: LabCapsule[]) {
  const bundle: LabBundle = { format: 'vl6-cripta-lab', version: 1, items };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'cripta-laboratorio-cifrado.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function CriptaLab() {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [keyText, setKeyText] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [items, setItems] = useState<LabCapsule[]>([]);
  const [title, setTitle] = useState('Carta fictícia aos Irmãos');
  const [letter, setLetter] = useState('Este texto é inventado para testar a Cripta.');
  const [opened, setOpened] = useState(false);
  const [approvedA, setApprovedA] = useState(false);
  const [approvedB, setApprovedB] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [preview, setPreview] = useState<{ title: string; letter: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState('Cripta de teste fechada. Nenhuma carta foi enviada ao servidor.');
  const [busy, setBusy] = useState(false);

  async function guarded(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Falha no ensaio.');
      setPreview(null);
    } finally { setBusy(false); }
  }

  function authorized(): boolean {
    if (!approvedA || !approvedB) {
      setStatus('Marque as duas aprovações fictícias. Isto não comprova identidade real.');
      return false;
    }
    return true;
  }

  function close() {
    if (!authorized()) return;
    setOpened(false);
    setKey(null);
    setKeyText('');
    setKeyInput('');
    setPreview(null);
    setEditingId(null);
    setLetter('');
    setApprovedA(false);
    setApprovedB(false);
    setStatus(`Janela fechada${nextDate ? `; próxima data proposta: ${nextDate}` : ''}. A chave foi retirada da memória desta tela. Exporte o pacote cifrado para preservá-lo.`);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 65536) { setStatus('Pacote de teste excede 64 KB.'); return; }
    await guarded(async () => {
      const bundle = parseLabBundle(await file.text());
      setItems(bundle.items);
      setKey(null);
      setKeyText('');
      setPreview(null);
      setEditingId(null);
      setOpened(false);
      setStatus(`Pacote cifrado importado (${bundle.items.length} cápsula(s)). Informe a chave de teste para abrir.`);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="alert">
        <strong>LABORATÓRIO V1 · NÃO INSIRA DADOS PESSOAIS.</strong> Apenas teste local no navegador. Não há armazenamento no Portal, nuvem ou SSD; aprovações são caixas ilustrativas e não verificam pessoas. A chave exibida é de teste.
      </div>
      <section className="rounded-3xl bg-gradient-to-br from-[#06172e] to-[#123c69] p-7 text-[#f3ead7] sm:p-10">
        <p className="text-xs uppercase tracking-[.22em] text-[#e3bd62]">Cripta VL6 · laboratório funcional</p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Ensaio de abertura e guarda</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200">Crie uma cápsula fictícia, cifre no seu navegador, baixe o pacote, feche a janela e teste a recuperação pela chave separada. Todos os dados da sessão desaparecem ao recarregar esta página.</p>
      </section>
      <div role="status" aria-live="polite" className="rounded-xl border border-[#c9a449]/40 bg-[#0a2547] p-4 text-sm text-[#f3ead7]">{status}</div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-serif text-2xl"><Lock size={22} /> 1. Chave e abertura</h2>
          <p className="mt-2 text-sm text-muted">A chave é gerada no dispositivo. Copie-a separadamente do pacote cifrado. Sem ela, o pacote não pode ser aberto neste ensaio.</p>
          <button type="button" disabled={busy || !!key} onClick={() => guarded(async () => {
            const created = await createLabKey();
            setKey(created);
            setKeyText(await exportLabKey(created));
            setStatus('Chave de teste gerada apenas na memória desta aba.');
          })} className="mt-4 rounded-lg bg-[#c9a449] px-4 py-2 text-sm font-semibold text-[#06172e] disabled:opacity-50">Gerar chave de teste</button>
          {keyText && <div className="mt-4"><label htmlFor="lab-key" className="text-sm font-semibold">Chave de teste — não compartilhe conteúdo real</label><textarea id="lab-key" readOnly value={keyText} rows={2} className="mt-1 w-full rounded border bg-background p-2 font-mono text-xs" /></div>}
          <label htmlFor="lab-import-key" className="mt-4 block text-sm font-semibold">Recuperar chave copiada</label>
          <input id="lab-import-key" type="password" autoComplete="off" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} placeholder="Cole a chave de teste" className="mt-1 w-full rounded border bg-background p-2 text-sm" />
          <button type="button" disabled={busy || !keyInput} onClick={() => guarded(async () => {
            const restored = await importLabKey(keyInput);
            setKey(restored);
            setKeyInput('');
            setStatus('Chave importada. A leitura só será testada após abrir a janela.');
          })} className="mt-2 rounded border px-3 py-2 text-sm disabled:opacity-50">Importar chave</button>
          <div className="mt-5 space-y-2 border-t pt-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={approvedA} onChange={(e) => setApprovedA(e.target.checked)} /> Responsável A (simulação)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={approvedB} onChange={(e) => setApprovedB(e.target.checked)} /> Responsável B (simulação)</label>
          </div>
          <button type="button" disabled={busy || opened || !key} onClick={() => {
            if (!authorized()) return;
            setOpened(true); setApprovedA(false); setApprovedB(false);
            setStatus('Janela de teste aberta. Isto não publica nada na internet.');
          }} className="mt-4 rounded-lg bg-[#123c69] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Abrir janela de teste</button>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 font-serif text-2xl"><Archive size={22} /> 2. Carta fictícia</h2>
          <p className="mt-2 text-sm text-muted">O título e o texto ficam juntos dentro do conteúdo cifrado. Este ensaio aceita somente texto; arquivos de mídia virão em outra fase.</p>
          <label htmlFor="lab-title" className="mt-4 block text-sm font-semibold">Título de teste</label>
          <input id="lab-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border bg-background p-2 text-sm" />
          <label htmlFor="lab-letter" className="mt-3 block text-sm font-semibold">Texto fictício</label>
          <textarea id="lab-letter" maxLength={2000} rows={5} value={letter} onChange={(e) => setLetter(e.target.value)} className="mt-1 w-full rounded border bg-background p-2 text-sm" />
          <button type="button" disabled={busy || !opened || !key || !title.trim() || !letter.trim() || (items.length >= 5 && !editingId)} onClick={() => guarded(async () => {
            if (!key) return;
            const item = await encryptLabCapsule(key, title.trim(), letter.trim());
            setItems((current) => editingId ? current.map((entry) => entry.id === editingId ? item : entry) : [...current, item]);
            setEditingId(null); setLetter(''); setPreview(null);
            setStatus('Carta fictícia cifrada no navegador. Exporte o pacote atualizado antes de sair.');
          })} className="mt-3 rounded-lg bg-[#c9a449] px-4 py-2 text-sm font-semibold text-[#06172e] disabled:opacity-50">{editingId ? 'Cifrar alteração' : 'Cifrar e incluir'}</button>
        </section>
      </div>
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl"><ShieldCheck size={22} /> 3. Conferir, exportar e fechar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => <div key={item.id} className="rounded-xl border p-4 text-sm">
            <p className="font-semibold">Cápsula cifrada {index + 1}</p><p className="mt-1 break-all font-mono text-xs text-muted">ID {item.id}</p>
            <button type="button" disabled={busy || !opened || !key} onClick={() => guarded(async () => {
              if (!key) return;
              const result = await decryptLabCapsule(key, item);
              setPreview(result); setStatus('Autenticidade conferida: a chave abriu esta cápsula.');
            })} className="mt-3 rounded border px-3 py-1.5 disabled:opacity-50">Ler com chave</button>
            <button type="button" disabled={busy || !opened || !key} onClick={() => guarded(async () => {
              if (!key) return;
              const result = await decryptLabCapsule(key, item);
              setTitle(result.title); setLetter(result.letter); setEditingId(item.id);
              setPreview(null); setStatus('Cápsula aberta para alteração. Cifre novamente para confirmar.');
            })} className="ml-2 mt-3 rounded border px-3 py-1.5 disabled:opacity-50">Editar</button>
            <button type="button" disabled={!opened} onClick={() => {
              setItems((current) => current.filter((entry) => entry.id !== item.id));
              if (editingId === item.id) setEditingId(null);
              setPreview(null); setStatus('Cápsula excluída desta sessão. Exporte um novo pacote para registrar a exclusão.');
            }} className="ml-2 mt-3 rounded border px-3 py-1.5 disabled:opacity-50">Excluir</button>
            <button type="button" disabled={!opened} onClick={() => {
              setItems((current) => current.map((entry) => entry.id !== item.id ? entry :
                { ...entry, ciphertext: entry.ciphertext.slice(0, -4) + (entry.ciphertext.endsWith('AAAA') ? 'BBBB' : 'AAAA') }));
              setPreview(null); setStatus('Um ciphertext foi alterado. Tente lê-lo: a cifra autenticada deverá recusar.');
            }} className="ml-2 mt-3 rounded border border-red-400 px-3 py-1.5 text-red-700 disabled:opacity-50">Simular corrupção</button>
          </div>)}
          {!items.length && <p className="text-sm text-muted">Nenhuma cápsula cifrada nesta sessão.</p>}
        </div>
        {preview && opened && <div className="mt-5 rounded-xl border border-[#c9a449] bg-[#f6efdf] p-5 text-[#243144]"><h3 className="font-serif text-xl">{preview.title}</h3><p className="mt-3 whitespace-pre-wrap text-sm">{preview.letter}</p></div>}
        <div className="mt-6 flex flex-wrap gap-3 border-t pt-5">
          <button type="button" disabled={!items.length} onClick={() => downloadBundle(items)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Baixar pacote cifrado</button>
          <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm">Importar pacote cifrado<input type="file" accept=".json,application/json" onChange={importFile} className="sr-only" /></label>
          <label className="flex items-center gap-2 text-sm">Próxima data proposta <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="rounded border bg-background p-2" /></label>
          <button type="button" disabled={!opened} onClick={close} className="rounded-lg bg-[#123c69] px-4 py-2 text-sm text-white disabled:opacity-50">Fechar janela</button>
        </div>
      </section>
      <p className="text-xs leading-6 text-muted">Limites do V1: aprovações e datas são simulações locais; não há cadastro de Irmãos, armazenamento persistente, backup físico, recuperação após morte, auditoria externa nem sincronização. A chave aparece para permitir o ensaio e não pode ser usada como modelo de custódia definitiva.</p>
    </div>
  );
}

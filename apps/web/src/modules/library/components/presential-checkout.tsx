'use client';

import { type FormEvent, useMemo, useRef, useState, useTransition } from 'react';
import type { LibraryCopy, LibraryItem } from '@vl6/domain';
import { BookOpen, Badge, Button, Card, CardContent, Input } from '@vl6/ui';
import { registerLibraryDirectLoanAction } from '../actions/library-actions';

interface MemberOption {
  id: string;
  nomeCompleto: string;
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

export function PresentialCheckout({
  items,
  copies,
  members,
}: {
  items: LibraryItem[];
  copies: LibraryCopy[];
  members: MemberOption[];
}) {
  const [scan, setScan] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [titleQuery, setTitleQuery] = useState('');
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [member, setMember] = useState<MemberOption | null>(null);
  const [checkedOutAt, setCheckedOutAt] = useState(todayIso());
  const [dueAt, setDueAt] = useState(addDaysIso(21));
  const [summary, setSummary] = useState<{ ok: number; failed: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const scanRef = useRef<HTMLInputElement>(null);

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

  function addBagEntry(entry: BagEntry) {
    if (bag.length === 0) setDueAt(addDaysIso(entry.prazoEmprestimoDias));
    setBag((current) => [...current.filter((e) => e.key !== entry.key), entry]);
  }

  function handleScan(event: FormEvent) {
    event.preventDefault();
    setScanError(null);
    if (!scan.trim()) return;
    const { copyId, tombo } = parseScanCode(scan);
    const copy = copyId
      ? copies.find((c) => c.id === copyId)
      : copies.find((c) => c.codigoTombo.toLowerCase() === tombo.toLowerCase());
    if (!copy) {
      setScanError('Exemplar não encontrado. Confira o QR ou o tombo digitado.');
      return;
    }
    if (copy.situacao !== 'disponivel') {
      setScanError(`Este exemplar está "${copy.situacao}", não pode ser retirado agora.`);
      return;
    }
    const item = itemById.get(copy.libraryItemId);
    if (!item) {
      setScanError('Obra do exemplar não encontrada.');
      return;
    }
    addBagEntry({
      key: copy.id,
      libraryItemId: item.id,
      copyId: copy.id,
      titulo: item.titulo ?? 'Obra sem título',
      autor: item.autor ?? null,
      capaUrl: item.capaUrl ?? null,
      codigoTombo: copy.codigoTombo,
      prazoEmprestimoDias: item.prazoEmprestimoDias ?? 21,
    });
    setScan('');
    scanRef.current?.focus();
  }

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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        <Card>
          <CardContent className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-semibold">1. Escaneie o exemplar</h2>
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
                Adicionar
              </Button>
            </form>
            {scanError && <p className="text-sm text-red-600">{scanError}</p>}
            <p className="text-muted text-xs">
              A etiqueta de cada exemplar tem um QR fixo — escanear com a câmera do celular ou um
              leitor USB já digita o código aqui.
            </p>
          </CardContent>
        </Card>

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
                        {entry.codigoTombo ? `Tombo ${entry.codigoTombo}` : 'Exemplar a definir'}
                      </span>
                      {entry.error && <span className="block text-xs text-red-600">{entry.error}</span>}
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
      </div>

      <Card className="h-fit">
        <CardContent className="grid gap-4 p-4 sm:p-5">
          <h2 className="font-semibold">2. Quem está retirando</h2>
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
                      className="hover:bg-accent/10 block w-full px-3 py-2 text-left text-sm"
                    >
                      {option.nomeCompleto}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {member && (
            <div className="bg-accent/10 flex items-center justify-between rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{member.nomeCompleto}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setMember(null)}>
                Trocar
              </Button>
            </div>
          )}

          <h2 className="mt-2 font-semibold">3. Datas</h2>
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

          <Button
            type="button"
            className="mt-2 w-full"
            disabled={!member || bag.length === 0 || pending}
            onClick={confirmCheckout}
          >
            {pending
              ? 'Registrando…'
              : `Confirmar retirada${bag.length ? ` de ${bag.length} obra(s)` : ''}`}
          </Button>
          {summary && (
            <p
              className={`text-sm ${summary.failed ? 'text-amber-700' : 'text-green-700'}`}
            >
              {summary.ok} empréstimo(s) registrado(s)
              {summary.failed ? ` · ${summary.failed} com erro (veja a sacola)` : '.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

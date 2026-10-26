'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' });

export function PublicationEventPicker({ events, content, failed }: {
  events: { id: string; title: string; date: string }[];
  content: 'noticia' | 'aviso';
  failed: boolean;
}) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(30);
  const indexed = useMemo(() => events.map((event) => {
    const date = dateFormatter.format(new Date(event.date));
    return { ...event, date, search: normalize(`${event.title} ${date}`) };
  }), [events]);
  const needle = normalize(query);
  const filtered = indexed.filter((event) => event.search.includes(needle));
  return (
    <section aria-label="Escolher acontecimento" className="space-y-3">
      {failed && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-amber-900">Não foi possível consultar toda a Agenda. A lista pode estar incompleta; tente novamente antes de cadastrar outro acontecimento.</p>}
      <label className="block font-medium" htmlFor="publication-event-search">Buscar acontecimento por título ou data</label>
      <input id="publication-event-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(30); }} className="border-border bg-surface min-h-11 w-full rounded-xl border p-3" />
      <p aria-live="polite" className="text-muted text-sm">{filtered.length} acontecimento(s) encontrado(s){failed ? ' na consulta parcial' : ''}.</p>
      <ul className="space-y-2">
        {filtered.slice(0, visible).map((event) => <li key={event.id}>
          <Link href={`/admin/publicacoes/${encodeURIComponent(event.id)}#${content}`} className="border-border flex min-h-12 flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
            <span className="font-medium">{event.title}</span><span className="text-muted text-sm">{event.date} · Abrir {content === 'noticia' ? 'notícia' : 'aviso'} na ficha</span>
          </Link>
        </li>)}
      </ul>
      {!filtered.length && <p>{failed ? 'Consulta indisponível ou sem resultados na parte carregada.' : 'Nenhum acontecimento encontrado. Confira a busca antes de criar outro registro.'}</p>}
      {filtered.length > visible && <button type="button" onClick={() => setVisible((count) => count + 30)} className="border-border min-h-11 rounded-xl border px-4 py-2">Mostrar mais acontecimentos</button>}
    </section>
  );
}

'use client';

import { useActionState, useEffect, useState } from 'react';
import type { Event as LodgeEvent, LibraryItem } from '@vl6/domain';
import { BookOpen, Button, Card, CardContent, EmptyState, Select } from '@vl6/ui';
import { requestLibraryCartAction, type LibraryActionState } from '../actions/library-actions';

const CART_KEY = 'vl6-library-cart';

function readCart(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function AddToLibraryCartButton({ itemId, title }: { itemId: string; title: string }) {
  const [added, setAdded] = useState(false);
  useEffect(() => setAdded(readCart().includes(itemId)), [itemId]);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={added}
      className="w-full sm:w-auto"
      aria-label={added ? `${title} já está no carrinho` : `Adicionar ${title} ao carrinho`}
      onClick={() => {
        localStorage.setItem(CART_KEY, JSON.stringify([...new Set([...readCart(), itemId])]));
        setAdded(true);
        window.dispatchEvent(new globalThis.Event('library-cart'));
      }}
    >
      {added ? 'No carrinho' : 'Adicionar ao carrinho'}
    </Button>
  );
}

export function LibraryCart({ items, events }: { items: LibraryItem[]; events: LodgeEvent[] }) {
  const [ids, setIds] = useState<string[]>([]);
  const [state, action] = useActionState<LibraryActionState, FormData>(requestLibraryCartAction, {
    error: null,
  });
  useEffect(() => setIds(readCart()), []);
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(CART_KEY);
      setIds([]);
    }
  }, [state.success]);
  const selected = items.filter((item) => ids.includes(item.id));

  if (selected.length === 0 && !state.success) {
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Adicione uma ou mais obras físicas pelo catálogo."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {selected.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
            <div className="bg-surface text-muted flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border sm:h-24 sm:w-16">
              {item.capaUrl ? (
                <img
                  src={item.capaUrl}
                  alt={`Capa de ${item.titulo ?? 'obra'}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <BookOpen size={24} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <b className="block break-words">{item.titulo}</b>
              <span className="text-muted mt-1 block text-sm">
                {item.autor ?? 'Autoria não informada'}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                const next = ids.filter((id) => id !== item.id);
                setIds(next);
                localStorage.setItem(CART_KEY, JSON.stringify(next));
              }}
            >
              Remover
            </Button>
          </CardContent>
        </Card>
      ))}
      {selected.length > 0 && (
        <form action={action} className="grid gap-3 rounded-xl border p-4">
          <input
            type="hidden"
            name="libraryItemIds"
            value={selected.map((item) => item.id).join(',')}
          />
          <label className="grid gap-1 text-sm">
            Sessão para retirada
            <Select name="pickupEventId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.titulo} · {event.dataInicio.toLocaleDateString('pt-BR')}
                </option>
              ))}
            </Select>
          </label>
          {events.length === 0 && (
            <p className="text-sm text-amber-700">
              Não há sessões futuras cadastradas para retirada.
            </p>
          )}
          <Button className="w-full sm:w-fit" disabled={events.length === 0}>
            Solicitar pacote com {selected.length} obra(s)
          </Button>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.success && <p className="text-sm text-green-700">{state.success}</p>}
          {state.warning && <p className="text-sm text-amber-700">{state.warning}</p>}
        </form>
      )}
      {state.success && (
        <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{state.success}</p>
      )}
    </div>
  );
}

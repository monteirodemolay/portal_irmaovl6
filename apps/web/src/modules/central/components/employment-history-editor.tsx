'use client';

import { useState } from 'react';
import type { CentralEmploymentEntry } from '@vl6/domain';
import { Button, Input, Textarea, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';

const MAX_ENTRIES = 15;

interface EmploymentDraft {
  id: string;
  empresa: string;
  cargo: string;
  /** Sempre "AAAA-MM" (`<input type="month">`) ou string vazia — nunca `Date` no rascunho do client. */
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricao: string;
}

function toMonthInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDraft(entry: CentralEmploymentEntry): EmploymentDraft {
  return {
    id: entry.id,
    empresa: entry.empresa,
    cargo: entry.cargo ?? '',
    dataInicio: entry.dataInicio ? toMonthInput(entry.dataInicio) : '',
    dataFim: entry.dataFim ? toMonthInput(entry.dataFim) : '',
    atual: entry.atual,
    descricao: entry.descricao ?? '',
  };
}

function emptyDraft(): EmploymentDraft {
  return {
    id: crypto.randomUUID(),
    empresa: '',
    cargo: '',
    dataInicio: '',
    dataFim: '',
    atual: true,
    descricao: '',
  };
}

/**
 * Editor do "Histórico Profissional" — currículo simplificado (empresas,
 * cargos, períodos) que o Irmão mantém sobre si mesmo. Mesmo componente
 * usado no Meu Espaço (autoatendimento) e no cadastro assistido
 * (Administração corrigindo/completando em nome de um Irmão) — cada um só
 * muda o `<form>`/action em volta. `name` é o campo escondido serializado em
 * JSON, mesmo padrão de `negocios`/`afiliacoes` (`jsonArrayOrCurrent` nas
 * Server Actions).
 */
export function EmploymentHistoryEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: CentralEmploymentEntry[];
}) {
  const [items, setItems] = useState<EmploymentDraft[]>(() => defaultValue.map(toDraft));

  function update(index: number, patch: Partial<EmploymentDraft>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const payload = items.map((item) => ({
    id: item.id,
    empresa: item.empresa,
    cargo: item.cargo.trim() || null,
    dataInicio: item.dataInicio || null,
    dataFim: item.atual ? null : item.dataFim || null,
    atual: item.atual,
    descricao: item.descricao.trim() || null,
  }));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs font-semibold uppercase tracking-wide">
              Período {index + 1}
            </span>
            <button
              type="button"
              aria-label={`Remover período ${index + 1}`}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              className="text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Empresa" htmlFor={`historico-empresa-${item.id}`}>
              <Input
                id={`historico-empresa-${item.id}`}
                value={item.empresa}
                onChange={(e) => update(index, { empresa: e.target.value })}
              />
            </FormField>
            <FormField label="Cargo" htmlFor={`historico-cargo-${item.id}`}>
              <Input
                id={`historico-cargo-${item.id}`}
                value={item.cargo}
                onChange={(e) => update(index, { cargo: e.target.value })}
              />
            </FormField>
            <FormField label="Início" htmlFor={`historico-inicio-${item.id}`}>
              <Input
                id={`historico-inicio-${item.id}`}
                type="month"
                value={item.dataInicio}
                onChange={(e) => update(index, { dataInicio: e.target.value })}
              />
            </FormField>
            {!item.atual && (
              <FormField label="Término" htmlFor={`historico-fim-${item.id}`}>
                <Input
                  id={`historico-fim-${item.id}`}
                  type="month"
                  value={item.dataFim}
                  onChange={(e) => update(index, { dataFim: e.target.value })}
                />
              </FormField>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={item.atual}
              onChange={(e) =>
                update(index, {
                  atual: e.target.checked,
                  dataFim: e.target.checked ? '' : item.dataFim,
                })
              }
            />
            Trabalho aqui atualmente
          </label>
          <FormField
            label="O que fazia/faz por lá (opcional)"
            htmlFor={`historico-descricao-${item.id}`}
          >
            <Textarea
              id={`historico-descricao-${item.id}`}
              rows={2}
              maxLength={500}
              value={item.descricao}
              onChange={(e) => update(index, { descricao: e.target.value })}
            />
          </FormField>
        </div>
      ))}
      {items.length < MAX_ENTRIES && (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => setItems((current) => [...current, emptyDraft()])}
        >
          Adicionar período
        </Button>
      )}
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { EDUCATION_LEVEL_KEYS, EDUCATION_LEVEL_LABELS, type EducationLevelKey } from '@vl6/shared';
import type { CentralEducationEntry } from '@vl6/domain';
import { Button, Input, Select, Textarea, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';

const MAX_ENTRIES = 20;

interface EducationDraft {
  id: string;
  nivel: EducationLevelKey | '';
  instituicao: string;
  curso: string;
  /** Sempre "AAAA-MM" (`<input type="month">`) ou string vazia — nunca `Date` no rascunho do client. */
  dataInicio: string;
  dataFim: string;
  atual: boolean;
  descricao: string;
}

function toMonthInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toDraft(entry: CentralEducationEntry): EducationDraft {
  return {
    id: entry.id,
    nivel: entry.nivel,
    instituicao: entry.instituicao,
    curso: entry.curso ?? '',
    dataInicio: entry.dataInicio ? toMonthInput(entry.dataInicio) : '',
    dataFim: entry.dataFim ? toMonthInput(entry.dataFim) : '',
    atual: entry.atual,
    descricao: entry.descricao ?? '',
  };
}

function emptyDraft(): EducationDraft {
  return {
    id: crypto.randomUUID(),
    nivel: '',
    instituicao: '',
    curso: '',
    dataInicio: '',
    dataFim: '',
    atual: false,
    descricao: '',
  };
}

/**
 * Editor da "Formação Acadêmica" — currículo educacional simplificado
 * (nível, instituição, curso/área, período), do Ensino Infantil ao
 * Pós-Doutorado, nenhum campo obrigatório além de nível e instituição.
 * Mesmo componente usado no Meu Espaço e no cadastro assistido — mesmo
 * padrão de `EmploymentHistoryEditor`, que serviu de modelo.
 */
export function EducationHistoryEditor({
  name,
  defaultValue,
  knownInstitutions = [],
}: {
  name: string;
  defaultValue: CentralEducationEntry[];
  /** Instituições já cadastradas no tenant (por qualquer Irmão) — alimenta um `<datalist>`, reduz duplicação. */
  knownInstitutions?: string[];
}) {
  const [items, setItems] = useState<EducationDraft[]>(() => defaultValue.map(toDraft));

  function update(index: number, patch: Partial<EducationDraft>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const payload = items
    .filter((item) => item.nivel && item.instituicao.trim())
    .map((item) => ({
      id: item.id,
      nivel: item.nivel,
      instituicao: item.instituicao,
      curso: item.curso.trim() || null,
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
              Formação {index + 1}
            </span>
            <button
              type="button"
              aria-label={`Remover formação ${index + 1}`}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              className="text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Nível" htmlFor={`formacao-nivel-${item.id}`}>
              <Select
                id={`formacao-nivel-${item.id}`}
                value={item.nivel}
                onChange={(e) => update(index, { nivel: e.target.value as EducationLevelKey })}
              >
                <option value="">Selecione</option>
                {EDUCATION_LEVEL_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {EDUCATION_LEVEL_LABELS[key]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Instituição" htmlFor={`formacao-instituicao-${item.id}`}>
              <Input
                id={`formacao-instituicao-${item.id}`}
                list="formacao-instituicoes-conhecidas"
                value={item.instituicao}
                onChange={(e) => update(index, { instituicao: e.target.value })}
              />
            </FormField>
            <FormField label="Curso / área (opcional)" htmlFor={`formacao-curso-${item.id}`}>
              <Input
                id={`formacao-curso-${item.id}`}
                value={item.curso}
                onChange={(e) => update(index, { curso: e.target.value })}
              />
            </FormField>
            <FormField label="Início" htmlFor={`formacao-inicio-${item.id}`}>
              <Input
                id={`formacao-inicio-${item.id}`}
                type="month"
                value={item.dataInicio}
                onChange={(e) => update(index, { dataInicio: e.target.value })}
              />
            </FormField>
            {!item.atual && (
              <FormField label="Término" htmlFor={`formacao-fim-${item.id}`}>
                <Input
                  id={`formacao-fim-${item.id}`}
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
            Ainda estou cursando
          </label>
          <FormField label="Observações (opcional)" htmlFor={`formacao-descricao-${item.id}`}>
            <Textarea
              id={`formacao-descricao-${item.id}`}
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
          Adicionar formação
        </Button>
      )}
      <datalist id="formacao-instituicoes-conhecidas">
        {knownInstitutions.map((institution) => (
          <option key={institution} value={institution} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={JSON.stringify(payload)} />
    </div>
  );
}

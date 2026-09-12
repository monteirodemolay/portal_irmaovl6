'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Event } from '@vl6/domain';
import {
  EVENT_KIND_LABELS,
  EVENT_KINDS,
  formatSessionName,
  inferAccessFromNature,
  inferDegreeWorkFromNature,
  SESSION_ACCESS_KINDS,
  SESSION_ACCESS_LABELS,
  SESSION_NATURE_LABELS,
  SESSION_NATURES_BY_TYPE,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  SESSION_WORK_DEGREE_LABELS,
  SESSION_WORK_DEGREES,
  type SessionAccessKind,
  type SessionType,
  type SessionWorkDegree,
} from '@vl6/shared';
import { Badge, Button, Card, CardContent, Input, Select } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createEventForPublishAction,
  previewBoardTermForDateAction,
  type BoardTermPreview,
  type CreateEventForPublishState,
} from '../../actions/publish-hub-actions';

const EMPTY_STATE: CreateEventForPublishState = { error: null, event: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Cadastrando…' : 'Cadastrar e continuar'}
    </Button>
  );
}

/**
 * Cadastro retroativo inline do passo 1 — mostra a Gestão identificada
 * pela data ANTES de salvar (`previewBoardTermForDateAction`, sem
 * persistir), disparado a cada mudança de data. Inclui a mesma
 * classificação estruturada de Sessão do formulário completo da Agenda
 * (`EventForm`) — sem isso, uma Sessão de Iniciação/Elevação/Exaltação
 * retroativa só podia ser criada saindo daqui, o que empurrava o
 * Administrador a cadastrar "Evento" avulso por Irmão em vez de uma
 * única Sessão (a causa raiz dos rascunhos duplicados que
 * `MergeArchiveItemsUseCase` existe pra corrigir depois do fato).
 */
export function CreateEventInlineForm({ onCreated }: { onCreated: (event: Event) => void }) {
  const [state, formAction] = useActionState(
    async (_prevState: CreateEventForPublishState, formData: FormData) => {
      const result = await createEventForPublishAction(_prevState, formData);
      if (result.event) onCreated(result.event);
      return result;
    },
    EMPTY_STATE,
  );
  const [boardTermPreview, setBoardTermPreview] = useState<BoardTermPreview | null>(null);
  const [boardTermChecked, setBoardTermChecked] = useState(false);

  const [tipo, setTipo] = useState('evento');
  const isSessao = tipo === 'sessao';
  const [sessionType, setSessionType] = useState<SessionType | ''>('');
  const [sessionNature, setSessionNature] = useState('');
  const [degreeWork, setDegreeWork] = useState<SessionWorkDegree | ''>('');
  const [access, setAccess] = useState<SessionAccessKind | ''>('');
  const [tituloTocado, setTituloTocado] = useState(false);
  const [titulo, setTitulo] = useState('');

  const naturezasDisponiveis = sessionType ? SESSION_NATURES_BY_TYPE[sessionType] : [];

  const sugestaoTitulo = useMemo(() => {
    if (!sessionType || !sessionNature) return '';
    return formatSessionName({ sessionType, sessionNature, access: access || null });
  }, [sessionType, sessionNature, access]);

  function handleTipoChange(value: string) {
    setTipo(value);
    if (value !== 'sessao') {
      setSessionType('');
      setSessionNature('');
      setDegreeWork('');
      setAccess('');
    }
  }

  function handleSessionTypeChange(value: string) {
    const nextType = value as SessionType;
    setSessionType(nextType);
    setSessionNature('');
    setDegreeWork('');
    setAccess('');
    if (!tituloTocado) setTitulo('');
  }

  function handleSessionNatureChange(value: string) {
    setSessionNature(value);
    const inferredDegree = inferDegreeWorkFromNature(value);
    if (inferredDegree) setDegreeWork(inferredDegree);
    const inferredAccess = inferAccessFromNature(value);
    if (inferredAccess) setAccess(inferredAccess);
    if (!tituloTocado && sessionType) {
      setTitulo(
        formatSessionName({
          sessionType,
          sessionNature: value,
          access: inferredAccess ?? (access || null),
        }),
      );
    }
  }

  async function handleDateChange(value: string) {
    if (!value) {
      setBoardTermChecked(false);
      setBoardTermPreview(null);
      return;
    }
    const preview = await previewBoardTermForDateAction(value);
    setBoardTermPreview(preview);
    setBoardTermChecked(true);
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo" htmlFor="tipo">
              <Select
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => handleTipoChange(e.target.value)}
                required
              >
                {EVENT_KINDS.filter((kind) => kind !== 'aniversario').map((kind) => (
                  <option key={kind} value={kind}>
                    {EVENT_KIND_LABELS[kind]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Local" htmlFor="local">
              <Input id="local" name="local" required maxLength={200} />
            </FormField>
          </div>

          {isSessao && (
            <div className="border-border flex flex-col gap-4 rounded-lg border p-3">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                Classificação da Sessão
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Tipo da Sessão" htmlFor="sessionType">
                  <Select
                    id="sessionType"
                    name="sessionType"
                    required={isSessao}
                    value={sessionType}
                    onChange={(e) => handleSessionTypeChange(e.target.value)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {SESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SESSION_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                {sessionType && (
                  <FormField label="Natureza" htmlFor="sessionNature">
                    <Select
                      id="sessionNature"
                      name="sessionNature"
                      value={sessionNature}
                      onChange={(e) => handleSessionNatureChange(e.target.value)}
                    >
                      <option value="" disabled>
                        Selecione…
                      </option>
                      {naturezasDisponiveis.map((nature) => (
                        <option key={nature} value={nature}>
                          {SESSION_NATURE_LABELS[nature] ?? nature}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Grau dos trabalhos"
                  htmlFor="degreeWork"
                  description="Preenchido automaticamente pela Natureza — ajuste se necessário."
                >
                  <Select
                    id="degreeWork"
                    name="degreeWork"
                    value={degreeWork}
                    onChange={(e) => setDegreeWork(e.target.value as SessionWorkDegree)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {SESSION_WORK_DEGREES.map((degree) => (
                      <option key={degree} value={degree}>
                        {SESSION_WORK_DEGREE_LABELS[degree]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Acesso" htmlFor="access">
                  <Select
                    id="access"
                    name="access"
                    value={access}
                    onChange={(e) => setAccess(e.target.value as SessionAccessKind)}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {SESSION_ACCESS_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {SESSION_ACCESS_LABELS[kind]}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              {sugestaoTitulo && (
                <p className="text-muted text-xs">
                  Nome sugerido: <strong>{sugestaoTitulo}</strong> — ajustável no campo Título
                  abaixo.
                </p>
              )}
            </div>
          )}

          <FormField label="Título" htmlFor="titulo">
            <Input
              id="titulo"
              name="titulo"
              required
              maxLength={200}
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTituloTocado(true);
              }}
            />
          </FormField>

          <FormField
            label="Data e hora"
            htmlFor="dataInicio"
            description={
              boardTermChecked
                ? boardTermPreview
                  ? undefined
                  : 'Nenhuma Gestão cadastrada cobre esta data — o evento ainda pode ser criado.'
                : 'A Gestão vigente é identificada automaticamente ao informar a data.'
            }
          >
            <Input
              id="dataInicio"
              name="dataInicio"
              type="datetime-local"
              required
              onChange={(event) => handleDateChange(event.target.value)}
            />
          </FormField>
          {boardTermChecked && boardTermPreview && (
            <p className="text-sm">
              Gestão identificada: <Badge variant="accent">{boardTermPreview.nome}</Badge>
            </p>
          )}
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

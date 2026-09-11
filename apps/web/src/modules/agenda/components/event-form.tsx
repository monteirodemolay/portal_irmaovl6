'use client';

import { useActionState, useMemo, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import type { Event } from '@vl6/domain';
import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
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
  type JointLodgeReference,
  type SessionAccessKind,
  type SessionType,
  type SessionWorkDegree,
} from '@vl6/shared';
import { Button, Image as ImageIcon, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { ResolvedArchiveItem } from '@/modules/archive/lib/resolve-archive-item';
import { AgendaAttachmentPicker } from './agenda-attachment-picker';
import {
  createEventAction,
  importEventContentFromVl6Action,
  updateEventAction,
  type AgendaActionState,
} from '../actions/agenda-actions';

const EMPTY_STATE: AgendaActionState = { error: null };

const EMPTY_LODGE: JointLodgeReference = {
  nome: '',
  numero: null,
  oriente: null,
  potencia: null,
  observacao: null,
};

function toDatetimeLocalValue(date: Date | null): string | undefined {
  if (!date) return undefined;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function EventForm({
  event,
  initialAttachments = [],
}: {
  /** Presente = modo edição (pré-preenche e salva via `updateEventAction`); ausente = criação. */
  event?: Event;
  initialAttachments?: ResolvedArchiveItem[];
}) {
  const action = event ? updateEventAction.bind(null, event.id) : createEventAction;
  const [state, formAction] = useActionState<AgendaActionState, FormData>(action, EMPTY_STATE);

  const [tipo, setTipo] = useState(event?.tipo ?? '');
  const isSessao = tipo === 'sessao';

  const [sessionType, setSessionType] = useState<SessionType | ''>(event?.sessionType ?? '');
  const [sessionNature, setSessionNature] = useState(event?.sessionNature ?? '');
  const [degreeWork, setDegreeWork] = useState<SessionWorkDegree | ''>(event?.degreeWork ?? '');
  const [access, setAccess] = useState<SessionAccessKind | ''>(event?.access ?? '');
  const [isJointSession, setIsJointSession] = useState(event?.isJointSession ?? false);
  const [lodges, setLodges] = useState<JointLodgeReference[]>(
    event?.participatingLodges?.length ? event.participatingLodges : [EMPTY_LODGE],
  );
  const [tituloTocado, setTituloTocado] = useState(Boolean(event));
  const [titulo, setTitulo] = useState(event?.titulo ?? '');
  const [descricao, setDescricao] = useState(event?.descricao ?? '');
  const [capaUrlExterna, setCapaUrlExterna] = useState<string | null>(null);

  const naturezasDisponiveis = sessionType ? SESSION_NATURES_BY_TYPE[sessionType] : [];

  const sugestaoTitulo = useMemo(() => {
    if (!sessionType || !sessionNature) return '';
    return formatSessionName({
      sessionType,
      sessionNature,
      access: access || null,
    });
  }, [sessionType, sessionNature, access]);

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

  function updateLodge(index: number, patch: Partial<JointLodgeReference>) {
    setLodges((current) =>
      current.map((lodge, i) => (i === index ? { ...lodge, ...patch } : lodge)),
    );
  }

  function handleImportedFromVl6(imported: {
    titulo: string;
    descricao: string | null;
    capaUrl: string | null;
  }) {
    setTitulo(imported.titulo);
    setTituloTocado(true);
    setDescricao(imported.descricao ?? '');
    setCapaUrlExterna(imported.capaUrl);
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <ImportFromVl6Field onImported={handleImportedFromVl6} />

      <FormField label="Tipo" htmlFor="tipo">
        <Select
          id="tipo"
          name="tipo"
          required
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          <option value="" disabled>
            Selecione…
          </option>
          {EVENT_KINDS.filter((kind) => kind !== 'aniversario').map((kind) => (
            <option key={kind} value={kind}>
              {EVENT_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>

      {isSessao && (
        <div className="border-border flex flex-col gap-4 rounded-lg border p-3">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            Classificação da Sessão
          </p>

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

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Grau dos trabalhos"
              htmlFor="degreeWork"
              description="Preenchido automaticamente quando a Natureza já implica um grau — ajuste se necessário."
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

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isJointSession"
              className="h-4 w-4"
              checked={isJointSession}
              onChange={(e) => setIsJointSession(e.target.checked)}
            />
            Sessão realizada conjuntamente com outra Loja
          </label>

          {isJointSession && (
            <div className="flex flex-col gap-3">
              {lodges.map((lodge, index) => (
                <div
                  key={index}
                  className="border-border-soft grid grid-cols-2 gap-2 rounded-md border p-2"
                >
                  <Input
                    name="lodgeNome"
                    placeholder="Nome da Loja"
                    value={lodge.nome}
                    onChange={(e) => updateLodge(index, { nome: e.target.value })}
                  />
                  <Input
                    name="lodgeNumero"
                    placeholder="Número"
                    value={lodge.numero ?? ''}
                    onChange={(e) => updateLodge(index, { numero: e.target.value })}
                  />
                  <Input
                    name="lodgeOriente"
                    placeholder="Oriente"
                    value={lodge.oriente ?? ''}
                    onChange={(e) => updateLodge(index, { oriente: e.target.value })}
                  />
                  <Input
                    name="lodgePotencia"
                    placeholder="Potência"
                    value={lodge.potencia ?? ''}
                    onChange={(e) => updateLodge(index, { potencia: e.target.value })}
                  />
                  <Input
                    name="lodgeObservacao"
                    placeholder="Observação (opcional)"
                    className="col-span-2"
                    value={lodge.observacao ?? ''}
                    onChange={(e) => updateLodge(index, { observacao: e.target.value })}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => setLodges((current) => [...current, EMPTY_LODGE])}
              >
                + Adicionar Loja
              </Button>
            </div>
          )}

          {sugestaoTitulo && (
            <p className="text-muted text-xs">
              Nome sugerido: <strong>{sugestaoTitulo}</strong> — ajustável no campo Título abaixo.
            </p>
          )}
        </div>
      )}

      <FormField label="Título" htmlFor="titulo">
        <Input
          id="titulo"
          name="titulo"
          required
          value={titulo}
          onChange={(e) => {
            setTitulo(e.target.value);
            setTituloTocado(true);
          }}
        />
      </FormField>
      <FormField label="Descrição (opcional)" htmlFor="descricao">
        <Textarea
          id="descricao"
          name="descricao"
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </FormField>
      <FormField
        label="Imagem de capa (opcional)"
        htmlFor="capaImagem"
        description='Formato quadrado (1:1), estilo Instagram — aparece revezando em "Eventos da Loja" no Início. Sem capa, o Evento continua exibido com as informações em texto sobre um fundo em degradê.'
      >
        <input type="hidden" name="capaUrlExterna" value={capaUrlExterna ?? ''} />
        <EventCoverField capaUrl={event?.capaUrl} importedPreviewUrl={capaUrlExterna} />
      </FormField>
      <FormField label="Local" htmlFor="local">
        <Input id="local" name="local" required defaultValue={event?.local} />
      </FormField>
      <FormField label="Início" htmlFor="dataInicio">
        <Input
          id="dataInicio"
          name="dataInicio"
          type="datetime-local"
          required
          defaultValue={event ? toDatetimeLocalValue(event.dataInicio) : undefined}
        />
      </FormField>
      <FormField
        label="Fim (opcional)"
        htmlFor="dataFim"
        description="Deixe em branco quando não houver horário de encerramento definido (comum em sessões)."
      >
        <Input
          id="dataFim"
          name="dataFim"
          type="datetime-local"
          defaultValue={event ? toDatetimeLocalValue(event.dataFim) : undefined}
        />
      </FormField>
      <FormField
        label="Capacidade máxima (opcional)"
        htmlFor="capacidadeMaxima"
        description="Confirmações além do limite entram em lista de espera automaticamente."
      >
        <Input
          id="capacidadeMaxima"
          name="capacidadeMaxima"
          type="number"
          min={1}
          defaultValue={event?.capacidadeMaxima ?? undefined}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="exigeConfirmacaoPresenca"
          className="h-4 w-4"
          defaultChecked={event?.exigeConfirmacaoPresenca}
        />
        Exigir confirmação de presença
      </label>

      <FormField
        label="Traje (opcional)"
        htmlFor="traje"
        description='Ex.: "Social completo (terno escuro)".'
      >
        <Input id="traje" name="traje" defaultValue={event?.traje ?? ''} />
      </FormField>
      <FormField
        label="Chegada sugerida (opcional)"
        htmlFor="chegadaSugerida"
        description='Ex.: "19:30, para preparação".'
      >
        <Input
          id="chegadaSugerida"
          name="chegadaSugerida"
          defaultValue={event?.chegadaSugerida ?? ''}
        />
      </FormField>
      <FormField label="Observações (opcional)" htmlFor="observacoes">
        <Textarea
          id="observacoes"
          name="observacoes"
          rows={2}
          defaultValue={event?.observacoes ?? ''}
        />
      </FormField>

      <FormField
        label="Arquivos relacionados (opcional)"
        htmlFor="arquivosRelacionados-input"
        description="Aponta para itens já existentes no Acervo VL6 — não faz upload aqui."
      >
        <AgendaAttachmentPicker
          initial={initialAttachments.map((item) => ({
            compositeId: item.compositeId,
            titulo: item.titulo,
            kindLabel: item.kindLabel,
            viewHref: item.viewHref,
          }))}
        />
      </FormField>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton isEditing={Boolean(event)} />
    </form>
  );
}

/**
 * Cola o link de um post já publicado em vl6.com.br e pré-preenche
 * Título/Descrição/Capa a partir do Open Graph da página (mesma técnica da
 * importação de Notícias) — o site é Wix (renderizado via JS), então só dá
 * pra trazer título, resumo curto e imagem de capa, nunca o texto integral
 * do post; o Administrador revisa/completa a Descrição antes de salvar.
 */
function ImportFromVl6Field({
  onImported,
}: {
  onImported: (imported: {
    titulo: string;
    descricao: string | null;
    capaUrl: string | null;
  }) => void;
}) {
  const [url, setUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await importEventContentFromVl6Action(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImported({ titulo: result.titulo, descricao: result.descricao, capaUrl: result.capaUrl });
      setUrl('');
    });
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-xs font-medium">Importar do site VL6 (opcional)</p>
      <p className="text-muted text-xs">
        Cole o link do post em vl6.com.br pra preencher Título, Descrição e Capa automaticamente —
        revise antes de salvar.
      </p>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.vl6.com.br/post/..."
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleImport}
          disabled={isPending || !url.trim()}
          className="shrink-0"
        >
          {isPending ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Mesmo limite de `MAX_EVENT_COVER_SIZE_BYTES`
// (`@/lib/agenda/event-cover-upload`, server-only) — duplicado aqui porque
// esse componente é client e não pode importar aquele módulo. Barra o
// arquivo grande demais ANTES do envio: sem essa checagem, um arquivo
// perto do teto de 20 MB da Server Action (`serverActions.bodySizeLimit`,
// next.config.ts) faz o Next rejeitar a requisição inteira antes do código
// da aplicação rodar — sem log, sem mensagem amigável, só a tela de erro
// genérica ("Algo deu errado").
const MAX_EVENT_COVER_SIZE_BYTES = 5 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Mesmo padrão do `LogoUploader` de Negócios (`empresa-tab.tsx`) — o
 * arquivo viaja dentro do próprio `<form>` do Evento (campo `capaImagem`),
 * sem action/upload separado; `agenda-actions.ts` extrai e sobe pro Blob
 * só no submit. "Remover imagem atual" só aparece quando já existe uma
 * capa e nenhum arquivo novo foi selecionado.
 */
function EventCoverField({
  capaUrl,
  importedPreviewUrl,
}: {
  capaUrl: string | null | undefined;
  /** Capa trazida pela importação do site VL6 (`capaUrlExterna`) — some se o Administrador escolher um arquivo próprio ou marcar "Remover". */
  importedPreviewUrl?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const shown = preview ?? (removed ? null : (importedPreviewUrl ?? capaUrl ?? null));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <label
          htmlFor="capaImagem"
          className="border-border bg-surface hover:border-primary group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
          title="Enviar imagem de capa"
        >
          {shown ? (
            <img src={shown} alt="Capa do evento" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-muted" strokeWidth={1.5} />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100">
            Trocar
          </span>
          <input
            id="capaImagem"
            name="capaImagem"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size > MAX_EVENT_COVER_SIZE_BYTES) {
                setSizeError(
                  `Essa imagem tem ${formatMegabytes(file.size)} — o limite é ${formatMegabytes(MAX_EVENT_COVER_SIZE_BYTES)}. Escolha outra.`,
                );
                e.target.value = '';
                return;
              }
              setSizeError(null);
              setPreview(file ? URL.createObjectURL(file) : null);
              if (file) setRemoved(false);
            }}
          />
        </label>
        {shown && (
          <label className="flex w-fit items-center gap-1.5 text-xs text-red-600">
            <input
              type="checkbox"
              name="removerCapa"
              className="h-3.5 w-3.5"
              onChange={(e) => {
                setRemoved(e.target.checked);
                if (e.target.checked) setPreview(null);
              }}
            />
            Remover imagem atual
          </label>
        )}
      </div>
      {sizeError && <p className="text-xs text-red-600">{sizeError}</p>}
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar evento'}
    </Button>
  );
}

'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import type { PersonalNote } from '@vl6/domain';
import {
  ArrowUpRight,
  Button,
  Clock,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  MapPin,
  Textarea,
  cn,
} from '@vl6/ui';
import { AttendanceButtons } from './attendance-buttons';
import { getMyAttendanceStatusAction } from '../actions/agenda-actions';
import { upsertPersonalEventNoteAction } from '../actions/personal-note-actions';
import { SOURCE_BADGE_CLASS, SOURCE_LABELS, type CalendarItem } from '../lib/calendar-item';

function formatDateTime(item: CalendarItem): string {
  const start = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(
    item.inicio,
  );
  if (!item.fim) return start;
  const sameDay =
    item.inicio.getFullYear() === item.fim.getFullYear() &&
    item.inicio.getMonth() === item.fim.getMonth() &&
    item.inicio.getDate() === item.fim.getDate();
  const end = sameDay
    ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(item.fim)
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(item.fim);
  return `${start} até ${end}`;
}

export interface EventDetailPanelProps {
  item: CalendarItem | null;
  onOpenChange: (open: boolean) => void;
  /** Só true se o evento estiver no conjunto carregado pelo `AgendaProvider` global (drawer institucional). */
  isVl6InDrawer: (item: CalendarItem) => boolean;
  onOpenVl6Drawer: (id: string) => void;
  onEditPersonal: (item: CalendarItem) => void;
  personalNotes: PersonalNote[];
}

/**
 * Painel lateral de detalhes — resumo rápido para qualquer origem, sem
 * duplicar o drawer institucional (VL6 só mostra um resumo + botão "Ver
 * detalhes completos" que abre o `AgendaDrawer` de verdade, intocado) nem o
 * `PersonalEventDrawer` (pessoal mostra resumo + "Editar", que abre aquele
 * drawer já existente). Único conteúdo genuinamente novo aqui: a anotação
 * privada vinculada ao evento, com autosave ao perder o foco.
 */
export function EventDetailPanel({
  item,
  onOpenChange,
  isVl6InDrawer,
  onOpenVl6Drawer,
  onEditPersonal,
  personalNotes,
}: EventDetailPanelProps) {
  // Mantém o último item durante a animação de saída — `item` já virou
  // `null` nesse momento (fechado pelo pai), mas o corpo não pode sumir
  // antes do slide-out do Drawer terminar.
  const [lastItem, setLastItem] = useState<CalendarItem | null>(null);
  useEffect(() => {
    if (item) setLastItem(item);
  }, [item]);

  return (
    <Drawer open={item !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-sm">
        {lastItem && (
          <EventDetailPanelBody
            item={lastItem}
            isVl6InDrawer={isVl6InDrawer}
            onOpenVl6Drawer={onOpenVl6Drawer}
            onEditPersonal={onEditPersonal}
            personalNotes={personalNotes}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function EventDetailPanelBody({
  item,
  isVl6InDrawer,
  onOpenVl6Drawer,
  onEditPersonal,
  personalNotes,
  onClose,
}: {
  item: CalendarItem;
  isVl6InDrawer: (item: CalendarItem) => boolean;
  onOpenVl6Drawer: (id: string) => void;
  onEditPersonal: (item: CalendarItem) => void;
  personalNotes: PersonalNote[];
  onClose: () => void;
}) {
  const existingNote = personalNotes.find(
    (note) => note.eventoOrigem === item.source && note.eventoId === item.id,
  );

  return (
    <>
      <DrawerHeader>
        <span
          className={cn(
            'w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
            SOURCE_BADGE_CLASS[item.source],
          )}
        >
          {SOURCE_LABELS[item.source]}
        </span>
        <DrawerTitle>{item.titulo}</DrawerTitle>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-5">
        <div className="text-muted flex flex-col gap-1.5 text-sm">
          <span className="flex items-center gap-2">
            <Clock size={14} strokeWidth={1.75} />
            {formatDateTime(item)}
          </span>
          {item.local && (
            <span className="flex items-center gap-2">
              <MapPin size={14} strokeWidth={1.75} />
              {item.local}
            </span>
          )}
        </div>

        {item.source === 'vl6' && !item.isBirthday && (
          <Vl6Section
            item={item}
            isVl6InDrawer={isVl6InDrawer}
            onOpenVl6Drawer={onOpenVl6Drawer}
            onClose={onClose}
          />
        )}

        {item.source === 'personal' && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              onClose();
              onEditPersonal(item);
            }}
          >
            Editar compromisso
          </Button>
        )}

        {item.source === 'google' && (
          <p className="text-muted text-xs">
            Evento importado do Google Agenda — somente leitura por aqui. Para alterar, edite direto
            no Google Agenda.
          </p>
        )}

        {!item.isBirthday && (
          <PrivateNoteField item={item} initialText={existingNote?.texto ?? ''} />
        )}
      </DrawerBody>
    </>
  );
}

function Vl6Section({
  item,
  isVl6InDrawer,
  onOpenVl6Drawer,
  onClose,
}: {
  item: CalendarItem;
  isVl6InDrawer: (item: CalendarItem) => boolean;
  onOpenVl6Drawer: (id: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'confirmado' | 'recusado' | 'pendente' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    getMyAttendanceStatusAction(item.id).then((result) => {
      if (!cancelled) {
        setStatus(result);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const inDrawer = isVl6InDrawer(item);

  return (
    <div className="flex flex-col gap-3">
      {loaded && <AttendanceButtons eventId={item.id} currentStatus={status} />}
      {inDrawer ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenVl6Drawer(item.id);
          }}
          className="text-primary flex w-fit items-center gap-1 text-xs font-semibold hover:underline"
        >
          Ver detalhes completos
          <ArrowUpRight size={12} strokeWidth={2} />
        </button>
      ) : (
        <Link
          href={`/eventos/${item.id}`}
          className="text-primary flex w-fit items-center gap-1 text-xs font-semibold hover:underline"
        >
          Ver detalhes completos
          <ArrowUpRight size={12} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

function PrivateNoteField({ item, initialText }: { item: CalendarItem; initialText: string }) {
  const [text, setText] = useState(initialText);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef(initialText);

  useEffect(() => {
    setText(initialText);
    lastSavedRef.current = initialText;
    setSaved(true);
  }, [item.id, initialText]);

  function handleBlur() {
    if (text === lastSavedRef.current) return;
    startTransition(async () => {
      await upsertPersonalEventNoteAction({
        eventoOrigem: item.source,
        eventoId: item.id,
        texto: text,
      });
      lastSavedRef.current = text;
      setSaved(true);
    });
  }

  return (
    <div className="border-border flex flex-col gap-1.5 border-t pt-4">
      <label className="text-xs font-semibold" htmlFor="private-note">
        Anotações privadas
      </label>
      <Textarea
        id="private-note"
        rows={3}
        placeholder="Só você vê isto..."
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
        onBlur={handleBlur}
        maxLength={2000}
      />
      <span className="text-muted text-[11px]">
        {isPending ? 'Salvando...' : saved ? 'Salvo' : 'Alterações não salvas'}
      </span>
    </div>
  );
}

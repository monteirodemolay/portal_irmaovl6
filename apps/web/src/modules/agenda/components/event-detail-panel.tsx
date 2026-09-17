'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { PersonalNote } from '@vl6/domain';
import {
  AlertTriangle,
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
  /**
   * Nunca `source: 'vl6'` — evento da Loja abre direto a gaveta
   * institucional (`AgendaDrawer`) ou, fora da janela carregada por ela,
   * `/eventos/[eventId]` (ver `MyAgendaView.handleSelectItem`). Este painel
   * só existe pra Pessoal e Google, que não têm outro lugar unificado.
   */
  item: CalendarItem | null;
  onOpenChange: (open: boolean) => void;
  onEditPersonal: (item: CalendarItem) => void;
  personalNotes: PersonalNote[];
  /** IDs de itens com choque de horário — aviso informativo, nunca bloqueia salvar. */
  overlapping: Set<string>;
}

/**
 * Painel lateral de detalhes de compromisso Pessoal/Google — resumo rápido
 * sem duplicar o `PersonalEventDrawer` (pessoal mostra resumo + "Editar",
 * que abre aquele drawer já existente). Único conteúdo genuinamente novo
 * aqui: a anotação privada vinculada ao evento, com autosave ao perder o
 * foco.
 */
export function EventDetailPanel({
  item,
  onOpenChange,
  onEditPersonal,
  personalNotes,
  overlapping,
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
            onEditPersonal={onEditPersonal}
            personalNotes={personalNotes}
            hasConflict={overlapping.has(lastItem.id)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function EventDetailPanelBody({
  item,
  onEditPersonal,
  personalNotes,
  hasConflict,
  onClose,
}: {
  item: CalendarItem;
  onEditPersonal: (item: CalendarItem) => void;
  personalNotes: PersonalNote[];
  hasConflict: boolean;
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

        {hasConflict && !item.isBirthday && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
            <p className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={12} strokeWidth={2} />
              Conflito de horário com outro compromisso
            </p>
            <p className="mt-0.5 text-red-600/90">
              Isso nem sempre é um problema — você decide se muda o horário ou deixa como está.
            </p>
            {item.source === 'personal' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPersonal(item);
                }}
                className="mt-1.5 font-semibold underline underline-offset-2 hover:text-red-800"
              >
                Alterar horário
              </button>
            )}
          </div>
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

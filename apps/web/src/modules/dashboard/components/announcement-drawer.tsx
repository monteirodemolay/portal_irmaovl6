'use client';

import type { Announcement } from '@vl6/domain';
import {
  ArrowLeft,
  ChevronRight,
  Badge,
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  EmptyState,
  Megaphone,
  Pin,
} from '@vl6/ui';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeZone: 'America/Sao_Paulo',
});

export function AnnouncementDrawer({
  announcements,
  open,
  selectedId,
  onSelect,
  onClose,
}: {
  announcements: Announcement[];
  open: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const selectedIndex = announcements.findIndex((a) => a.id === selectedId);
  const selected = announcements[selectedIndex] ?? null;

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent className="w-full max-w-2xl sm:rounded-l-3xl">
        <header className="border-border bg-surface border-b py-5 pl-5 pr-14 sm:pl-7 sm:pr-16">
          <p className="text-accent mb-2 text-xs font-semibold uppercase tracking-wide">
            Comunicação da Loja
          </p>
          <DrawerTitle className="text-xl sm:text-2xl">
            {selected ? 'Leitura do aviso' : 'Todos os avisos'}
          </DrawerTitle>
          <DrawerDescription className="mt-2 text-xs">
            Avisos publicados e vigentes, disponíveis na página inicial.
          </DrawerDescription>
        </header>
        <div
          key={selectedId ?? 'list'}
          className="bg-background min-h-0 flex-1 overflow-y-auto p-5 sm:p-7"
        >
          {selected ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelect(null)}
                className="mb-5"
              >
                <ArrowLeft size={16} />
                Voltar à lista
              </Button>
              <article className="border-border bg-surface rounded-xl border p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge variant={selected.prioridade === 'alta' ? 'destructive' : 'outline'}>
                    Aviso da Loja
                  </Badge>
                  {selected.destacar && (
                    <span className="text-muted flex items-center gap-1 text-xs">
                      <Pin size={13} />
                      Fixado
                    </span>
                  )}
                </div>
                <h2 className="font-display break-words text-2xl font-semibold">
                  {selected.titulo}
                </h2>
                <div className="text-muted mt-3 flex flex-col gap-1 text-xs">
                  {selected.dataPublicacao && (
                    <p>Publicado em {dateFormatter.format(selected.dataPublicacao)}</p>
                  )}
                  {selected.dataExpiracao && (
                    <p>Vigente até {dateFormatter.format(selected.dataExpiracao)}</p>
                  )}
                </div>
                <p className="mt-6 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {selected.descricao}
                </p>
              </article>
            </>
          ) : announcements.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={24} />}
              title="Nenhum aviso no momento"
              description="Novos avisos serão exibidos aqui e na página inicial quando publicados."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {announcements.map((announcement) => (
                <li key={announcement.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(announcement.id)}
                    className="border-border hover:border-accent bg-surface flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
                  >
                    <Megaphone size={18} className="text-accent mt-1 shrink-0" />
                    <span className="min-w-0 flex-1">
                      {announcement.destacar && (
                        <span className="text-muted mb-1 flex items-center gap-1 text-xs">
                          <Pin size={12} />
                          Fixado
                        </span>
                      )}
                      <span className="block break-words text-sm font-semibold">
                        {announcement.titulo}
                      </span>
                      <span className="text-muted mt-2 line-clamp-2 block break-words text-xs">
                        {announcement.descricao}
                      </span>
                      {announcement.dataExpiracao && (
                        <span className="text-muted mt-2 block text-xs">
                          Vigente até {dateFormatter.format(announcement.dataExpiracao)}
                        </span>
                      )}
                    </span>
                    <ChevronRight size={16} className="text-muted mt-1 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <footer className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-7">
          {selected ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIndex <= 0}
                onClick={() => onSelect(announcements[selectedIndex - 1]?.id ?? null)}
              >
                <ArrowLeft size={16} />
                Anterior
              </Button>
              <span className="text-muted text-xs" aria-live="polite">
                {selectedIndex + 1} de {announcements.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={selectedIndex >= announcements.length - 1}
                onClick={() => onSelect(announcements[selectedIndex + 1]?.id ?? null)}
              >
                Próximo
                <ChevronRight size={16} />
              </Button>
            </>
          ) : (
            <>
              <span className="text-muted text-xs">{announcements.length} aviso(s) vigente(s)</span>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Voltar à página
              </Button>
            </>
          )}
        </footer>
      </DrawerContent>
    </Drawer>
  );
}

'use client';

import { useState, useTransition } from 'react';
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_LABELS,
  type NotificationPriority,
} from '@vl6/shared';
import { Button, Input, Label, Select, Textarea } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import {
  searchMembersForNotificationAction,
  sendTargetedNotificationAction,
  type MemberSearchResultForNotification,
} from '../actions/send-targeted-notification-actions';

/**
 * `/admin/conteudo/notificacoes/nova` — envio manual de notificação
 * pessoal pra um Irmão ou um grupo (a seleção em si é o grupo, montado na
 * hora pela busca). Complementa o Comunicado (`/admin/conteudo/avisos`,
 * sempre pra todos os usuários ativos): aqui o alcance é escolhido a dedo.
 */
export function SendTargetedNotificationForm() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResultForNotification[]>([]);
  const [selected, setSelected] = useState<Map<string, MemberSearchResultForNotification>>(
    new Map(),
  );
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSending, startSend] = useTransition();

  function handleSearch() {
    startSearch(async () => {
      const found = await searchMembersForNotificationAction(query);
      setResults(found);
    });
  }

  function toggle(member: MemberSearchResultForNotification) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(member.id)) next.delete(member.id);
      else next.set(member.id, member);
      return next;
    });
  }

  function handleSend() {
    setMessage(null);
    startSend(async () => {
      const result = await sendTargetedNotificationAction({
        memberIds: Array.from(selected.keys()),
        titulo,
        mensagem,
        priority,
        requiresAcknowledgement,
      });
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      const semAcessoMsg =
        result.semAcesso.length > 0
          ? ` ${result.semAcesso.length} sem acesso ao Portal, não recebeu(ram): ${result.semAcesso.map((m) => m.nomeCompleto).join(', ')}.`
          : '';
      setMessage({
        text: `Notificação enviada para ${result.enviadas} Irmão(s).${semAcessoMsg}`,
        error: false,
      });
      setSelected(new Map());
      setResults([]);
      setQuery('');
      setTitulo('');
      setMensagem('');
      setRequiresAcknowledgement(false);
    });
  }

  const canSend = selected.size > 0 && titulo.trim() && mensagem.trim() && !isSending;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notif-destinatarios">Destinatários</Label>
        <div className="flex gap-2">
          <Input
            id="notif-destinatarios"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Nome do Irmão (mínimo 3 letras)"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={isSearching || query.trim().length < 3}
            className="shrink-0"
          >
            {isSearching ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>

        {results.length > 0 && (
          <ul className="border-border mt-2 flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-lg border p-2">
            {results.map((member) => (
              <li key={member.id}>
                <label className="hover:bg-background flex items-center gap-3 rounded-lg p-2">
                  <input
                    type="checkbox"
                    checked={selected.has(member.id)}
                    onChange={() => toggle(member)}
                    disabled={!member.temAcesso}
                    className="h-4 w-4"
                  />
                  <MemberAvatar
                    fotoUrl={member.fotoUrl}
                    nome={member.nomeCompleto}
                    className="h-8 w-8"
                    disablePreview
                  />
                  <span className="flex-1 text-sm">{member.nomeCompleto}</span>
                  {!member.temAcesso && (
                    <span className="text-muted text-xs">sem acesso ao Portal</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}

        {selected.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from(selected.values()).map((member) => (
              <span
                key={member.id}
                className="bg-accent/15 text-primary-dark flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
              >
                {member.nomeCompleto}
                <button
                  type="button"
                  onClick={() => toggle(member)}
                  className="hover:text-red-600"
                  aria-label={`Remover ${member.nomeCompleto}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notif-titulo">Título</Label>
        <Input id="notif-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notif-mensagem">Mensagem</Label>
        <Textarea
          id="notif-mensagem"
          rows={4}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notif-priority">Prioridade</Label>
          <Select
            id="notif-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as NotificationPriority)}
          >
            {NOTIFICATION_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {NOTIFICATION_PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requiresAcknowledgement}
            onChange={(e) => setRequiresAcknowledgement(e.target.checked)}
            className="h-4 w-4"
          />
          Exigir confirmação de ciência
        </label>
      </div>

      {message && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <Button type="button" className="w-fit" disabled={!canSend} onClick={handleSend}>
        {isSending ? 'Enviando…' : 'Enviar notificação'}
      </Button>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { ACCESS_LEVEL_KEYS, ACCESS_LEVEL_LABELS, type AccessLevel } from '@vl6/shared';
import { Button, Card, CardContent, Input, Select, Switch } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { updateArchiveMediaBatchAction } from '../../actions/publish-hub-actions';

export interface BatchMetadataPanelProps {
  archiveItemId: string;
  /** IDs das `ArchiveMedia` já concluídas na fila — só estas recebem a atualização em lote. */
  targetArchiveMediaIds: string[];
  onApplied: () => void;
}

/**
 * Painel de metadados em lote do passo 2 — fotógrafo/autor, tags, nível de
 * acesso (override do herdado do evento) e permitir download, aplicados de
 * uma vez a todas as mídias já enviadas/em fila
 * (`UpdateArchiveMediaBatchUseCase`).
 */
export function BatchMetadataPanel({
  archiveItemId,
  targetArchiveMediaIds,
  onApplied,
}: BatchMetadataPanelProps) {
  const [autor, setAutor] = useState('');
  const [tags, setTags] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel | ''>('');
  const [allowDownload, setAllowDownload] = useState(false);
  const [applyAllowDownload, setApplyAllowDownload] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    if (targetArchiveMediaIds.length === 0) {
      setMessage({ text: 'Envie ao menos um arquivo antes de aplicar metadados.', error: true });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await updateArchiveMediaBatchAction(archiveItemId, targetArchiveMediaIds, {
        autor: autor.trim() ? autor.trim() : undefined,
        tags: tags.trim()
          ? tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
        accessLevel: accessLevel || undefined,
        allowDownload: applyAllowDownload ? allowDownload : undefined,
      });
      if (result.ok) {
        setMessage({
          text: `Metadados aplicados a ${targetArchiveMediaIds.length} arquivo(s).`,
          error: false,
        });
        onApplied();
      } else {
        setMessage({ text: result.error ?? 'Não foi possível aplicar os metadados.', error: true });
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <p className="font-medium">Metadados em lote</p>
        <p className="text-muted text-sm">
          Aplica os campos preenchidos a todos os arquivos já enviados nesta sessão. Data, local e
          nível de acesso padrão já foram herdados do evento — use aqui só para complementar ou
          sobrescrever.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Fotógrafo / autor" htmlFor="autor">
            <Input
              id="autor"
              value={autor}
              onChange={(event) => setAutor(event.target.value)}
              placeholder="Ex.: Irmão Fulano de Tal"
            />
          </FormField>
          <FormField label="Tags" htmlFor="tags" description="Separadas por vírgula.">
            <Input
              id="tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="sessao-solene, iniciacao"
            />
          </FormField>
          <FormField label="Nível de acesso (sobrescrever)" htmlFor="accessLevel">
            <Select
              id="accessLevel"
              value={accessLevel}
              onChange={(event) => setAccessLevel(event.target.value as AccessLevel | '')}
            >
              <option value="">Manter o herdado do evento</option>
              {ACCESS_LEVEL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {ACCESS_LEVEL_LABELS[key]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Permitir download</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyAllowDownload}
                onChange={(event) => setApplyAllowDownload(event.target.checked)}
              />
              Sobrescrever
              <Switch
                checked={allowDownload}
                disabled={!applyAllowDownload}
                onChange={(event) => setAllowDownload(event.target.checked)}
              />
            </label>
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
            {message.text}
          </p>
        )}
        <div>
          <Button type="button" onClick={handleApply} disabled={isPending} variant="outline">
            {isPending
              ? 'Aplicando…'
              : `Aplicar a ${targetArchiveMediaIds.length} arquivo(s) enviados`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

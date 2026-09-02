'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  MEMBER_RETURN_REASONS,
  MEMBER_SITUATION_REASON_LABELS,
  MEMBER_SITUATION_REASONS,
  MEMBER_SITUATION_STATUS_LABELS,
  MEMBER_SITUATION_STATUSES,
  MEMBER_STATUS_RECORD_KIND_LABELS,
  MEMBER_STATUS_RECORD_KINDS,
  MEMBER_STATUS_RECORD_ORIGIN_LABELS,
  MEMBER_STATUS_RECORD_ORIGINS,
  type MemberSituationStatus,
} from '@vl6/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  Textarea,
} from '@vl6/ui';
import {
  registerMemberSituationAction,
  type SituationActionState,
} from '../../actions/member-actions';

export type RegisterSituationMode = 'alterar' | 'licenca' | 'retorno';

const MODE_CONFIG: Record<
  RegisterSituationMode,
  { titulo: string; situacaoFixa: MemberSituationStatus | null; motivos: readonly string[] | null }
> = {
  alterar: { titulo: 'Alterar situação', situacaoFixa: null, motivos: null },
  licenca: { titulo: 'Registrar licença', situacaoFixa: 'licenciado', motivos: null },
  retorno: { titulo: 'Registrar retorno', situacaoFixa: 'ativo', motivos: MEMBER_RETURN_REASONS },
};

function reasonLabel(motivo: string): string {
  return (
    MEMBER_SITUATION_REASON_LABELS[motivo as keyof typeof MEMBER_SITUATION_REASON_LABELS] ?? motivo
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}

/**
 * Único formulário (nunca desmonta os campos, só esconde com `hidden`) —
 * cobrir "Alterar situação"/"Registrar licença"/"Registrar retorno" da
 * ficha do Irmão, todos a mesma `registerMemberSituationAction` por baixo.
 * Confirmação em 2 telas dentro do MESMO `<form>`: reconstruir o passo de
 * revisão num segundo `<form>` perderia o `<input type="file">` de anexos
 * (não dá pra recriar um `File` programaticamente por segurança do
 * navegador), então a revisão só alterna visibilidade, nunca desmonta.
 */
export function RegisterSituationDialog({
  memberId,
  mode,
  triggerLabel,
  triggerVariant = 'outline',
  situacaoAtualLabel,
}: {
  memberId: string;
  mode: RegisterSituationMode;
  triggerLabel: string;
  triggerVariant?: 'outline' | 'primary';
  situacaoAtualLabel: string;
}) {
  const config = MODE_CONFIG[mode];
  const boundAction = registerMemberSituationAction.bind(null, memberId);
  const [state, formAction] = useActionState<SituationActionState, FormData>(boundAction, {
    error: null,
    success: false,
  });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'confirmar'>('form');
  const [situacao, setSituacao] = useState<MemberSituationStatus>(config.situacaoFixa ?? 'ativo');
  const [motivo, setMotivo] = useState('');
  const [motivoOutroDescricao, setMotivoOutroDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [glegOrigem, setGlegOrigem] = useState(false);

  const motivosDisponiveis = config.motivos ?? MEMBER_SITUATION_REASONS[situacao];

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep('form');
      setSituacao(config.situacaoFixa ?? 'ativo');
      setMotivo('');
      setMotivoOutroDescricao('');
      setDataInicio('');
      setGlegOrigem(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.titulo}</DialogTitle>
          <DialogDescription>Situação atual: {situacaoAtualLabel}</DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Situação registrada com sucesso.</p>
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div hidden={step !== 'form'} className="flex flex-col gap-4">
              {!config.situacaoFixa && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="situacao">Situação</Label>
                  <Select
                    id="situacao"
                    name="situacao"
                    value={situacao}
                    onChange={(e) => {
                      setSituacao(e.target.value as MemberSituationStatus);
                      setMotivo('');
                    }}
                  >
                    {MEMBER_SITUATION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {MEMBER_SITUATION_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {config.situacaoFixa && <input type="hidden" name="situacao" value={situacao} />}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="motivo">Motivo</Label>
                <Select
                  id="motivo"
                  name="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {motivosDisponiveis.map((m) => (
                    <option key={m} value={m}>
                      {reasonLabel(m)}
                    </option>
                  ))}
                </Select>
              </div>

              {motivo === 'outro' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="motivoOutroDescricao">Descrição do motivo</Label>
                  <Input
                    id="motivoOutroDescricao"
                    name="motivoOutroDescricao"
                    value={motivoOutroDescricao}
                    onChange={(e) => setMotivoOutroDescricao(e.target.value)}
                  />
                </div>
              )}

              {motivo === 'transferencia_outra_loja' && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lojaDestinoId">Loja de destino</Label>
                  <Input
                    id="lojaDestinoId"
                    name="lojaDestinoId"
                    placeholder="Nome ou número da Loja para onde ele foi transferido"
                  />
                  <p className="text-muted text-xs">
                    Fica registrado no histórico deste Irmão — pra sabermos que ele saiu daqui e pra
                    onde foi.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dataInicio">Data de início</Label>
                <Input
                  id="dataInicio"
                  name="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lojaId">Loja (opcional)</Label>
                  <Input
                    id="lojaId"
                    name="lojaId"
                    placeholder="Deixe em branco pra manter a atual"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="potencia">Potência (opcional)</Label>
                  <Input
                    id="potencia"
                    name="potencia"
                    placeholder="Deixe em branco pra manter a atual"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="documentoNumero">Nº do ato/documento</Label>
                  <Input id="documentoNumero" name="documentoNumero" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="documentoData">Data do documento</Label>
                  <Input id="documentoData" name="documentoData" type="date" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="observacoes">Observações internas</Label>
                <Textarea id="observacoes" name="observacoes" rows={3} />
              </div>

              <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    name="glegOrigem"
                    className="accent-primary h-4 w-4"
                    checked={glegOrigem}
                    onChange={(e) => setGlegOrigem(e.target.checked)}
                  />
                  Origem: Grande Loja (GLEG)
                </label>

                {glegOrigem && (
                  <div className="flex flex-col gap-3">
                    <p className="text-muted text-xs">
                      Preencha só quando esta ocorrência tem proveniência formal da GLEG (ex.:
                      documento de Quite-Placet). O texto de &quot;Origem exata&quot; deve ser
                      digitado exatamente como recebido/lançado — nunca reescrito.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="origem">Tipo de origem</Label>
                        <Select
                          id="origem"
                          name="origem"
                          defaultValue={MEMBER_STATUS_RECORD_ORIGINS[1]}
                        >
                          {MEMBER_STATUS_RECORD_ORIGINS.map((o) => (
                            <option key={o} value={o}>
                              {MEMBER_STATUS_RECORD_ORIGIN_LABELS[o]}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="recordKind">Natureza do ato</Label>
                        <Select id="recordKind" name="recordKind" defaultValue="">
                          <option value="" disabled>
                            Selecione…
                          </option>
                          {MEMBER_STATUS_RECORD_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {MEMBER_STATUS_RECORD_KIND_LABELS[k]}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="sourceLabel">Origem exata (rótulo do documento)</Label>
                      <Input
                        id="sourceLabel"
                        name="sourceLabel"
                        placeholder='Ex.: "Quite-Placet" — exatamente como consta no documento'
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="sourceCode">Código GLEG (opcional)</Label>
                        <Input id="sourceCode" name="sourceCode" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="lojaOrigemId">Loja de origem (opcional)</Label>
                        <Input id="lojaOrigemId" name="lojaOrigemId" />
                      </div>
                    </div>
                    {motivo !== 'transferencia_outra_loja' && (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="lojaDestinoId">Loja de destino (opcional)</Label>
                        <Input id="lojaDestinoId" name="lojaDestinoId" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="anexos">Documento anexo (opcional)</Label>
                <Input
                  id="anexos"
                  name="anexos"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  multiple
                />
              </div>

              <Button
                type="button"
                disabled={
                  !motivo || !dataInicio || (motivo === 'outro' && !motivoOutroDescricao.trim())
                }
                onClick={() => setStep('confirmar')}
              >
                Continuar
              </Button>
            </div>

            {step === 'confirmar' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm">
                  Você está alterando a situação para{' '}
                  <strong>{MEMBER_SITUATION_STATUS_LABELS[situacao]}</strong>
                  {motivo && (
                    <>
                      , por <strong>{reasonLabel(motivo)}</strong>
                    </>
                  )}
                  , com vigência a partir de <strong>{formatDate(dataInicio)}</strong>.
                </p>
                {state.error && <p className="text-destructive text-sm">{state.error}</p>}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('form')}>
                    Voltar
                  </Button>
                  <SubmitButton label="Confirmar" />
                </div>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

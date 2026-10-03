'use client';

import { useState } from 'react';

type Member = { id: string; name: string };
type RenewalResult = {
  format: 'vl6-cripta-renewal-result-v1';
  novoCodigo: string;
  novaChavePublica: { kty: 'EC'; crv: 'P-256'; x: string; y: string };
  inventoryDigest: string;
  totalCartas: number;
  totalRascunhos: number;
  totalGuardioes: number;
  ata: string;
  novosGuardioes: string[];
};

function isRenewalResult(value: unknown): value is RenewalResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    result.format === 'vl6-cripta-renewal-result-v1' &&
    typeof result.novoCodigo === 'string' &&
    typeof result.inventoryDigest === 'string' &&
    Number.isInteger(result.totalCartas) &&
    Number.isInteger(result.totalRascunhos) &&
    Array.isArray(result.novosGuardioes)
  );
}

/** A segunda metade da cerimônia de Renovação — a primeira (gerar a chave nova, reselar as
 * cartas) aconteceu offline, air-gapped, na ferramenta de abertura. Isto só sobe o resultado
 * público dessa cerimônia (nunca a chave privada nem uma parte) e liga cada apelido usado
 * offline a uma conta real do Portal. */
export function RenewalPanel({ eligible }: { eligible: Member[] }) {
  const [result, setResult] = useState<RenewalResult | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  async function loadFile(file: File) {
    setMessage('');
    try {
      const parsed = JSON.parse(await file.text());
      if (!isRenewalResult(parsed))
        throw new Error('Arquivo não reconhecido como resultado de Renovação.');
      setResult(parsed);
      setMemberIds(Array(parsed.novosGuardioes.length).fill(''));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.');
    }
  }

  const distinctChosen = memberIds.filter(Boolean);
  const validSelection =
    !!result &&
    distinctChosen.length === result.totalGuardioes &&
    new Set(distinctChosen).size === result.totalGuardioes;

  async function confirm() {
    if (!result || !validSelection) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/renewal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPublicKey: result.novaChavePublica,
          guardianMemberIds: distinctChosen,
          minutes: result.ata,
          reason,
          newCode: result.novoCodigo,
          newInventoryDigest: result.inventoryDigest,
          newLetters: result.totalCartas,
          newDrafts: result.totalRascunhos,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Renovação não confirmada.');
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Renovação não confirmada.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-green-300 bg-green-50 p-6 text-green-950">
        <h2 className="font-serif text-2xl">Renovação registrada</h2>
        <p className="mt-2 text-sm leading-6">
          A chave e o quadro de Guardiões foram atualizados. Siga para a Conferência física com o
          novo arquivo <code>.lacre</code> gerado offline.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-red-300 bg-red-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
        Ato excepcional · Renovação de Guardiões
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">
        Registrar o resultado da Renovação offline
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Antes de ir para o ambiente offline, baixe a lista de Irmãos elegíveis — leve esse arquivo
        junto para escolher os novos Guardiões por nome na ferramenta, em vez de digitar, evitando
        erro de digitação. Ele só contém nome e identificador, nada secreto.
      </p>
      <a
        href="/api/cripta/eligible-members"
        download="elegiveis-guardioes.json"
        className="mt-3 inline-block rounded-xl border border-red-700 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
      >
        Baixar lista de Irmãos elegíveis
      </a>
      <p className="mt-5 text-sm leading-6 text-[#536074]">
        Depois de concluir a etapa 4 na ferramenta offline (<code>abertura-offline</code>), suba
        aqui o arquivo <code>renovacao-resultado-*.json</code> baixado lá — ele só contém a chave
        pública nova e os totais do novo lacre, nunca a chave privada nem uma parte dos Guardiões.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Arquivo renovacao-resultado-*.json
        <input
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadFile(file);
          }}
          className="mt-2 block w-full text-sm"
        />
      </label>
      {result && (
        <div className="mt-5 space-y-4 rounded-xl border border-[#dbcda9] bg-white p-4">
          <p className="text-sm">
            Novo lacre <strong>{result.novoCodigo}</strong> · {result.totalCartas} carta(s) · ata:{' '}
            {result.ata}
          </p>
          <p className="text-sm text-[#536074]">
            Associe cada apelido usado offline à conta real do Irmão no Portal:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.novosGuardioes.map((label, index) => (
              <label key={label} className="text-sm font-semibold">
                {label}
                <select
                  value={memberIds[index] ?? ''}
                  onChange={(event) =>
                    setMemberIds((ids) =>
                      ids.map((id, position) => (position === index ? event.target.value : id)),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
                >
                  <option value="">Selecione</option>
                  {eligible
                    .filter(
                      (member) => !memberIds.includes(member.id) || memberIds[index] === member.id,
                    )
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
          </div>
          <label className="block text-sm font-semibold">
            Motivo (opcional, só para registro interno)
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: falecimento do Guardião anterior"
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || !validSelection}
            onClick={confirm}
            className="rounded-xl bg-red-800 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Registrando…' : 'Confirmar Renovação'}
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-white p-3 text-sm text-red-900">
          {message}
        </p>
      )}
    </section>
  );
}

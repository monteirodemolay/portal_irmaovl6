import { appointCustodians } from './appoint-custodians';

type Member = { id: string; nomeCompleto: string };
type Control =
  { commissionMemberIds?: string[]; nextOpeningDate?: string; minutes?: string } | undefined;

const field = 'mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 text-[#142a43]';

function Fields({
  eligible,
  control,
  masterMissing,
}: {
  eligible: Member[];
  control: Control;
  masterMissing: boolean;
}) {
  return (
    <form action={appointCustodians} className="mt-5 grid gap-4 sm:grid-cols-2">
      {[1, 2, 3].map((number) => (
        <label key={number} className="text-sm font-semibold">
          Integrante {number} {number > 1 && <span className="font-normal">(opcional)</span>}
          <select
            name={`guardian${number}Id`}
            required={number === 1}
            defaultValue={control?.commissionMemberIds?.[number - 1] ?? ''}
            className={field}
          >
            <option value="">{number === 1 ? 'Selecione' : 'Nenhum'}</option>
            {eligible.map((member) => (
              <option key={member.id} value={member.id}>
                {member.nomeCompleto}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="text-sm font-semibold">
        Próxima abertura prevista
        <input
          type="date"
          name="nextOpeningDate"
          required
          defaultValue={control?.nextOpeningDate ?? ''}
          className={field}
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Ata ou referência da sessão
        <input
          name="minutes"
          required
          minLength={5}
          maxLength={160}
          defaultValue={control?.minutes ?? ''}
          placeholder="Ex.: Ata 123/2026"
          className={field}
        />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Deliberação ou motivo da mudança
        <textarea
          name="reason"
          required
          minLength={8}
          maxLength={300}
          rows={2}
          placeholder="Ex.: Comissão aprovada em sessão; ou remarcação por impossibilidade"
          className={field}
        />
      </label>
      <button
        disabled={masterMissing}
        className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
      >
        {control?.commissionMemberIds?.length
          ? 'Atualizar Comissão ou data'
          : 'Nomear Comissão de Guarda'}
      </button>
    </form>
  );
}

/** Rendered two ways: as the main, open panel during the "comissao" wizard phase (prominent),
 * and tucked into a closed <details> on every later phase so the operator can still remarcar a
 * data or trocar um integrante without the wizard forcing a trip back to an earlier step. */
export function ComissaoForm({
  eligible,
  masterName,
  masterMissing,
  control,
  prominent,
}: {
  eligible: Member[];
  masterName: string;
  masterMissing: boolean;
  control: Control;
  prominent: boolean;
}) {
  const body = (
    <>
      <div className="mt-4 rounded-xl border border-[#c9a449] bg-white p-4 text-sm">
        <strong>Presidente no fechamento:</strong>{' '}
        {masterName || 'Não identificado na gestão vigente'}
      </div>
      {masterMissing && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          Cadastre o Venerável na gestão vigente e vincule sua conta antes de registrar esta
          designação.
        </p>
      )}
      <Fields eligible={eligible} control={control} masterMissing={masterMissing} />
    </>
  );
  if (prominent) {
    return (
      <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          1 · deliberação em Loja
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Comissão de Guarda</h2>
        <p className="mt-2 text-sm leading-6 text-[#536074]">
          O Venerável Mestre da gestão vigente preside o fechamento. Indique de um a três irmãos
          Ativos para guardar a Cripta até a próxima abertura. A data é uma previsão: a Comissão
          pode remarcá-la em sessão, com ata e motivo.
        </p>
        {body}
      </section>
    );
  }
  return (
    <details className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <summary className="cursor-pointer font-serif text-lg text-[#142a43]">
        Ajustar Comissão e data (opcional, a qualquer momento)
      </summary>
      {body}
    </details>
  );
}

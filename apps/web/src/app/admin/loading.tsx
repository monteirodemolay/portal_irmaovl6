export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-border bg-surface rounded-2xl border p-8"
    >
      <p className="font-display text-xl">Carregando a área administrativa…</p>
      <p className="text-muted mt-2 text-sm">Aguarde a consulta dos registros autorizados.</p>
    </div>
  );
}

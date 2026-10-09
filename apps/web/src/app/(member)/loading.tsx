export default function MemberLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-5">
      <p className="text-muted text-sm">Carregando conteúdo…</p>
      <div aria-hidden="true" className="bg-surface h-32 rounded-xl motion-safe:animate-pulse" />
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="bg-surface h-48 rounded-xl motion-safe:animate-pulse" />)}
      </div>
    </div>
  );
}

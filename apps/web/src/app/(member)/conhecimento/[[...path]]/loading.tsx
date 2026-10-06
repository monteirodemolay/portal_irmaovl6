export default function LoadingKnowledge() {
  return (
    <div className="grid gap-5" aria-label="Carregando Conhecimento" aria-busy="true">
      <div className="bg-surface h-48 animate-pulse rounded-xl" />
      <div className="grid gap-5 sm:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="bg-surface h-60 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  );
}

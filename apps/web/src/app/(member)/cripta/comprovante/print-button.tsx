'use client';
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white print:hidden"
    >
      Imprimir comprovante
    </button>
  );
}

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Quote } from '@vl6/ui';

/**
 * "Palavras à Memória" — a mensagem de homenagem escrita pelo Administrador
 * (`Member.mensagemHomenagem`), pedida como uma faixa compacta e horizontal
 * (mock-up do Administrador) em vez do bloco vertical grande já usado em
 * `ProfileOverviewTab` (o gradiente logo abaixo do cabeçalho): um trecho
 * curto (3 linhas, `line-clamp-3`) sempre visível, com "Ler homenagem
 * completa" abrindo o texto inteiro num `Dialog` — mesmo texto pode ter
 * vários parágrafos sem nunca desproporcionar o resto da grade bento.
 */
export function MemoryWordsCard({ text }: { text: string }) {
  return (
    <Dialog>
      <div className="border-border from-surface to-accent/5 flex flex-col items-start gap-4 rounded-2xl border bg-gradient-to-r p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="border-border bg-surface text-accent flex h-12 w-12 shrink-0 items-center justify-center rounded-full border">
          <Quote size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted text-[10px] font-bold uppercase tracking-[0.13em]">Homenagem</p>
          <h2 className="font-display mt-1 text-base font-semibold">Palavras à Memória</h2>
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm italic leading-relaxed">
            {text}
          </p>
        </div>
        <DialogTrigger asChild>
          <button
            type="button"
            className="border-accent/40 text-accent hover:bg-accent/10 shrink-0 self-start rounded-full border px-4 py-2 text-xs font-semibold transition-colors sm:self-center"
          >
            Ler homenagem completa →
          </button>
        </DialogTrigger>
      </div>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-muted text-[10px] font-bold uppercase tracking-[0.13em]">Homenagem</p>
          <DialogTitle>Palavras à Memória</DialogTitle>
        </DialogHeader>
        <p className="font-display max-h-[60vh] overflow-y-auto whitespace-pre-line text-base leading-relaxed">
          {text}
        </p>
      </DialogContent>
    </Dialog>
  );
}

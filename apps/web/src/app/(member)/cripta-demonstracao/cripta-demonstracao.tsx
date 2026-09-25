'use client';

import { useState } from 'react';
import { Archive, ArrowLeft, FileText, Image, Lock, Play, ShieldCheck, Video } from '@vl6/ui';

type Letter = { id: number; title: string; recipient: string; date: string; text: string; attachments: string[]; destination: string };
const letters: Letter[] = [
  { id: 1, title: 'À minha família', recipient: 'Família', date: '12 set 2026', text: 'À minha família,\n\nGuardo aqui algumas palavras que gostaria de deixar para vocês. Cada lembrança que construímos permanece comigo.\n\n[Texto inteiramente fictício para demonstração.]', attachments: ['Fotografias · 2', 'Áudio · 12 s'], destination: 'Entregar aos destinatários indicados' },
  { id: 2, title: 'Aos Irmãos da Loja', recipient: 'Irmãos da VL6', date: '19 set 2026', text: 'Meus Irmãos,\n\nNossa convivência também é feita de pequenos momentos que merecem ser lembrados.\n\n[Texto inteiramente fictício para demonstração.]', attachments: ['Áudio · 9 s'], destination: 'Disponibilizar conforme instrução do titular' },
  { id: 3, title: 'Uma lembrança para o futuro', recipient: 'Sem destinatário', date: '22 set 2026', text: 'Hoje escolhi guardar esta lembrança para revisitar no futuro.\n\n[Texto inteiramente fictício para demonstração.]', attachments: ['Vídeo · 15 s'], destination: 'Preservar em caráter pessoal' },
];

export function CriptaDemonstracao() {
  const [selected, setSelected] = useState<Letter | null>(null);
  const [view, setView] = useState<'titular' | 'sucessao'>('titular');
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-950" role="status">
        <strong>DEMONSTRAÇÃO · sem dados reais.</strong> Esta tela usa conteúdo fictício. Não permite escrever, enviar, salvar, baixar ou recuperar cartas e arquivos. A Cripta só poderá receber dados após a implementação e auditoria da criptografia e do protocolo de sucessão.
      </div>
      <section className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-br from-[#06172e] via-[#0a2547] to-[#123c69] p-6 text-[#f3ead7] shadow-xl sm:p-10">
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-amber-300/10" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[.24em] text-[#e3bd62]">Portal do Irmão VL6 · conceito para avaliação</p>
        <h1 className="mt-5 font-serif text-5xl sm:text-6xl">A Cripta do Irmão</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">Cartas, fotografias, vídeos curtos e áudios preservados para o futuro. Uma experiência pessoal de memória, com instruções do titular para cada mensagem.</p>
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Perspectiva da demonstração">
          <button type="button" onClick={() => { setView('titular'); setSelected(null); }} className={`rounded-full px-4 py-2 text-sm ${view === 'titular' ? 'bg-[#e3bd62] text-[#06172e]' : 'border border-[#e3bd62]/50 text-[#f3ead7]'}`}>Visão do titular</button>
          <button type="button" onClick={() => { setView('sucessao'); setSelected(null); }} className={`rounded-full px-4 py-2 text-sm ${view === 'sucessao' ? 'bg-[#e3bd62] text-[#06172e]' : 'border border-[#e3bd62]/50 text-[#f3ead7]'}`}>Protocolo após falecimento</button>
        </div>
      </section>
      {view === 'sucessao' ? (
        <section className="rounded-3xl border border-[#c9a449]/40 bg-[#0a2547] p-6 text-[#f3ead7] sm:p-9">
          <ShieldCheck className="text-[#e3bd62]" size={32} />
          <h2 className="mt-5 font-serif text-3xl">Uma abertura com duas autorizações</h2>
          <p className="mt-4 max-w-3xl leading-7 text-slate-200">O registro de falecimento inicia uma verificação formal; ele nunca abre as cartas automaticamente. A recuperação prevista exige a atuação conjunta do Venerável Mestre em exercício e de um administrador designado, com material criptográfico separado e registro auditável do procedimento.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {['1 · Comprovação e conferência', '2 · Autorização conjunta', '3 · Abertura conforme a vontade do titular'].map((step) => <div key={step} className="rounded-xl border border-[#c9a449]/30 bg-white/5 p-4 text-sm">{step}</div>)}
          </div>
          <p className="mt-7 text-xs leading-6 text-slate-300">Fluxo conceitual sujeito a definição jurídica, política de chaves, recuperação, retenção e auditoria externa. Nenhuma chave ou arquivo real existe nesta demonstração.</p>
        </section>
      ) : (
        <>
          <section className="flex items-start gap-4 rounded-2xl border border-[#c9a449]/30 bg-[#0a2547] p-5 text-[#f3ead7]">
            <Lock className="mt-1 shrink-0 text-[#e3bd62]" size={24} />
            <div><h2 className="font-serif text-xl">Área pessoal · ciclo anual</h2><p className="mt-1 text-sm leading-6 text-slate-300">Na versão proposta, o titular revisa suas cartas a cada ano e pode alterar ou excluir seu conteúdo. A data e as regras do ciclo serão definidas antes da implantação.</p></div>
          </section>
          {selected ? (
            <section className="rounded-3xl border border-[#c9a449]/40 bg-[#102b46] p-4 text-[#f3ead7] sm:p-9">
              <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-2 text-sm text-[#e3bd62]"><ArrowLeft size={17} /> Voltar às cartas</button>
              <div className="mt-7 rounded-sm border border-[#d6c29a] bg-[#f6efdf] p-6 text-[#243144] shadow-lg sm:p-10">
                <p className="text-xs uppercase tracking-[.2em] text-[#917849]">Carta de demonstração · {selected.date}</p>
                <h2 className="mt-5 font-serif text-3xl">{selected.title}</h2><p className="mt-2 text-sm">Destinatário: {selected.recipient}</p>
                <p className="mt-8 whitespace-pre-line font-serif text-lg leading-9">{selected.text}</p>
                <div className="mt-8 border-t border-[#d6c29a] pt-5 text-sm">Destino indicado: {selected.destination}</div>
              </div>
              <h3 className="mt-8 font-serif text-xl">Registros vinculados</h3><div className="mt-3 flex flex-wrap gap-3">{selected.attachments.map((item) => <div key={item} className="flex items-center gap-2 rounded-lg border border-[#c9a449]/40 p-3 text-sm"><Play size={15} className="text-[#e3bd62]" />{item} · ilustrativo</div>)}</div>
              <p className="mt-7 text-xs text-slate-300">Na Cripta real, editar, excluir, reproduzir e baixar dependem da autenticação e da descriptografia autorizada. Essas ações estão desativadas aqui.</p>
            </section>
          ) : (
            <section><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-[#9b7c38]">Arquivo pessoal ilustrativo</p><h2 className="mt-2 font-serif text-3xl">Cartas e lembranças</h2></div><span className="text-xs text-muted">3 exemplos fictícios</span></div>
              <div className="grid gap-4 md:grid-cols-3">{letters.map((letter, index) => <button key={letter.id} type="button" onClick={() => setSelected(letter)} className="group min-h-72 rounded-2xl border border-[#c9a449]/45 bg-[#0a2547] p-6 text-left text-[#f3ead7] shadow-lg transition hover:-translate-y-1 hover:bg-[#123c69] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e3bd62]">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#c9a449]/70 text-[#e3bd62]">{index === 0 ? <Image size={24} /> : index === 1 ? <Play size={24} /> : <Video size={24} />}</span>
                <span className="mt-7 block text-xs uppercase tracking-[.17em] text-[#e3bd62]">{letter.recipient}</span><span className="mt-3 block font-serif text-2xl">{letter.title}</span><span className="mt-3 block text-sm text-slate-300">{letter.date} · {letter.attachments.length} registro(s)</span><span className="mt-8 inline-flex items-center gap-2 text-sm text-[#e3bd62]"><FileText size={15} /> Abrir exemplo →</span>
              </button>)}</div>
            </section>
          )}
          <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#c9a449]/25 p-6"><Archive className="text-[#9b7c38]" size={25} /><div><h2 className="font-serif text-xl">Revisão anual proposta</h2><p className="text-sm text-muted">Revisitar, atualizar ou remover registros mediante acesso do próprio titular.</p></div></section>
        </>
      )}
    </div>
  );
}

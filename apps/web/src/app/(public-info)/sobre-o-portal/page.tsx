import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sobre o Portal | Portal do Irmão VL6',
  description: 'Conheça o ambiente digital da Loja Maçônica Verdadeira Luz nº 06.',
};

export default function AboutPortalPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Institucional</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Portal do Irmão</h1>
        <p className="text-muted max-w-3xl text-lg leading-8">
          Um ambiente digital, seguro e exclusivo da Loja Maçônica Verdadeira Luz nº 06.
        </p>
      </header>

      <section className="border-border bg-surface rounded-2xl border p-6 shadow-sm sm:p-8">
        <p className="text-muted leading-8">
          O Portal do Irmão reúne, em um único espaço, informações institucionais, agenda,
          avisos, acervo histórico, documentos e recursos destinados aos membros autorizados
          da Loja.
        </p>
        <p className="text-muted mt-4 leading-8">
          Por meio da funcionalidade Minha Agenda, o usuário também poderá, de forma
          voluntária, conectar sua conta Google para visualizar seus compromissos e sincronizar
          eventos da Loja com o Google Agenda.
        </p>
        <p className="text-muted mt-4 leading-8">
          O acesso ao conteúdo interno é restrito aos membros previamente autorizados. As
          páginas institucionais sobre privacidade, termos, suporte e integração com o Google
          Agenda permanecem disponíveis publicamente.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Tradição', 'Preservação da história e da memória institucional.'],
          ['Organização', 'Agenda, documentos e comunicações em um só ambiente.'],
          ['Segurança', 'Acesso interno reservado aos membros autorizados.'],
        ].map(([title, description]) => (
          <div key={title} className="border-border rounded-2xl border p-5">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <p className="text-muted mt-2 text-sm leading-6">{description}</p>
          </div>
        ))}
      </section>

      <section className="border-primary/15 bg-primary/5 rounded-2xl border p-6">
        <h2 className="font-display text-2xl font-semibold">Identificação institucional</h2>
        <p className="text-muted mt-3 leading-7">
          Loja Maçônica Verdadeira Luz nº 06<br />
          Venerável Mestre: Dino Moraes de Sousa<br />
          Rua Raul Seabra, nº 71, Centro, Rio Verde – GO, CEP 75.901-300.
        </p>
        <Link href="/login" className="bg-primary hover:bg-primary-dark mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors">
          Acessar área restrita
        </Link>
      </section>
    </article>
  );
}

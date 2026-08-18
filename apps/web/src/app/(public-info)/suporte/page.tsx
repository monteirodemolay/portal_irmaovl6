import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Suporte | Portal do Irmão VL6',
  description: 'Canais de suporte do Portal do Irmão VL6.',
};

const topics = [
  'Acesso à conta e recuperação de acesso.',
  'Atualização de cadastro.',
  'Funcionamento da Minha Agenda.',
  'Conexão ou desconexão do Google Agenda.',
  'Privacidade e proteção de dados.',
  'Comunicação de erro ou problema de segurança.',
  'Dúvidas sobre conteúdos e funcionalidades.',
];

export default function SupportPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Atendimento</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Suporte e contato</h1>
        <p className="text-muted text-lg leading-8">Precisa de ajuda com o Portal do Irmão?</p>
      </header>

      <section className="grid gap-5 sm:grid-cols-2">
        <a href="mailto:lojaverdadeiraluz6@gmail.com" className="border-border hover:border-primary rounded-2xl border p-6 transition-colors">
          <span className="text-muted text-xs font-bold uppercase tracking-wider">E-mail</span>
          <strong className="mt-2 block break-all">lojaverdadeiraluz6@gmail.com</strong>
        </a>
        <a href="https://wa.me/5564999167392" target="_blank" rel="noopener noreferrer" className="border-border hover:border-primary rounded-2xl border p-6 transition-colors">
          <span className="text-muted text-xs font-bold uppercase tracking-wider">Telefone e WhatsApp</span>
          <strong className="mt-2 block">(64) 99916-7392</strong>
        </a>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Podemos ajudar com</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {topics.map((topic) => (
            <li key={topic} className="border-border rounded-xl border p-4 text-sm leading-6">{topic}</li>
          ))}
        </ul>
      </section>

      <section className="border-primary/15 bg-primary/5 rounded-2xl border p-6">
        <h2 className="font-display text-2xl font-semibold">Atendimento institucional</h2>
        <p className="text-muted mt-3 leading-7">
          Loja Maçônica Verdadeira Luz nº 06<br />
          Venerável Mestre: Dino Moraes de Sousa<br />
          Rua Raul Seabra, nº 71, Centro<br />
          Rio Verde – GO, CEP 75.901-300.
        </p>
      </section>

      <aside className="border-accent/30 bg-accent/5 rounded-2xl border p-5 text-sm leading-7">
        Ao solicitar suporte, informe seu nome e uma breve descrição do problema. Quando
        possível, envie uma imagem da tela. Não envie senhas, códigos de verificação, tokens de
        acesso ou outras credenciais pessoais.
      </aside>
    </article>
  );
}

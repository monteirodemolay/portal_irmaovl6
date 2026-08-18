import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Minha Agenda | Portal do Irmão VL6',
  description: 'Saiba como funciona a integração voluntária do Portal VL6 com o Google Agenda.',
};

const features = [
  'Visualizar seus eventos do Google na Minha Agenda.',
  'Adicionar sessões e eventos da VL6 ao Google Agenda.',
  'Sincronizar compromissos pessoais criados no Portal.',
  'Receber atualizações de eventos sincronizados.',
  'Identificar possíveis conflitos de horário.',
  'Escolher o calendário Google de destino.',
  'Solicitar uma sincronização imediata.',
  'Desconectar sua conta Google a qualquer momento.',
];

export default function MyCalendarPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Integração Google</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Minha Agenda</h1>
        <p className="text-muted max-w-3xl text-lg leading-8">
          Sua organização pessoal conectada à Agenda da Loja.
        </p>
      </header>

      <section className="border-border bg-surface rounded-2xl border p-6 shadow-sm sm:p-8">
        <p className="text-muted leading-8">
          A Minha Agenda reúne os eventos institucionais da Loja Maçônica Verdadeira Luz nº 06
          e, se o usuário desejar, seus compromissos pessoais. A conexão com o Google Agenda é
          opcional e controlada pelo próprio usuário.
        </p>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Como funciona</h2>
        <ol className="mt-4 space-y-3">
          {[
            'O usuário acessa a Minha Agenda dentro do Portal.',
            'Ao selecionar “Conectar Google Agenda”, é direcionado à autorização do Google.',
            'O Google informa quais permissões estão sendo solicitadas.',
            'Somente após a autorização, o Portal executa as opções escolhidas pelo usuário.',
            'As preferências podem ser alteradas posteriormente.',
          ].map((item, index) => (
            <li key={item} className="border-border flex gap-4 rounded-xl border p-4">
              <span className="bg-primary text-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {index + 1}
              </span>
              <span className="text-muted leading-7">{item}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Funcionalidades disponíveis</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="border-border rounded-xl border p-4 text-sm leading-6">
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-primary/15 bg-primary/5 rounded-2xl border p-6">
        <h2 className="font-display text-2xl font-semibold">Privacidade e controle</h2>
        <p className="text-muted mt-3 leading-7">
          Os eventos pessoais provenientes do Google Agenda são visíveis somente para o
          respectivo usuário. A Loja não utiliza essas informações para publicidade,
          comercialização de dados ou criação de perfis comerciais.
        </p>
        <p className="text-muted mt-3 leading-7">
          A conexão pode ser encerrada pelo comando “Desconectar Google” ou diretamente nas
          configurações de segurança da Conta Google.
        </p>
        <Link href="/privacidade" className="text-primary mt-4 inline-flex font-semibold hover:underline">
          Consultar a Política de Privacidade
        </Link>
      </section>

      <p className="text-muted text-sm">
        Suporte: <a className="text-primary hover:underline" href="mailto:lojaverdadeiraluz6@gmail.com">lojaverdadeiraluz6@gmail.com</a>
        {' · '}
        <a className="text-primary hover:underline" href="tel:+5564999167392">(64) 99916-7392</a>
      </p>
    </article>
  );
}

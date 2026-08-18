import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Portal do Irmão VL6',
  description: 'Termos que regulam o acesso e o uso do Portal do Irmão VL6.',
};

const terms = [
  ['1. Aceitação', 'Estes Termos regulam o acesso e a utilização do Portal do Irmão VL6, mantido pela Loja Maçônica Verdadeira Luz nº 06. Ao utilizar o Portal, o usuário declara estar ciente destes Termos e da Política de Privacidade.'],
  ['2. Finalidade', 'O Portal é um ambiente institucional destinado à comunicação, organização, preservação da memória, consulta de documentos, acompanhamento de eventos e disponibilização de recursos aos membros autorizados.'],
  ['3. Acesso', 'O acesso às áreas internas é pessoal, restrito e condicionado à autorização da administração. As permissões podem variar conforme o perfil, função, grau ou regras institucionais. A administração poderá suspender acessos em caso de desligamento, uso inadequado, risco à segurança ou violação destes Termos.'],
  ['4. Responsabilidades do usuário', 'O usuário deve fornecer informações verdadeiras, manter suas credenciais em sigilo, não compartilhar o acesso, utilizar o Portal para finalidades legítimas, respeitar a privacidade dos demais, não divulgar conteúdo restrito sem autorização e não tentar acessar áreas para as quais não possua permissão.'],
  ['5. Conteúdo institucional e acervo', 'Textos, imagens, fotografias, documentos, vídeos, áudios, símbolos e demais materiais podem possuir caráter institucional, reservado ou protegido. A visualização não representa autorização automática para reprodução, publicação ou compartilhamento externo.'],
  ['6. Minha Agenda e Google Agenda', 'A conexão com o Google Agenda é opcional e depende de autorização expressa. O usuário poderá configurar a visualização de compromissos, a sincronização de eventos e a identificação de conflitos. A conta poderá ser desconectada a qualquer momento.'],
  ['7. Disponibilidade', 'Serão adotadas medidas razoáveis para manter o Portal disponível e seguro. Poderão ocorrer indisponibilidades decorrentes de manutenção, atualizações, falhas técnicas, serviços de terceiros, caso fortuito ou força maior.'],
  ['8. Proteção de dados', 'O tratamento de dados pessoais será realizado conforme a Política de Privacidade do Portal, disponível em https://portal.vl6.com.br/privacidade.'],
  ['9. Links externos', 'O Portal poderá conter links para serviços externos. Cada serviço possui seus próprios termos e políticas, pelos quais é responsável.'],
  ['10. Alterações', 'Estes Termos poderão ser atualizados em razão de alterações legais, técnicas, administrativas ou funcionais. A versão vigente permanecerá publicada nesta página.'],
  ['11. Contato', 'Dúvidas podem ser encaminhadas para lojaverdadeiraluz6@gmail.com ou para o telefone e WhatsApp (64) 99916-7392. Endereço: Rua Raul Seabra, nº 71, Centro, Rio Verde – GO, CEP 75.901-300.'],
  ['12. Legislação e foro', 'Estes Termos serão interpretados conforme a legislação brasileira. Fica eleito o foro da Comarca de Rio Verde, Estado de Goiás, ressalvadas as hipóteses legais de competência obrigatória.'],
] as const;

export default function TermsPage() {
  return (
    <article>
      <header className="mb-9 space-y-3">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Condições de acesso</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Termos de Uso</h1>
        <p className="text-muted">Última atualização: 18 de agosto de 2026.</p>
      </header>
      <div className="space-y-5">
        {terms.map(([title, body]) => (
          <section key={title} className="border-border bg-surface rounded-2xl border p-6">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <p className="text-muted mt-3 leading-7">{body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

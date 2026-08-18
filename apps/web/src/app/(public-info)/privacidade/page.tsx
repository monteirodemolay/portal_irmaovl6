import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Portal do Irmão VL6',
  description: 'Política de Privacidade do Portal do Irmão VL6 e da integração com o Google Agenda.',
};

const sections = [
  {
    title: '1. Identificação',
    body: (
      <>
        <p>O Portal do Irmão VL6, disponível em https://portal.vl6.com.br, é mantido pela Loja Maçônica Verdadeira Luz nº 06, sob a administração institucional do Venerável Mestre Dino Moraes de Sousa.</p>
        <p>Endereço: Rua Raul Seabra, nº 71, Centro, Rio Verde – GO, CEP 75.901-300.<br />E-mail: lojaverdadeiraluz6@gmail.com<br />Telefone e WhatsApp: (64) 99916-7392.</p>
      </>
    ),
  },
  {
    title: '2. Finalidade do Portal',
    body: <p>O Portal disponibiliza aos membros autorizados recursos institucionais, administrativos e de comunicação, incluindo agenda, avisos, documentos, arquivos, acervo histórico, eventos e outras funcionalidades relacionadas às atividades da Loja.</p>,
  },
  {
    title: '3. Dados tratados',
    body: <p>Conforme as funcionalidades utilizadas, poderão ser tratados dados de identificação e contato; informações cadastrais e institucionais; dados de autenticação e controle de acesso; registros técnicos e de auditoria; preferências; informações fornecidas em solicitações de suporte; e dados necessários às funcionalidades de agenda.</p>,
  },
  {
    title: '4. Integração com o Google Agenda',
    body: (
      <>
        <p>A conexão é facultativa. Após autorização expressa, o Portal poderá identificar a conta conectada; consultar eventos para exibição na Minha Agenda; identificar conflitos de horário; inserir, atualizar ou remover eventos sincronizados; e manter a sincronização conforme as preferências escolhidas pelo usuário.</p>
        <p>Os compromissos pessoais provenientes do Google Agenda são apresentados exclusivamente ao respectivo usuário e não são exibidos aos demais membros.</p>
      </>
    ),
  },
  {
    title: '5. Uso das informações do Google',
    body: (
      <>
        <p>As informações recebidas das APIs do Google são utilizadas exclusivamente para fornecer e aprimorar as funcionalidades de agenda solicitadas pelo usuário.</p>
        <p>O uso e a transferência de informações recebidas das APIs do Google observarão a Política de Dados do Usuário dos Serviços de API do Google, inclusive os requisitos de Uso Limitado, quando aplicáveis.</p>
        <p>Esses dados não são vendidos, utilizados para publicidade direcionada, transferidos para fins publicitários nem empregados na criação de perfis comerciais. O acesso humano somente poderá ocorrer quando indispensável à segurança, ao suporte solicitado, à investigação de falha ou ao cumprimento de obrigação legal.</p>
      </>
    ),
  },
  {
    title: '6. Autorização e preferências',
    body: <p>O usuário poderá escolher se deseja exibir seus eventos Google, sincronizar eventos da Loja, sincronizar compromissos pessoais, detectar conflitos, definir o calendário de destino, solicitar sincronização imediata ou desconectar sua conta.</p>,
  },
  {
    title: '7. Armazenamento e segurança',
    body: <p>Os dados podem ser processados por prestadores de infraestrutura, hospedagem, banco de dados, autenticação e segurança necessários ao Portal. São adotadas medidas técnicas e administrativas razoáveis contra acesso não autorizado, perda, alteração ou divulgação inadequada. Senhas pessoais das contas Google não são fornecidas ao Portal.</p>,
  },
  {
    title: '8. Compartilhamento',
    body: <p>Os dados somente poderão ser compartilhados com prestadores indispensáveis à operação; para cumprimento de obrigação legal; para exercício regular de direitos; mediante autorização do titular; ou para prevenção de fraude e proteção da segurança.</p>,
  },
  {
    title: '9. Conservação e exclusão',
    body: <p>Os dados são mantidos pelo período necessário às finalidades institucionais, à segurança e às obrigações legais. Ao desconectar o Google Agenda, o Portal deixará de realizar novas sincronizações e removerá ou inutilizará os tokens de autorização associados, observadas as rotinas técnicas aplicáveis. Registros mínimos poderão ser conservados para segurança, auditoria ou cumprimento legal.</p>,
  },
  {
    title: '10. Revogação do acesso ao Google',
    body: <p>O usuário poderá revogar a integração pelo comando “Desconectar Google”, nas configurações da Minha Agenda, ou diretamente na página de segurança da Conta Google, em “Apps e serviços de terceiros com acesso à conta”.</p>,
  },
  {
    title: '11. Direitos do usuário',
    body: <p>Nos termos da LGPD, o usuário poderá solicitar confirmação de tratamento, acesso, correção, informações sobre uso e compartilhamento, revogação do consentimento, exclusão quando aplicável e revisão de decisões automatizadas.</p>,
  },
  {
    title: '12. Cookies',
    body: <p>O Portal poderá utilizar cookies necessários à autenticação, manutenção de sessão, segurança, preferências e funcionamento das páginas. Caso sejam adotados cookies não essenciais, esta Política será atualizada e será apresentado o mecanismo de escolha aplicável.</p>,
  },
  {
    title: '13. Responsabilidade do usuário',
    body: <p>O usuário deve preservar suas credenciais, utilizar dispositivos seguros, não compartilhar seu acesso e comunicar imediatamente qualquer suspeita de uso indevido.</p>,
  },
  {
    title: '14. Alterações',
    body: <p>Esta Política poderá ser atualizada para refletir alterações legais, técnicas ou funcionais. A versão vigente permanecerá publicada nesta página, com a data da última atualização.</p>,
  },
  {
    title: '15. Contato',
    body: <p>Solicitações de privacidade podem ser encaminhadas à Loja Maçônica Verdadeira Luz nº 06, aos cuidados do Venerável Mestre Dino Moraes de Sousa, pelo e-mail lojaverdadeiraluz6@gmail.com ou pelo telefone e WhatsApp (64) 99916-7392.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <article>
      <header className="mb-9 space-y-3">
        <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">Transparência</p>
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Política de Privacidade</h1>
        <p className="text-muted">Última atualização: 18 de agosto de 2026.</p>
      </header>
      <div className="space-y-5">
        {sections.map((section) => (
          <section key={section.title} className="border-border bg-surface rounded-2xl border p-6">
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            <div className="text-muted mt-3 space-y-3 leading-7">{section.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

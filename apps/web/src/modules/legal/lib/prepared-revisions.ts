import type {
  LegalDocumentClassification,
  LegalDocumentImpact,
  LegalDocumentKey,
} from '@vl6/domain';

export const LEGAL_REVIEW_MILESTONE = {
  reviewedAt: '30/09/2026',
  previousLegalCommit: '24d09676532a91f82ef1a81801b58d9ce57be116',
  reviewedProductionCommit: '1c699dd7f19cf04c80e85ea64f2214977cd742ab',
} as const;

export interface PreparedLegalRevision {
  versao: string;
  classificacao: LegalDocumentClassification;
  impacto: LegalDocumentImpact;
  motivo: string;
  itensAlterados: string[];
  diffResumo: string;
  exigeNovoAceite: boolean;
  conteudoMarkdown: string;
  marcoBase: string;
  marcoAtual: string;
}

function replaceIfPresent(text: string, from: string, to: string): string {
  return text.includes(from) ? text.replace(from, to) : text;
}

function insertBefore(text: string, marker: string, insertion: string): string {
  if (!text.includes(marker)) return text;
  if (text.includes(insertion.trim())) return text;
  return text.replace(marker, `${insertion}\n\n${marker}`);
}

function ensurePolicyUpdates(current: string): string {
  let text = current;

  text = replaceIfPresent(
    text,
    '> **Versão:** 1.0.0 · **Vigência a partir de:** 23/09/2026 · **Aprovada por:** Diretoria VL6',
    '> **Versão:** 2.0.0 · **Vigência a partir de:** 30/09/2026 · **Aprovada por:** Diretoria VL6',
  );

  text = replaceIfPresent(
    text,
    'O tratamento de dados no Portal serve exclusivamente a finalidades institucionais e fraternas da Loja VL6: gestão do quadro de Irmãos, organização de sessões e eventos, preservação da memória histórica da Loja (Acervo), biblioteca e circulação de obras, comunicação interna, e apoio à vida associativa dos Irmãos e de suas famílias (Comunidades Paramaçônicas, Família e Legado).',
    'O tratamento de dados no Portal serve exclusivamente a finalidades institucionais e fraternas da Loja VL6: gestão do quadro de Irmãos, organização de sessões e eventos, preservação da memória histórica da Loja (Acervo), biblioteca e circulação de obras, comunicação interna, apoio à vida associativa dos Irmãos e de suas famílias (Comunidades Paramaçônicas, Família e Legado) e guarda privada de mensagens pessoais na Cripta Digital VL6, nos limites e condições descritos nesta Política.',
  );

  if (!text.includes('comentários feitos em notícias institucionais')) {
    text = replaceIfPresent(
      text,
      'Confirmação de presença em sessões e eventos, empréstimos e devoluções na Biblioteca, itens do Acervo Histórico visualizados/baixados (de forma agregada, sem identificar individualmente quem acessou cada item — Seção 10), notificações recebidas e seu status de leitura.',
      'Confirmação de presença em sessões e eventos, empréstimos e devoluções na Biblioteca, itens do Acervo Histórico visualizados/baixados (de forma agregada, sem identificar individualmente quem acessou cada item — Seção 10), notificações recebidas e seu status de leitura, e comentários feitos em notícias institucionais (texto e nome do autor, exibidos aos demais Irmãos autenticados somente após aprovação da moderação).',
    );
  }

  const criptaSection = `### 8.9 Cripta Digital VL6

A Cripta Digital é uma funcionalidade privada e opcional destinada à guarda de cartas pessoais do próprio Irmão, com destinatários indicados por ele e anexos opcionais, como fotografias, áudio e vídeo. Durante a janela anual de escrita, o Portal trata metadados de autoria, destinatários, estado da carta, versões, anexos, datas, hashes de integridade e registros de auditoria.

O conteúdo das cartas novas é cifrado no navegador antes do envio ao armazenamento temporário. O Portal mantém registros administrativos necessários ao ciclo de guarda, mas a arquitetura vigente não disponibiliza à Administração uma chave online capaz de decifrar as cartas seladas. A abertura de carta selada depende do procedimento colegiado e offline dos Guardiões da Cripta, conforme regras institucionais vigentes.

Rascunhos podem permanecer temporariamente disponíveis durante a janela para continuidade da escrita. Após o fechamento e a conferência das cópias físicas externas, o conteúdo online é retirado conforme o procedimento operacional da Cripta; cartas seladas não retornam ao Portal apenas para leitura administrativa. A entrega por falecimento, quite-placet ou outra hipótese excepcional depende de validação institucional específica e registro de auditoria.

Dados e conteúdos inseridos na Cripta são de responsabilidade do Irmão que os envia, inclusive quanto à indicação de destinatários e à presença de dados pessoais de terceiros nos textos ou anexos.`;

  text = insertBefore(text, '### 8.9 Transparência sobre lacunas técnicas atuais', criptaSection);
  text = replaceIfPresent(text, '### 8.9 Transparência sobre lacunas técnicas atuais', '### 8.10 Transparência sobre lacunas técnicas atuais');
  text = replaceIfPresent(text, 'ver observação na Seção 8.9', 'ver observação na Seção 8.10');

  if (!text.includes('| Cripta Digital')) {
    text = replaceIfPresent(
      text,
      '| Arquivos e imagens              | Preservação do patrimônio histórico da Loja, gestão da Biblioteca, comunicação institucional  |',
      '| Arquivos e imagens              | Preservação do patrimônio histórico da Loja, gestão da Biblioteca, comunicação institucional  |\n| Cripta Digital                    | Guarda privada e temporária de cartas e anexos, com custódia e entrega conforme regra institucional |\n| Preferências locais               | Personalização de tema, contraste, tamanho do texto e redução de animações no dispositivo do usuário |',
    );
  }

  if (!text.includes('**Wix Media Manager**')) {
    text = replaceIfPresent(
      text,
      '- **Vercel** (hospedagem da aplicação e armazenamento de arquivos/mídia — Vercel Blob) — hospedagem e armazenamento de arquivos enviados ao Portal.',
      '- **Vercel** (hospedagem da aplicação e armazenamento de arquivos/mídia — Vercel Blob) — hospedagem e armazenamento de arquivos enviados ao Portal.\n- **Wix Media Manager** — armazenamento temporário privado de rascunhos, cartas e anexos da Cripta Digital durante a janela operacional, sujeito às rotinas de conferência, exportação e retirada previstas para a Cripta.',
    );
  }

  text = replaceIfPresent(
    text,
    'O Portal utiliza apenas **um cookie estritamente necessário**, de sessão de autenticação (`__vl6_session`), com validade de 5 dias, protegido contra acesso por scripts (HttpOnly) e transmitido apenas por conexão segura. Não utilizamos cookies de publicidade, rastreamento entre sites, ou cookies de terceiros.',
    'O Portal utiliza cookies estritamente funcionais. O principal é o cookie de sessão de autenticação (`__vl6_session`), com validade de 5 dias, protegido contra acesso por scripts (HttpOnly) e transmitido apenas por conexão segura. Quando o usuário escolhe explicitamente tema claro ou escuro, o Portal também pode gravar um cookie funcional `theme`, com duração de até 1 ano, apenas para aplicar a preferência visual antes da renderização da página. Não utilizamos cookies de publicidade ou rastreamento entre sites.',
  );

  text = replaceIfPresent(
    text,
    '- Utilizamos armazenamento local do navegador apenas para funcionalidades de conveniência, como o carrinho de retirada de itens da Biblioteca (que guarda somente identificadores de itens, não dados pessoais).',
    '- Utilizamos armazenamento local do navegador para funcionalidades de conveniência, como o carrinho de retirada de itens da Biblioteca e as preferências de aparência e acessibilidade do próprio dispositivo (tema, tamanho do texto, contraste e redução de animações). Essas preferências não são usadas para publicidade, perfilamento ou rastreamento entre sites.',
  );

  if (!text.includes('As cartas novas da Cripta')) {
    text = replaceIfPresent(
      text,
      '- Toda ação administrativa relevante sobre cadastros (criação, edição, exclusão, mudança de permissão) é registrada em um log de auditoria interno, de acesso restrito à administração da Loja, para fins de segurança e responsabilização.',
      '- Toda ação administrativa relevante sobre cadastros (criação, edição, exclusão, mudança de permissão) é registrada em um log de auditoria interno, de acesso restrito à administração da Loja, para fins de segurança e responsabilização.\n- As cartas novas da Cripta são cifradas no navegador antes do envio. A custódia das cartas seladas utiliza procedimento offline com Guardiões e cópias físicas externas, separado das credenciais comuns de acesso ao Portal.',
    );
  }

  if (!text.includes('| Rascunhos da Cripta')) {
    text = replaceIfPresent(
      text,
      '| Registros de consentimento de publicação                       | Mantidos de forma permanente, como prova de conformidade                                                                          |',
      '| Registros de consentimento de publicação                       | Mantidos de forma permanente, como prova de conformidade                                                                          |\n| Rascunhos da Cripta                                              | Durante a janela de escrita e até sua inclusão no ciclo de guarda/restauração aplicável                                             |\n| Cartas seladas e anexos da Cripta                               | Conforme o ciclo de custódia institucional e as cópias físicas externas; metadados de auditoria podem permanecer para rastreabilidade |',
    );
  }

  if (!text.includes('Quando uma notícia institucional do site oficial da Loja')) {
    const newsArchive = `Quando uma notícia institucional do site oficial da Loja (\`vl6.com.br\`) é vinculada por um administrador a um Evento ou Sessão do Acervo, o Portal pode importar automaticamente para o Acervo as fotografias, vídeos diretos e documentos que integrem a área editorial dessa notícia. Essa cópia tem finalidade exclusiva de preservação da memória institucional e não altera a data editorial da matéria: o contexto histórico permanece determinado pela data do Evento relacionado. Os arquivos incorporados seguem os mesmos controles de acesso, armazenamento, retenção e auditoria aplicáveis ao restante do Acervo.`;
    const marker = '### 17.3 Conteúdo enviado pelos Irmãos';
    if (text.includes(marker)) {
      text = text.replace(marker, `${newsArchive}\n\n${marker}`);
    }
  }

  const criptaFiles = `### 17.5 Cripta Digital

A Cripta possui finalidade distinta do Acervo Histórico. Seu conteúdo não é destinado à consulta ordinária por outros Irmãos nem à administração cotidiana. O Portal trata a carta como conteúdo privado do titular, aplica cifragem antes do armazenamento temporário e mantém apenas os metadados necessários à operação e à auditoria.

O ciclo da Cripta pode envolver armazenamento temporário privado no Wix Media Manager e, após conferência, cópias em unidades físicas externas. A Loja mantém procedimentos próprios de lacração, restauração de rascunhos, verificação de integridade, abertura excepcional e entrega. A eliminação de cópias depende das limitações técnicas do provedor e das mídias físicas, razão pela qual o Portal não promete apagamento físico instantâneo ou irrecuperável quando isso não puder ser tecnicamente comprovado.`;

  text = insertBefore(text, '## 18. Responsabilidades', criptaFiles);

  text = replaceIfPresent(
    text,
    'Nenhuma versão anterior existe até a publicação desta primeira versão (1.0.0). O histórico completo de versões futuras estará disponível na área "Termos e Privacidade" do Portal.',
    'A versão 1.0.0 constitui o **Marco Inicial** dos documentos jurídicos do Portal. As versões posteriores registram as mudanças, seus impactos, os itens alterados e, quando aplicável, a exigência de novo aceite. O histórico completo permanece disponível na área "Termos e Privacidade" do Portal.',
  );

  text = replaceIfPresent(text, '- **Versão:** 1.0.0', '- **Versão:** 2.0.0');
  text = replaceIfPresent(text, '- **Data de vigência:** 23/09/2026', '- **Data de vigência:** 30/09/2026');
  text = replaceIfPresent(
    text,
    '- **Classificação desta versão:** Publicação inicial (Mudança institucional)',
    '- **Classificação desta versão:** Mudança de LGPD — nova categoria de tratamento (Cripta Digital) e atualização de transparência técnica',
  );

  return text;
}

function ensureTermsUpdates(current: string): string {
  let text = current;

  text = replaceIfPresent(
    text,
    '> **Versão:** 1.0.0 · **Vigência a partir de:** 23/09/2026 · **Aprovada por:** Diretoria VL6',
    '> **Versão:** 2.0.0 · **Vigência a partir de:** 30/09/2026 · **Aprovada por:** Diretoria VL6',
  );

  if (!text.includes('Comentar notícias institucionais publicadas no Portal')) {
    text = replaceIfPresent(
      text,
      '- Uso das ferramentas de agenda, notificações e comunicação institucional;',
      '- Uso das ferramentas de agenda, notificações e comunicação institucional;\n- Comentar notícias institucionais publicadas no Portal, ciente de que o comentário só fica visível aos demais Irmãos depois de aprovado pela moderação, e que seu nome completo é exibido junto ao texto aprovado;',
    );
  }

  if (!text.includes('### 8.2-A Conteúdo institucional já publicado')) {
    const autoAcervo = `### 8.2-A Conteúdo institucional já publicado

Materiais que já integrem notícias e publicações oficiais da própria Loja podem ser incorporados automaticamente ao Acervo Histórico quando a notícia for vinculada administrativamente ao Evento ou Sessão correspondente. Essa incorporação pode abranger fotografias, vídeos diretos e documentos da publicação original e tem por finalidade preservar a memória institucional, mantendo a proveniência da notícia e o contexto histórico do Evento. A automação não autoriza a importação irrestrita de conteúdo de terceiros nem substitui a revisão administrativa das relações históricas.`;
    text = insertBefore(text, '### 8.3 Biblioteca', autoAcervo);
  }

  const criptaTerms = `## 10-A. Cripta Digital VL6

A Cripta Digital é uma funcionalidade opcional e privada para que o Irmão escreva cartas pessoais e acrescente anexos destinados às pessoas que indicar. O autor é responsável pelo conteúdo enviado, pela legitimidade de inserir dados de terceiros e pela correta indicação dos destinatários.

Durante a janela de escrita, o Irmão pode manter rascunhos e concluir cartas conforme os limites técnicos informados na interface. Ao selar uma carta, o usuário reconhece que o conteúdo entra no procedimento institucional de custódia e deixa de funcionar como um documento comum editável ou livremente reaberto pelo Portal.

A Administração da Cripta acompanha estado, participação, integridade, cópias e ocorrências, mas não recebe autorização geral para ler o conteúdo das cartas. A abertura de carta selada depende do procedimento colegiado e offline dos Guardiões, conforme as regras vigentes da Loja e a hipótese institucional de entrega.

É proibido tentar contornar a cifragem, acessar carta de outro Irmão, obter partes de chave sem autorização, copiar mídias de custódia, alterar manifestos, hashes ou registros de integridade, ou usar a Cripta para conteúdo ilícito ou que viole direitos de terceiros.

Em casos de falecimento, quite-placet, desligamento ou outra situação excepcional, a devolução, entrega, exclusão ou abertura seguirá procedimento administrativo específico, com validação documental, autorização interna e registro de auditoria. O Portal não garante apagamento físico instantâneo de backups ou mídias externas quando a tecnologia utilizada não permitir comprovação dessa eliminação.`;

  text = insertBefore(text, '## 11. Condutas vedadas', criptaTerms);

  text = replaceIfPresent(text, '- **Versão:** 1.0.0', '- **Versão:** 2.0.0');
  text = replaceIfPresent(text, '- **Data de vigência:** 23/09/2026', '- **Data de vigência:** 30/09/2026');
  text = replaceIfPresent(
    text,
    '- **Classificação desta versão:** Publicação inicial (Mudança institucional)',
    '- **Classificação desta versão:** Nova funcionalidade relevante — Cripta Digital VL6 e consolidação das mudanças operacionais desde o Marco Inicial',
  );

  return text;
}

export function getPreparedLegalRevision(
  documento: LegalDocumentKey,
  currentVersion: string | null,
  currentMarkdown: string,
): PreparedLegalRevision | null {
  const knowledgeRevision = getPreparedKnowledgeRevision(documento, currentVersion, currentMarkdown);
  if (knowledgeRevision) return knowledgeRevision;

  if (currentVersion !== '1.0.0') return null;

  const marcoBase = LEGAL_REVIEW_MILESTONE.previousLegalCommit;
  const marcoAtual = LEGAL_REVIEW_MILESTONE.reviewedProductionCommit;

  if (documento === 'politica_privacidade') {
    return {
      versao: '2.0.0',
      classificacao: 'mudanca_lgpd',
      impacto: 'alto',
      motivo:
        'Consolida as alterações do Portal desde o Marco Inicial e documenta a Cripta Digital como nova categoria relevante de tratamento, além de atualizar cookies funcionais, preferências locais e subprocessadores.',
      itensAlterados: [
        'Cripta Digital: cartas, destinatários, anexos, cifragem, custódia, retenção e abertura excepcional',
        'Wix Media Manager como armazenamento temporário privado da Cripta',
        'Cookie funcional de tema e preferências de aparência/acessibilidade em armazenamento local',
        'Comentários moderados em notícias e integração automática Notícias ↔ Acervo, quando ainda não constarem no texto publicado',
        `Marco jurídico anterior: ${marcoBase}`,
        `Marco técnico revisado: ${marcoAtual}`,
      ],
      diffResumo:
        'Incluímos a Cripta Digital e atualizamos a transparência sobre armazenamento temporário no Wix, custódia offline, cookies funcionais e preferências locais. Esta versão exige novo aceite.',
      exigeNovoAceite: true,
      conteudoMarkdown: ensurePolicyUpdates(currentMarkdown),
      marcoBase,
      marcoAtual,
    };
  }

  return {
    versao: '2.0.0',
    classificacao: 'nova_funcionalidade',
    impacto: 'alto',
    motivo:
      'Inclui as regras de utilização, confidencialidade e custódia da Cripta Digital e consolida funcionalidades institucionais implantadas desde o Marco Inicial.',
    itensAlterados: [
      'Regras de uso da Cripta Digital, cartas, anexos, destinatários e selagem',
      'Custódia colegiada e abertura excepcional de cartas seladas',
      'Condutas proibidas relacionadas a chaves, mídias, integridade e acesso indevido',
      'Comentários moderados em notícias e integração automática Notícias ↔ Acervo, quando ainda não constarem no texto publicado',
      `Marco jurídico anterior: ${marcoBase}`,
      `Marco técnico revisado: ${marcoAtual}`,
    ],
    diffResumo:
      'Os Termos passam a disciplinar a Cripta Digital, sua custódia, confidencialidade, abertura excepcional e responsabilidades do autor. Esta versão exige novo aceite.',
    exigeNovoAceite: true,
    conteudoMarkdown: ensureTermsUpdates(currentMarkdown),
    marcoBase,
    marcoAtual,
  };
}

// Revisão aditiva: preserva o texto vigente e o fluxo anterior para a versão inicial.
function getPreparedKnowledgeRevision(
  documento: LegalDocumentKey,
  currentVersion: string | null,
  currentMarkdown: string,
): PreparedLegalRevision | null {
  if (
    !['2.0.0', '2.1.0', '2.2.0', '2.3.0', '2.3.1'].includes(currentVersion ?? '') ||
    !currentMarkdown.trim() ||
    currentMarkdown.includes('## Conhecimento VL6 — formação continuada')
  )
    return null;
  const policy = documento === 'politica_privacidade';
  const section = policy ? POLICY_KNOWLEDGE_COMPLEMENT : TERMS_KNOWLEDGE_COMPLEMENT;
  const current = currentMarkdown.replace(/(\*\*Versão:\*\*\s*)\d+\.\d+\.\d+/g, '$12.4.0');
  return {
    versao: '2.4.0',
    classificacao: policy ? 'mudanca_lgpd' : 'nova_funcionalidade',
    impacto: 'alto',
    motivo:
      'Conhecimento VL6: nova finalidade de formação continuada, acompanhamento individual, respostas a atividades e avaliações, certificados e autorização das instruções por grau.',
    itensAlterados: [
      'Formação institucional e restrição de instruções por grau do cadastro',
      'Progresso individual, respostas, tentativas, correção humana e certificados',
      'Arquivos privados do Conhecimento e referências à Biblioteca existente',
      'Acesso administrativo específico e retenção sem purga automática',
    ],
    diffResumo:
      'Acrescenta o Conhecimento VL6 ao texto vigente, preservando as condições do Acervo e da Biblioteca. Exige novo aceite por nova finalidade de tratamento e novas condições de uso.',
    exigeNovoAceite: true,
    conteudoMarkdown: current + '\n\n' + section + '\n',
    marcoBase: '6ac147850000845d529514f7ec4115c210bab948',
    marcoAtual: 'Conhecimento VL6 — alterações deste PR; implantação ainda não confirmada',
  };
}

const POLICY_KNOWLEDGE_COMPLEMENT = `## Conhecimento VL6 — formação continuada

O Conhecimento VL6 organiza formação continuada e aperfeiçoamento institucional. Utiliza o grau existente no cadastro para limitar a disponibilidade das instruções e registra, de forma individual, aulas realizadas, ponto de retomada de vídeos, atividades, respostas, tentativas, aproveitamento, retornos dos responsáveis e certificados. A carga concluída é uma estimativa baseada nas aulas; não constitui medição de tempo assistido.

Seu desempenho permanece privado. Você acessa seus próprios registros; responsáveis com permissão administrativa específica da Loja acessam os registros necessários ao acompanhamento e à avaliação. Não há ranking ou divulgação pública de notas, leituras ou respostas. Certificados são consultados no ambiente autenticado.

Os arquivos das novas aulas são guardados em armazenamento privado da Vercel e servidos mediante autenticação e verificação de grau. O Firestore mantém os registros do módulo em coleções próprias. Materiais recomendados da Biblioteca são vinculados por referência e seguem as condições de acesso do catálogo original. Links externos continuam sujeitos às regras do respectivo serviço.

Os registros permanecem enquanto necessários à formação e à prestação de contas institucional, observados direitos do titular e obrigações aplicáveis. Arquivar uma formação não apaga automaticamente seus registros. Não existe purga automática nesta implantação. Solicitações sobre os dados podem ser feitas pelos canais já indicados nesta Política. Evite incluir dados sensíveis, informações de terceiros ou conteúdos ritualísticos reservados em respostas livres.`;

const TERMS_KNOWLEDGE_COMPLEMENT = `## Conhecimento VL6 — formação continuada

O Conhecimento VL6 destina-se à formação institucional, histórica, administrativa e ao aperfeiçoamento dos Irmãos. Não é repositório de palavras, sinais, toques, segredos, cerimônias ou rituais reservados. Responsáveis autorizados devem revisar o conteúdo, direitos de uso, fontes e público antes de publicar.

O acesso às instruções considera o grau registrado no cadastro e a regra de público definida pela Administração. O módulo utiliza sua conta atual; não exige novo cadastro. Leituras recomendadas remetem à Biblioteca existente, sem duplicar ou modificar seus livros e procedimentos de empréstimo.

Aulas e atividades podem registrar progresso, ponto de retomada de vídeo, respostas, tentativas e aproveitamento. Concluir uma aula é declaração do usuário de estudo do conteúdo, não prova de tempo assistido. Reflexões e estudos de situação podem exigir análise do responsável. Avaliações têm critérios apresentados na formação e retornos orientados ao aperfeiçoamento, sem competição ou exposição pública.

Certificados institucionais, quando habilitados, dependem das etapas obrigatórias e dos critérios de avaliação. Não substituem titulação acadêmica, progressão de grau ou decisão institucional da Loja. Os relatórios são restritos ao próprio titular e aos responsáveis autorizados. Alterações relevantes geram versão nova da formação e podem exigir novo percurso de estudo.`;

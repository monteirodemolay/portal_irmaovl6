/**
 * Taxonomia fechada de área de atuação profissional da Central dos Irmãos
 * VL6 — substitui o antigo campo livre. Fechada de propósito: sustenta
 * contagens confiáveis nos cards "Explore por área" e no indicador "Áreas
 * de atuação" do Diretório (docs/architecture). `outra` é o escape hatch
 * (texto livre em `MemberCentralProfile.areaAtuacaoOutra`), mesmo espírito
 * do "Outra" já usado em `Member.profissao`.
 */
export const AREA_ATUACAO_KEYS = [
  'direito',
  'engenharia',
  'saude',
  'educacao',
  'administracao',
  'tecnologia',
  'agronegocio',
  'comercio',
  'financas',
  'comunicacao',
  'construcao_civil',
  'servico_publico',
  'industria',
  'artes_cultura',
  'outra',
] as const;
export type AreaAtuacaoKey = (typeof AREA_ATUACAO_KEYS)[number];

export const AREA_ATUACAO_LABELS: Record<AreaAtuacaoKey, string> = {
  direito: 'Direito',
  engenharia: 'Engenharia',
  saude: 'Saúde',
  educacao: 'Educação',
  administracao: 'Administração e Gestão',
  tecnologia: 'Tecnologia e TI',
  agronegocio: 'Agronegócio',
  comercio: 'Comércio e Varejo',
  financas: 'Finanças e Contabilidade',
  comunicacao: 'Comunicação e Marketing',
  construcao_civil: 'Construção Civil e Arquitetura',
  servico_publico: 'Serviço Público e Segurança',
  industria: 'Indústria e Produção',
  artes_cultura: 'Artes e Cultura',
  outra: 'Outra',
};

/**
 * Taxonomia fechada de nível de ensino — "Formação Acadêmica" da Central
 * dos Irmãos VL6 (currículo educacional). Cobre do início ao fim do
 * sistema educacional brasileiro; nenhum nível é obrigatório, o Irmão
 * preenche só o que quiser. Ordem crescente (usada como ordenação padrão
 * quando não há data pra desempatar).
 */
export const EDUCATION_LEVEL_KEYS = [
  'educacao_infantil',
  'ensino_fundamental',
  'ensino_medio',
  'tecnico',
  'graduacao',
  'extensao',
  'pos_graduacao',
  'mestrado',
  'doutorado',
  'pos_doutorado',
] as const;
export type EducationLevelKey = (typeof EDUCATION_LEVEL_KEYS)[number];

export const EDUCATION_LEVEL_LABELS: Record<EducationLevelKey, string> = {
  educacao_infantil: 'Educação Infantil',
  ensino_fundamental: 'Ensino Fundamental',
  ensino_medio: 'Ensino Médio',
  tecnico: 'Curso Técnico',
  graduacao: 'Graduação',
  extensao: 'Extensão / Curso Livre',
  pos_graduacao: 'Pós-Graduação / Especialização',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
  pos_doutorado: 'Pós-Doutorado',
};

/**
 * Estado de publicação de cada negócio/atividade da Central (Comunidade
 * VL6 § Negócios & Serviços) — mapa de implantação exige revisão
 * administrativa antes de qualquer atividade aparecer publicamente.
 * `nao_divulgado`: `CentralBusinessEntry.divulgar !== true` — o Irmão só
 * quer registrar onde trabalha (contato + pareamento por CNPJ), nunca
 * entra em revisão nem aparece no Diretório. Estado estável, diferente de
 * `draft` (que significa "incompleto, ainda não enviado pra revisão" —
 * uma entrada não-divulgada nunca teve a intenção de ser enviada).
 * `draft`: nunca enviado (ou devolvido pela Administração pra revisão).
 * `pending_review`: o Irmão salvou/alterou o conteúdo, aguardando a
 * Administração aprovar. `published`: visível no Diretório de Negócios.
 * `suspended`: já esteve publicado, retirado pela Administração (nunca pelo
 * próprio Irmão editando — isso volta pra `draft`, ver `UpdateCentralProfileUseCase`).
 */
export const BUSINESS_PUBLICATION_STATUS_KEYS = [
  'nao_divulgado',
  'draft',
  'pending_review',
  'published',
  'suspended',
] as const;
export type BusinessPublicationStatus = (typeof BUSINESS_PUBLICATION_STATUS_KEYS)[number];

export const BUSINESS_PUBLICATION_STATUS_LABELS: Record<BusinessPublicationStatus, string> = {
  nao_divulgado: 'Somente contato',
  draft: 'Rascunho',
  pending_review: 'Em revisão',
  published: 'Publicado',
  suspended: 'Suspenso',
};

/**
 * Como o negócio atende — usado tanto no formulário (checkboxes) quanto no
 * filtro do Diretório ("atende online" importa muito mais que cidade pra
 * quem mora em outra praça). Array, não campo único: nada impede um negócio
 * de atender presencial E online ao mesmo tempo.
 */
export const FORMA_ATENDIMENTO_KEYS = ['presencial', 'online', 'entrega'] as const;
export type FormaAtendimentoKey = (typeof FORMA_ATENDIMENTO_KEYS)[number];

export const FORMA_ATENDIMENTO_LABELS: Record<FormaAtendimentoKey, string> = {
  presencial: 'Atende presencialmente',
  online: 'Atende online/remoto',
  entrega: 'Entrega/envio',
};

/**
 * Abrangência declarada de uma afiliação institucional (Associação,
 * Instituição ou organização sem fins lucrativos) — cobre o pedido de
 * suportar "Instituições Internacionais" sem virar campo de texto livre
 * ambíguo. `pais` (em `CentralAffiliationEntry`) é mais relevante quando
 * `internacional`, mas fica sempre disponível.
 */
export const AFFILIATION_ABRANGENCIA_KEYS = ['local', 'nacional', 'internacional'] as const;
export type AffiliationAbrangenciaKey = (typeof AFFILIATION_ABRANGENCIA_KEYS)[number];

export const AFFILIATION_ABRANGENCIA_LABELS: Record<AffiliationAbrangenciaKey, string> = {
  local: 'Local',
  nacional: 'Nacional',
  internacional: 'Internacional',
};

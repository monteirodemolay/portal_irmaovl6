import type { AreaAtuacaoKey } from './central';

/**
 * Especialização dentro da Área de Atuação (`AREA_ATUACAO_KEYS`) — pedido
 * explícito de enriquecer o perfil profissional: Direito, Engenharia e
 * Saúde têm ramificações/especialidades reconhecidas que uma única área
 * fechada não capturava. Taxonomia fechada por área, mesmo espírito de
 * `AREA_ATUACAO_KEYS` (contagens/filtros confiáveis) — `outra` é o escape
 * hatch em toda área, texto livre em
 * `MemberCentralProfile.especializacaoOutra`, mesmo padrão de
 * `areaAtuacaoOutra`. `area: 'outra'` não tem sublista própria — só o
 * escape, já que a própria área já é "outra".
 */
export const ESPECIALIZACAO_BY_AREA: Record<AreaAtuacaoKey, readonly string[]> = {
  direito: [
    'trabalhista',
    'civel',
    'tributario',
    'penal',
    'empresarial',
    'previdenciario',
    'ambiental',
    'familia_sucessoes',
    'administrativo',
    'outra',
  ],
  engenharia: [
    'civil',
    'eletrica',
    'mecanica',
    'estrutural',
    'software_computacao',
    'producao',
    'quimica',
    'ambiental',
    'outra',
  ],
  saude: [
    'cardiologia',
    'ortopedia',
    'pediatria',
    'ginecologia_obstetricia',
    'psiquiatria',
    'dermatologia',
    'clinica_geral',
    'odontologia',
    'enfermagem',
    'fisioterapia',
    'outra',
  ],
  educacao: [
    'educacao_infantil',
    'ensino_fundamental',
    'ensino_medio',
    'ensino_superior',
    'pedagogia',
    'gestao_escolar',
    'educacao_especial',
    'outra',
  ],
  administracao: [
    'recursos_humanos',
    'financas_corporativas',
    'marketing',
    'logistica',
    'projetos',
    'qualidade',
    'outra',
  ],
  tecnologia: [
    'desenvolvimento_software',
    'infraestrutura_redes',
    'seguranca_informacao',
    'dados_bi',
    'suporte_ti',
    'outra',
  ],
  agronegocio: [
    'producao_agricola',
    'pecuaria',
    'agroindustria',
    'veterinaria',
    'agronomia',
    'outra',
  ],
  comercio: ['varejo', 'atacado', 'e_commerce', 'vendas', 'outra'],
  financas: ['contabilidade', 'auditoria', 'investimentos', 'bancario', 'seguros', 'outra'],
  comunicacao: [
    'jornalismo',
    'publicidade',
    'relacoes_publicas',
    'design_grafico',
    'audiovisual',
    'outra',
  ],
  construcao_civil: [
    'obras_residenciais',
    'obras_comerciais',
    'arquitetura',
    'engenharia_estrutural',
    'incorporacao',
    'outra',
  ],
  servico_publico: [
    'seguranca_publica',
    'defesa',
    'administracao_publica',
    'fiscal',
    'judiciario',
    'outra',
  ],
  industria: [
    'producao_industrial',
    'manutencao_industrial',
    'controle_qualidade',
    'logistica_industrial',
    'outra',
  ],
  artes_cultura: [
    'musica',
    'artes_plasticas',
    'teatro',
    'literatura',
    'producao_cultural',
    'outra',
  ],
  outra: ['outra'],
} as const;

/**
 * Mapa único global de rótulos — não namespaced por área. Nas áreas reais
 * não há colisão semântica esperada (ex. "Ambiental" existe em Direito e
 * Engenharia com o mesmo rótulo, reaproveitável), mesmo espírito de
 * `AREA_ATUACAO_LABELS` (também um mapa único, sem namespace).
 */
export const ESPECIALIZACAO_LABELS: Record<string, string> = {
  // Direito
  trabalhista: 'Trabalhista',
  civel: 'Cível',
  tributario: 'Tributário',
  penal: 'Penal',
  empresarial: 'Empresarial',
  previdenciario: 'Previdenciário',
  ambiental: 'Ambiental',
  familia_sucessoes: 'Família e Sucessões',
  administrativo: 'Administrativo',
  // Engenharia
  civil: 'Civil',
  eletrica: 'Elétrica',
  mecanica: 'Mecânica',
  estrutural: 'Estrutural',
  software_computacao: 'Software/Computação',
  producao: 'Produção',
  quimica: 'Química',
  // Saúde
  cardiologia: 'Cardiologia',
  ortopedia: 'Ortopedia',
  pediatria: 'Pediatria',
  ginecologia_obstetricia: 'Ginecologia e Obstetrícia',
  psiquiatria: 'Psiquiatria',
  dermatologia: 'Dermatologia',
  clinica_geral: 'Clínica Geral',
  odontologia: 'Odontologia',
  enfermagem: 'Enfermagem',
  fisioterapia: 'Fisioterapia',
  // Educação
  educacao_infantil: 'Educação Infantil',
  ensino_fundamental: 'Ensino Fundamental',
  ensino_medio: 'Ensino Médio',
  ensino_superior: 'Ensino Superior',
  pedagogia: 'Pedagogia',
  gestao_escolar: 'Gestão Escolar',
  educacao_especial: 'Educação Especial',
  // Administração
  recursos_humanos: 'Recursos Humanos',
  financas_corporativas: 'Finanças Corporativas',
  marketing: 'Marketing',
  logistica: 'Logística',
  projetos: 'Projetos',
  qualidade: 'Qualidade',
  // Tecnologia
  desenvolvimento_software: 'Desenvolvimento de Software',
  infraestrutura_redes: 'Infraestrutura e Redes',
  seguranca_informacao: 'Segurança da Informação',
  dados_bi: 'Dados e BI',
  suporte_ti: 'Suporte de TI',
  // Agronegócio
  producao_agricola: 'Produção Agrícola',
  pecuaria: 'Pecuária',
  agroindustria: 'Agroindústria',
  veterinaria: 'Veterinária',
  agronomia: 'Agronomia',
  // Comércio
  varejo: 'Varejo',
  atacado: 'Atacado',
  e_commerce: 'E-commerce',
  vendas: 'Vendas',
  // Finanças
  contabilidade: 'Contabilidade',
  auditoria: 'Auditoria',
  investimentos: 'Investimentos',
  bancario: 'Bancário',
  seguros: 'Seguros',
  // Comunicação
  jornalismo: 'Jornalismo',
  publicidade: 'Publicidade',
  relacoes_publicas: 'Relações Públicas',
  design_grafico: 'Design Gráfico',
  audiovisual: 'Audiovisual',
  // Construção Civil
  obras_residenciais: 'Obras Residenciais',
  obras_comerciais: 'Obras Comerciais',
  arquitetura: 'Arquitetura',
  engenharia_estrutural: 'Engenharia Estrutural',
  incorporacao: 'Incorporação',
  // Serviço Público
  seguranca_publica: 'Segurança Pública',
  defesa: 'Defesa',
  administracao_publica: 'Administração Pública',
  fiscal: 'Fiscal',
  judiciario: 'Judiciário',
  // Indústria
  producao_industrial: 'Produção Industrial',
  manutencao_industrial: 'Manutenção Industrial',
  controle_qualidade: 'Controle de Qualidade',
  logistica_industrial: 'Logística Industrial',
  // Artes e Cultura
  musica: 'Música',
  artes_plasticas: 'Artes Plásticas',
  teatro: 'Teatro',
  literatura: 'Literatura',
  producao_cultural: 'Produção Cultural',
  // Escape hatch, todas as áreas
  outra: 'Outra',
};

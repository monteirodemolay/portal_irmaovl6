/**
 * Lista de profissões pré-definidas do cadastro de Irmão. Quando o
 * Administrador escolhe "Outra" e digita uma profissão fora desta lista,
 * ela passa a aparecer como opção nos próximos cadastros — ver
 * `listUsedProfessions` em `member-actions.ts`, que busca as profissões já
 * cadastradas no tenant e mescla com esta lista fixa.
 */
export const COMMON_PROFESSIONS = [
  'Advogado(a)',
  'Administrador(a)',
  'Agricultor(a)',
  'Arquiteto(a)',
  'Autônomo(a)',
  'Bancário(a)',
  'Comerciante',
  'Contador(a)',
  'Corretor(a) de Imóveis',
  'Dentista',
  'Eletricista',
  'Empresário(a)',
  'Enfermeiro(a)',
  'Engenheiro(a)',
  'Estudante',
  'Farmacêutico(a)',
  'Jornalista',
  'Médico(a)',
  'Mecânico(a)',
  'Militar',
  'Motorista',
  'Pastor/Padre',
  'Pedreiro(a)',
  'Policial',
  'Professor(a)',
  'Programador(a)/TI',
  'Psicólogo(a)',
  'Servidor(a) Público(a)',
  'Vendedor(a)',
  'Aposentado(a)',
] as const;

/** Sentinela do `<select>` — nunca é o valor salvo, dispara o campo de texto livre. */
export const OTHER_PROFESSION_VALUE = '__outra__';

/**
 * Resolve o valor de Profissão enviado pelo formulário: se o `<select>`
 * estiver no sentinela "Outra", usa o texto livre digitado ao lado
 * (`profissaoOutra`) — é assim que uma profissão nova passa a existir pra
 * próximos cadastros (ver `listUsedProfessions`, que a encontra de volta
 * buscando os Irmãos já cadastrados). Usada tanto pelo cadastro
 * administrativo quanto pelo autoatendimento do próprio Irmão.
 */
export function resolveProfissaoFromFormData(formData: FormData): string | null {
  const selected = formData.get('profissao');
  if (selected === OTHER_PROFESSION_VALUE) {
    return String(formData.get('profissaoOutra') ?? '').trim() || null;
  }
  return (selected as string) || null;
}

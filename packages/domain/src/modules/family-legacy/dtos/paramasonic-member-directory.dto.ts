/**
 * Recorte seguro do Diretório dos Irmãos para usuários paramaçônicos.
 *
 * Deliberadamente não contém grau, situação cadastral, datas maçônicas,
 * contatos, endereço, família, honrarias, Acervo ou identificadores de
 * negócio. Campos profissionais só são preenchidos quando o próprio Irmão
 * publicou os blocos correspondentes na Central VL6.
 */
export interface ParamasonicMemberDirectoryDTO {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  cargoAtual: string | null;
  apresentacao: string | null;
  profissao: string | null;
  areaAtuacao: string | null;
  cidadeExibicao: string | null;
}

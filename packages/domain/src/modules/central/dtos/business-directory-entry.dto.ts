export interface BusinessDirectoryEntryDTO {
  businessId: string;
  nomeEmpresa: string;
  segmento: string | null;
  cargo: string | null;
  descricao: string | null;
  cidade: string | null;
  telefoneComercial: string | null;
  siteUrl: string | null;
  responsavel: {
    memberId: string;
    nomeCompleto: string;
    fotoUrl: string | null;
  };
}

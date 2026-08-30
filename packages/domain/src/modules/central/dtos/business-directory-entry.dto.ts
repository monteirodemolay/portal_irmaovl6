import type { FormaAtendimentoKey } from '@vl6/shared';

export interface BusinessDirectoryEntryDTO {
  businessId: string;
  nomeEmpresa: string;
  segmento: string | null;
  cargo: string | null;
  descricao: string | null;
  cidade: string | null;
  telefoneComercial: string | null;
  siteUrl: string | null;
  logoUrl: string | null;
  produtosServicos: string[];
  whatsappComercial: string | null;
  emailComercial: string | null;
  instagramComercial: string | null;
  formasAtendimento: FormaAtendimentoKey[];
  horarioFuncionamento: string | null;
  ofereceDescontoIrmaos: boolean;
  descontoDescricao: string | null;
  responsavel: {
    memberId: string;
    nomeCompleto: string;
    fotoUrl: string | null;
    dataIniciacao: Date | null;
  };
}

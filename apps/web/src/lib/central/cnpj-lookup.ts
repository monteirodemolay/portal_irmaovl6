import 'server-only';

export interface CnpjLookupResult {
  nomeEmpresa: string;
  cidade: string | null;
}

const CNPJ_LOOKUP_TIMEOUT_MS = 8000;

export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '');
}

interface BrasilApiCnpjResponse {
  razao_social?: string;
  nome_fantasia?: string | null;
  municipio?: string | null;
}

/**
 * Atalho opcional pra evitar digitar o nome da empresa — nunca obrigatório
 * (o Irmão pode sempre só preencher "Nome da empresa" na mão, como sempre
 * funcionou). Usa a BrasilAPI (pública, sem chave, sem custo) só pra
 * pré-preencher; o Irmão continua livre pra editar o que vier. Falha de
 * rede/CNPJ inválido/não encontrado retorna `null` — o chamador decide a
 * mensagem, não lança exceção pra não travar o formulário.
 */
export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CNPJ_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as BrasilApiCnpjResponse;
    const nomeEmpresa = data.nome_fantasia?.trim() || data.razao_social?.trim();
    if (!nomeEmpresa) return null;

    return {
      nomeEmpresa,
      cidade: data.municipio?.trim() || null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

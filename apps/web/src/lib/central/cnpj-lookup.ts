import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@vl6/shared';

export interface CnpjLookupResult {
  nomeEmpresa: string;
  cidade: string | null;
}

export type CnpjLookupFailureReason = 'invalid' | 'not_found' | 'unavailable';

export interface CnpjLookupFailure {
  reason: CnpjLookupFailureReason;
}

const CNPJ_LOOKUP_TIMEOUT_MS = 10000;

export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '');
}

type ProviderOutcome =
  | { outcome: 'success'; data: CnpjLookupResult }
  | { outcome: 'not_found' }
  | { outcome: 'unavailable' };

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CNPJ_LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function logProviderIssue(provider: string, detail: Record<string, unknown>) {
  logger.warn(`Consulta de CNPJ falhou em ${provider}`, { route: 'lookupCnpj', provider, ...detail });
  Sentry.captureMessage(`CNPJ lookup: ${provider} indisponível`, {
    level: 'warning',
    tags: { route: 'lookupCnpj', provider },
    extra: detail,
  });
}

interface BrasilApiCnpjResponse {
  razao_social?: string;
  nome_fantasia?: string | null;
  municipio?: string | null;
}

/** Pública, sem chave. https://brasilapi.com.br/docs#tag/CNPJ */
async function fetchBrasilApi(digits: string): Promise<ProviderOutcome> {
  try {
    const response = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (response.status === 404) return { outcome: 'not_found' };
    if (!response.ok) {
      logProviderIssue('BrasilAPI', { status: response.status });
      return { outcome: 'unavailable' };
    }
    const data = (await response.json()) as BrasilApiCnpjResponse;
    const nomeEmpresa = data.nome_fantasia?.trim() || data.razao_social?.trim();
    if (!nomeEmpresa) {
      logProviderIssue('BrasilAPI', { reason: 'resposta sem razão social/nome fantasia' });
      return { outcome: 'unavailable' };
    }
    return { outcome: 'success', data: { nomeEmpresa, cidade: data.municipio?.trim() || null } };
  } catch (error) {
    logProviderIssue('BrasilAPI', { errorMessage: error instanceof Error ? error.message : String(error) });
    return { outcome: 'unavailable' };
  }
}

interface MinhaReceitaResponse {
  razao_social?: string;
  nome_fantasia?: string | null;
  municipio?: string | null;
  message?: string;
}

/** Espelho open source da Receita Federal, mesmo formato da BrasilAPI. https://minhareceita.org */
async function fetchMinhaReceita(digits: string): Promise<ProviderOutcome> {
  try {
    const response = await fetchWithTimeout(`https://minhareceita.org/${digits}`);
    if (response.status === 404) return { outcome: 'not_found' };
    if (!response.ok) {
      logProviderIssue('MinhaReceita', { status: response.status });
      return { outcome: 'unavailable' };
    }
    const data = (await response.json()) as MinhaReceitaResponse;
    if (data.message) return { outcome: 'not_found' };
    const nomeEmpresa = data.nome_fantasia?.trim() || data.razao_social?.trim();
    if (!nomeEmpresa) {
      logProviderIssue('MinhaReceita', { reason: 'resposta sem razão social/nome fantasia' });
      return { outcome: 'unavailable' };
    }
    return { outcome: 'success', data: { nomeEmpresa, cidade: data.municipio?.trim() || null } };
  } catch (error) {
    logProviderIssue('MinhaReceita', { errorMessage: error instanceof Error ? error.message : String(error) });
    return { outcome: 'unavailable' };
  }
}

interface ReceitaWsResponse {
  status?: string;
  message?: string;
  nome?: string;
  fantasia?: string | null;
  municipio?: string | null;
}

/** Pública, sem chave, limite de ~3 req/min. https://www.receitaws.com.br */
async function fetchReceitaWs(digits: string): Promise<ProviderOutcome> {
  try {
    const response = await fetchWithTimeout(`https://www.receitaws.com.br/v1/cnpj/${digits}`);
    if (!response.ok) {
      logProviderIssue('ReceitaWS', { status: response.status });
      return { outcome: 'unavailable' };
    }
    const data = (await response.json()) as ReceitaWsResponse;
    if (data.status === 'ERROR') {
      // ReceitaWS devolve 200 com status "ERROR" tanto pra CNPJ inexistente quanto
      // pra limite de requisições excedido — sem campo que distinga os dois, loga
      // a mensagem original pra investigar se virar padrão.
      logProviderIssue('ReceitaWS', { message: data.message });
      return { outcome: 'not_found' };
    }
    const nomeEmpresa = data.fantasia?.trim() || data.nome?.trim();
    if (!nomeEmpresa) {
      logProviderIssue('ReceitaWS', { reason: 'resposta sem razão social/nome fantasia' });
      return { outcome: 'unavailable' };
    }
    return { outcome: 'success', data: { nomeEmpresa, cidade: data.municipio?.trim() || null } };
  } catch (error) {
    logProviderIssue('ReceitaWS', { errorMessage: error instanceof Error ? error.message : String(error) });
    return { outcome: 'unavailable' };
  }
}

const PROVIDERS = [fetchBrasilApi, fetchMinhaReceita, fetchReceitaWs];

/**
 * Atalho opcional pra evitar digitar o nome da empresa — nunca obrigatório
 * (o Irmão pode sempre só preencher "Nome da empresa" na mão, como sempre
 * funcionou). Tenta 3 serviços públicos e gratuitos em sequência
 * (BrasilAPI → Minha Receita → ReceitaWS) — um CNPJ real recebeu
 * "serviço indisponível" da BrasilAPI sozinha em produção, então um único
 * provedor não é confiável o bastante pra esse atalho. Só devolve
 * `not_found` se pelo menos um provedor respondeu "não encontrado" de
 * verdade; se todos falharam por instabilidade, é `unavailable`.
 */
export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | CnpjLookupFailure> {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return { reason: 'invalid' };

  let sawNotFound = false;
  for (const provider of PROVIDERS) {
    const result = await provider(digits);
    if (result.outcome === 'success') return result.data;
    if (result.outcome === 'not_found') sawNotFound = true;
  }

  return { reason: sawNotFound ? 'not_found' : 'unavailable' };
}

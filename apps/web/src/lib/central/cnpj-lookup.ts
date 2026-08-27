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

interface BrasilApiCnpjResponse {
  razao_social?: string;
  nome_fantasia?: string | null;
  municipio?: string | null;
}

/**
 * Atalho opcional pra evitar digitar o nome da empresa — nunca obrigatório
 * (o Irmão pode sempre só preencher "Nome da empresa" na mão, como sempre
 * funcionou). Usa a BrasilAPI (pública, sem chave, sem custo) só pra
 * pré-preencher; o Irmão continua livre pra editar o que vier. Nunca lança
 * exceção pra não travar o formulário — o motivo do fracasso (`reason`)
 * vira mensagem específica pro chamador, e qualquer coisa fora de "CNPJ não
 * encontrado" (404) vai pro Sentry, já que um serviço externo instável ou
 * quebrado silenciosamente é o tipo de coisa que só se descobre olhando log.
 */
export async function lookupCnpj(
  cnpj: string,
): Promise<CnpjLookupResult | CnpjLookupFailure> {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return { reason: 'invalid' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CNPJ_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: controller.signal,
    });

    if (response.status === 404) {
      return { reason: 'not_found' };
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn('BrasilAPI respondeu erro na consulta de CNPJ', {
        route: 'lookupCnpj',
        status: response.status,
        body: body.slice(0, 500),
      });
      Sentry.captureMessage('BrasilAPI: status não-OK na consulta de CNPJ', {
        level: 'warning',
        tags: { route: 'lookupCnpj', status: String(response.status) },
      });
      return { reason: 'unavailable' };
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    const nomeEmpresa = data.nome_fantasia?.trim() || data.razao_social?.trim();
    if (!nomeEmpresa) {
      logger.warn('BrasilAPI respondeu 200 sem razão social/nome fantasia', {
        route: 'lookupCnpj',
      });
      return { reason: 'unavailable' };
    }

    return {
      nomeEmpresa,
      cidade: data.municipio?.trim() || null,
    };
  } catch (error) {
    logger.warn('Falha ao consultar CNPJ na BrasilAPI', {
      route: 'lookupCnpj',
      aborted: controller.signal.aborted,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    Sentry.captureException(error, { tags: { route: 'lookupCnpj' } });
    return { reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

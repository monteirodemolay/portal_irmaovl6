'use client';

import { useState } from 'react';

export interface CepAddress {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface ViaCepResponse {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

/**
 * Autopreenchimento de endereço a partir do CEP — ViaCEP (viacep.com.br),
 * serviço público brasileiro sem chave/autenticação, chamado direto do
 * navegador (CORS liberado). Só tenta a consulta com os 8 dígitos
 * completos; qualquer falha (rede, CEP inexistente) deixa os campos como
 * estão, para preenchimento manual.
 */
export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(rawCep: string): Promise<CepAddress | null> {
    const cep = rawCep.replace(/\D/g, '');
    if (cep.length !== 8) return null;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('Falha ao consultar o CEP.');
      const data = (await response.json()) as ViaCepResponse;
      if (data.erro) {
        setError('CEP não encontrado.');
        return null;
      }
      return {
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        cidade: data.localidade ?? '',
        estado: data.uf ?? '',
      };
    } catch {
      setError('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { lookup, loading, error };
}

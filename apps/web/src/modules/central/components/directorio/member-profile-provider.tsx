'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { getMemberProfileForDrawerAction } from '../../actions/central-actions';
import { MemberProfileDrawer } from './member-profile-drawer';

export interface MemberProfileContextValue {
  isOpen: boolean;
  isLoading: boolean;
  profile: PublicMemberProfileDTO | null;
  notFound: boolean;
  openMemberProfile: (memberId: string, preloaded?: PublicMemberProfileDTO) => void;
  closeMemberProfile: () => void;
}

const MemberProfileContext = createContext<MemberProfileContextValue | null>(null);

/**
 * Estado global do painel de perfil de Irmão — montado uma vez em
 * `(member)/layout.tsx`, disponível pra qualquer tela do Portal chamar
 * `openMemberProfile(memberId)` sem navegar (evita de propósito rota
 * interceptada/paralela do Next.js, que mostrou instabilidade em produção
 * nesse app). Diferente do `AgendaProvider` — que já recebe todos os
 * eventos pré-carregados —, aqui o perfil é buscado sob demanda via Server
 * Action, porque pré-carregar o Diretório inteiro em toda página do Portal
 * seria desperdício.
 */
export function MemberProfileProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<PublicMemberProfileDTO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openMemberProfile = useCallback((memberId: string, preloaded?: PublicMemberProfileDTO) => {
    setIsOpen(true);
    setNotFound(false);

    // Diretório já tem o DTO completo carregado (mesma busca monta métricas
    // e facetas) — evita round-trip e flash de loading quando o chamador já
    // tem o perfil em mãos.
    if (preloaded) {
      setProfile(preloaded);
      return;
    }

    setProfile(null);
    startTransition(async () => {
      const result = await getMemberProfileForDrawerAction(memberId);
      setProfile(result);
      setNotFound(result === null);
    });
  }, []);

  const closeMemberProfile = useCallback(() => setIsOpen(false), []);

  const value = useMemo<MemberProfileContextValue>(
    () => ({
      isOpen,
      isLoading: isPending,
      profile,
      notFound,
      openMemberProfile,
      closeMemberProfile,
    }),
    [isOpen, isPending, profile, notFound, openMemberProfile, closeMemberProfile],
  );

  return (
    <MemberProfileContext.Provider value={value}>
      {children}
      <MemberProfileDrawer />
    </MemberProfileContext.Provider>
  );
}

/** Lança se usado fora do `MemberProfileProvider` — para consumidores que sabem que o Provider está montado (dentro do Portal do Irmão). */
export function useMemberProfile(): MemberProfileContextValue {
  const ctx = useContext(MemberProfileContext);
  if (!ctx) throw new Error('useMemberProfile deve ser usado dentro de <MemberProfileProvider>.');
  return ctx;
}

/** Nunca lança — usada por componentes compartilhados que também renderizam fora do Portal (Administração), onde o Provider não existe. */
export function useMemberProfileOptional(): MemberProfileContextValue | null {
  return useContext(MemberProfileContext);
}

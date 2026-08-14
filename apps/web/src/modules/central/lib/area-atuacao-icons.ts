import type { ComponentType } from 'react';
import type { AreaAtuacaoKey } from '@vl6/shared';
import {
  Briefcase,
  Building2,
  Calculator,
  Compass,
  Factory,
  GraduationCap,
  HardHat,
  Landmark,
  Laptop,
  Megaphone,
  Palette,
  Scale,
  ShoppingBag,
  Stethoscope,
  Tractor,
} from '@vl6/ui';

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export const AREA_ATUACAO_ICONS: Record<AreaAtuacaoKey, IconType> = {
  direito: Scale,
  engenharia: HardHat,
  saude: Stethoscope,
  educacao: GraduationCap,
  administracao: Briefcase,
  tecnologia: Laptop,
  agronegocio: Tractor,
  comercio: ShoppingBag,
  financas: Calculator,
  comunicacao: Megaphone,
  construcao_civil: Building2,
  servico_publico: Landmark,
  industria: Factory,
  artes_cultura: Palette,
  outra: Compass,
};

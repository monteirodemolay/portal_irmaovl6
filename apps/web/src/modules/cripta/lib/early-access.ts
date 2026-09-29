/** Convite temporário para o ensaio. Nunca serve como controle de acesso isolado. */
export const CRIPTA_EARLY_ACCESS_EMAIL = 'monteirodemolay@gmail.com';

export function canAccessCriptaPilot(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === CRIPTA_EARLY_ACCESS_EMAIL;
}

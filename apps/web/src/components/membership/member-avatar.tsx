import { Avatar, AvatarFallback, AvatarImage, cn, Compass } from '@vl6/ui';

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Avatar do Irmão com fallback em cascata (docs/architecture/06 — Foto do
 * Irmão): foto cadastrada → iniciais do nome → ícone institucional. Nunca
 * uma imagem aleatória.
 */
export function MemberAvatar({
  fotoUrl,
  nome,
  className,
}: {
  fotoUrl: string | null;
  nome: string;
  className?: string;
}) {
  const initials = getInitials(nome);
  return (
    <Avatar className={cn('h-10 w-10', className)}>
      {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
      <AvatarFallback>{initials || <Compass size={16} strokeWidth={1.75} />}</AvatarFallback>
    </Avatar>
  );
}

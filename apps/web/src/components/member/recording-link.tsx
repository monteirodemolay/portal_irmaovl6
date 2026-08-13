import { cn } from '@vl6/ui';

/**
 * Link para visualizar/baixar um `FileAsset` através do proxy autenticado
 * (`/api/files/[fileId]`, ver route handler) — a contagem de
 * visualização/download acontece no servidor, atomicamente com o serving do
 * arquivo, então este componente não precisa mais disparar nenhuma Server
 * Action no clique (versão anterior registrava via `onRecord` em paralelo à
 * navegação, desconectado do sucesso real do download).
 */
export function RecordingLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn('text-primary hover:underline', className)}
    >
      {label}
    </a>
  );
}

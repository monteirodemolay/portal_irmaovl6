import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@vl6/ui';

export interface FormSectionCardProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Card com cabeçalho ícone+título+descrição — unidade visual repetida em
 * todos os formulários de "Meu Cadastro" e "Central VL6"
 * (docs/architecture/05-componentes.md §5.5). Não usar para agrupamentos
 * que não sejam seções de formulário.
 */
export function FormSectionCard({
  icon: Icon,
  title,
  description,
  children,
  className,
  contentClassName,
}: FormSectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-0.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className={cn('flex flex-col gap-4', contentClassName)}>{children}</CardContent>
    </Card>
  );
}

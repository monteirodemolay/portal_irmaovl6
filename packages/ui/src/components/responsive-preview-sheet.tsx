import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '../icons';
import { cn } from '../lib/cn';

/**
 * Painel de leitura sobreposto — no celular sobe como um drawer preso à
 * base da tela (padrão mobile), no computador (`sm:` e acima) vira um
 * modal centralizado. Mesma raiz Radix nos dois casos (foco preso, Esc,
 * clique fora, `aria-modal`), só troca o posicionamento/animação via
 * classe responsiva — evita duplicar o componente pra cada breakpoint.
 * Primeiro consumidor: "Ler texto completo" em Termos e Privacidade.
 */
export const ResponsivePreviewSheet = DialogPrimitive.Root;
export const ResponsivePreviewSheetTrigger = DialogPrimitive.Trigger;
export const ResponsivePreviewSheetClose = DialogPrimitive.Close;

export const ResponsivePreviewSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-200',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:duration-150',
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] w-full flex-col',
        'border-border bg-surface rounded-t-2xl border-t shadow-md',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=open]:duration-300',
        'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-200',
        'sm:inset-x-auto sm:inset-y-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl',
        'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:border-t-0',
        'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95',
        'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="text-muted hover:text-foreground absolute right-4 top-4">
        <X size={18} />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
ResponsivePreviewSheetContent.displayName = 'ResponsivePreviewSheetContent';

export const ResponsivePreviewSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('border-border flex flex-col gap-1 border-b p-5 sm:p-6', className)}
    {...props}
  />
);

export const ResponsivePreviewSheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto p-5 sm:p-6', className)} {...props} />
);

export const ResponsivePreviewSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-lg font-semibold', className)}
    {...props}
  />
));
ResponsivePreviewSheetTitle.displayName = 'ResponsivePreviewSheetTitle';

export const ResponsivePreviewSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted text-xs', className)}
    {...props}
  />
));
ResponsivePreviewSheetDescription.displayName = 'ResponsivePreviewSheetDescription';

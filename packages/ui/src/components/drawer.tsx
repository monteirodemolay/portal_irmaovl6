import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '../icons';
import { cn } from '../lib/cn';

/**
 * Painel lateral deslizante — mesma base do `Dialog` (Radix já cobre foco
 * preso, Esc, clique fora, `aria-modal`), só troca o posicionamento e a
 * animação de entrada (`DialogContent` é fixo centralizado, pequeno demais
 * pra um formulário longo). Primeiro consumidor: edição de Irmão a partir
 * da listagem (`/admin/pessoas/irmaos`), sem sair da lista.
 */
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

export const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:duration-200',
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col',
        'border-border bg-surface border-l shadow-md',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300',
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
DrawerContent.displayName = 'DrawerContent';

export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('border-border flex flex-col gap-1 border-b p-6', className)} {...props} />
);

export const DrawerBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto p-6', className)} {...props} />
);

export const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-lg font-semibold', className)}
    {...props}
  />
));
DrawerTitle.displayName = 'DrawerTitle';

export const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted text-sm', className)}
    {...props}
  />
));
DrawerDescription.displayName = 'DrawerDescription';

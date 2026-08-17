'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Camera } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { updateMyPhotoAction } from '@/modules/membership/actions/self-profile-actions';
import type { ProfileFieldActionState } from '@/modules/membership/components/profile-fields/action-state';

/**
 * Avatar clicável do cabeçalho do "Meu Espaço" — o próprio Irmão troca a
 * foto sem sair da tela: seleciona o arquivo e o formulário se
 * autoenvia (`requestSubmit`), sem precisar de um botão "Salvar" à parte
 * só pra esse campo único.
 */
export function SelfPhotoUpload({
  fotoUrl,
  nome,
  className,
}: {
  fotoUrl: string | null;
  nome: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<ProfileFieldActionState, FormData>(
    updateMyPhotoAction,
    { error: null },
  );
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={formAction} className="relative">
      <label
        htmlFor="meu-espaco-foto"
        className="group relative block cursor-pointer"
        title="Alterar foto"
      >
        <MemberAvatar fotoUrl={preview ?? fotoUrl} nome={nome} className={className} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-white transition-colors group-hover:bg-black/40">
          <Camera size={18} strokeWidth={1.75} className="opacity-0 group-hover:opacity-100" />
        </span>
        <UploadingOverlay />
      </label>
      <input
        id="meu-espaco-foto"
        name="foto"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setPreview(file ? URL.createObjectURL(file) : null);
          if (file) event.currentTarget.form?.requestSubmit();
        }}
      />
      {state.error && (
        <p className="absolute left-0 top-full z-10 mt-1 w-40 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}

function UploadingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-medium text-white">
      Enviando…
    </span>
  );
}

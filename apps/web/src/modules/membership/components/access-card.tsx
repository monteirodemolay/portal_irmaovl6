'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Role, User } from '@vl6/domain';
import { Badge, Button, Select } from '@vl6/ui';
import { assignRoleAction } from '@/modules/identity-access/actions/user-actions';
import { ResetPasswordButton } from '@/modules/identity-access/components/reset-password-button';
import { ToggleUserStatusButton } from '@/modules/identity-access/components/toggle-user-status-button';
import {
  USER_STATUS_LABEL,
  USER_STATUS_VARIANT,
} from '@/modules/identity-access/user-status-labels';
import { activateMemberAccessAction, type MemberActionState } from '../actions/member-actions';

const INITIAL_STATE: MemberActionState = { error: null, memberId: null, temporaryPassword: null };

/**
 * Seção "Acesso ao Portal" da tela do Irmão — precisa ser componente cliente
 * porque a ativação de acesso muda `accessUser` de nulo para preenchido, o
 * que faz o Server Component pai revalidar e re-renderizar com um novo
 * `accessUser` na mesma hora em que a Server Action retorna. Sem o estado
 * local `activateState.temporaryPassword` tendo prioridade sobre o prop
 * `accessUser`, a troca de branch apagaria a senha temporária da tela antes
 * do Administrador conseguir copiá-la.
 */
export function AccessCard({
  memberId,
  roles,
  accessUser,
  isSelf,
}: {
  memberId: string;
  roles: Role[];
  accessUser: User | null;
  isSelf: boolean;
}) {
  const activateAction = activateMemberAccessAction.bind(null, memberId);
  const [activateState, activateFormAction] = useActionState<MemberActionState, FormData>(
    activateAction,
    INITIAL_STATE,
  );

  if (activateState.temporaryPassword) {
    return (
      <div className="border-accent/40 bg-accent/10 flex flex-col gap-2 rounded border p-3 text-sm">
        <p>Acesso criado. Usuário: e-mail do Irmão. Senha temporária — copie agora:</p>
        <p className="break-all rounded border bg-white/60 p-2 font-mono text-xs">
          {activateState.temporaryPassword}
        </p>
      </div>
    );
  }

  if (accessUser) {
    const boundAssignRole = assignRoleAction.bind(null, accessUser.id);
    const accessRole = roles.find((r) => r.id === accessUser.roleId);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={USER_STATUS_VARIANT[accessUser.statusConta]}>
            {USER_STATUS_LABEL[accessUser.statusConta]}
          </Badge>
          <span className="text-muted text-xs">{accessUser.email}</span>
        </div>
        <form action={boundAssignRole} className="flex items-end gap-2">
          <Select name="roleId" defaultValue={accessUser.roleId} className="h-8 flex-1 text-xs">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nome}
              </option>
            ))}
          </Select>
          <button type="submit" className="text-primary shrink-0 text-xs underline">
            salvar papel
          </button>
        </form>
        {accessRole && <p className="text-muted text-xs">Papel atual: {accessRole.nome}</p>}
        <div className="flex items-center gap-1">
          <ResetPasswordButton userId={accessUser.id} email={accessUser.email} />
          {!isSelf && (
            <ToggleUserStatusButton userId={accessUser.id} statusConta={accessUser.statusConta} />
          )}
        </div>
      </div>
    );
  }

  const defaultRoleId = roles.find((r) => r.chave === 'membro')?.id ?? roles[0]?.id;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted text-sm">
        Este Irmão está cadastrado, mas ainda não tem acesso ao Portal.
      </p>
      <form action={activateFormAction} className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <Select name="roleId" defaultValue={defaultRoleId} className="h-8 flex-1 text-xs">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.nome}
              </option>
            ))}
          </Select>
          <SubmitButton />
        </div>
        {activateState.error && <p className="text-sm text-red-600">{activateState.error}</p>}
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? 'Ativando…' : 'Ativar acesso'}
    </Button>
  );
}

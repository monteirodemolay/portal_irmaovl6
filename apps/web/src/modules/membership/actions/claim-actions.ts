'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import type { User } from '@vl6/domain';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getClientIp } from '@/lib/api/get-client-ip';
import { RateLimiter } from '@/lib/api/rate-limiter';

export interface ClaimActionState {
  error: string | null;
}

const EMPTY_STATE: ClaimActionState = { error: null };

const claimRateLimiter = new RateLimiter();

/**
 * Cria a conta de acesso do próprio Irmão a partir do fluxo público
 * "Reivindicar meu cadastro" — sem sessão, então nada aqui passa por
 * `requireSession`/`AuthContext`. A prova de identidade é o Nome+CIM
 * checados por `ClaimMemberAccountUseCase`; o papel concedido é sempre o
 * de chave `'membro'` do tenant (nunca escolhido pelo próprio Irmão, ao
 * contrário do fluxo administrativo em `member-actions.ts`). Libera o
 * acesso na hora — de propósito, sem fila de aprovação do Administrador:
 * o passo extra (esperar aprovação + abrir um link externo do Firebase
 * pra só então definir senha) era a principal dificuldade relatada pelos
 * Irmãos mais velhos. Rate limit por IP continua — sem ele, o par
 * Nome+CIM (~5 dígitos) seria alvo fácil de tentativa por tentativa.
 */
export async function claimMemberAccountAction(
  _prevState: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const current = await getCurrentTenant();
  if (!current) {
    return {
      ...EMPTY_STATE,
      error:
        'Não foi possível identificar sua Loja. Acesse pelo endereço do Portal enviado pela Secretaria.',
    };
  }

  const headerList = await headers();
  const ip = getClientIp({ headers: headerList });
  const limit = claimRateLimiter.check(`claim:${ip}`, { limit: 5, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return {
      ...EMPTY_STATE,
      error: 'Muitas tentativas. Aguarde um minuto antes de tentar de novo.',
    };
  }

  const memberId = String(formData.get('memberId') ?? '').trim();
  const cim = String(formData.get('cim') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');
  const aceitePolitica = formData.get('aceitePolitica') === 'on';
  const aceiteTermos = formData.get('aceiteTermos') === 'on';

  if (!memberId || !cim) {
    return { ...EMPTY_STATE, error: 'Escolha seu nome e informe a CIM.' };
  }
  if (!email.includes('@')) {
    return { ...EMPTY_STATE, error: 'Informe um e-mail válido.' };
  }
  if (senha.length < 6) {
    return { ...EMPTY_STATE, error: 'A senha precisa ter pelo menos 6 letras ou números.' };
  }

  const container = createServerContainer();

  // Aceite obrigatório (Termos de Uso, Seção 2): não é possível criar a
  // conta sem aceitar a versão VIGENTE de cada documento — a versão vem
  // sempre da leitura do servidor, nunca de um valor enviado pelo formulário,
  // pra não permitir que alguém "aceite" uma versão diferente da que está
  // publicada agora.
  const [politicaPrivacidade, termosUso] = await Promise.all([
    container.repositories.legalDocumentVersion.findCurrent(
      current.tenant.id,
      'politica_privacidade',
    ),
    container.repositories.legalDocumentVersion.findCurrent(current.tenant.id, 'termos_uso'),
  ]);
  if (!politicaPrivacidade || !termosUso) {
    return {
      ...EMPTY_STATE,
      error:
        'Os Termos de Uso e a Política de Privacidade ainda não foram publicados nesta Loja. Fale com a Secretaria.',
    };
  }
  if (!aceitePolitica || !aceiteTermos) {
    return {
      ...EMPTY_STATE,
      error: 'É necessário aceitar a Política de Privacidade e os Termos de Uso para continuar.',
    };
  }
  const claimResult = await container.useCases.claimMemberAccount.execute(
    current.tenant.id,
    memberId,
    cim,
    email,
  );
  if (!claimResult.ok) {
    return { ...EMPTY_STATE, error: claimResult.error.message };
  }
  const member = claimResult.value;

  const role = await container.repositories.role.findByKey(current.tenant.id, 'membro');
  if (!role) {
    return {
      ...EMPTY_STATE,
      error: 'Papel de acesso padrão não encontrado. Fale com a Secretaria.',
    };
  }

  const authUser = await getAdminAuth()
    .createUser({ email, password: senha })
    .catch((error: unknown) =>
      error instanceof Error ? error.message : 'Falha ao criar a conta.',
    );
  if (typeof authUser === 'string') {
    return { ...EMPTY_STATE, error: authUser };
  }

  const now = new Date();
  const user: User = {
    id: authUser.uid,
    tenantId: current.tenant.id,
    email,
    memberId: member.id,
    roleId: role.id,
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: authUser.uid,
    updatedBy: authUser.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
  await container.repositories.user.create(user);
  await syncUserClaims(user, role);

  await container.repositories.member.update({
    ...member,
    userId: authUser.uid,
    updatedAt: now,
    updatedBy: authUser.uid,
  });

  // Aceite registrado ANTES de qualquer sessão existir (mesmo motivo de
  // `RecordLegalAcceptanceUseCase` não usar `AuthContext`) — o `userId` já
  // existe (acabou de ser criado no Firebase Auth), então usamos ele
  // diretamente. IP/dispositivo do próprio navegador que enviou o formulário.
  const userAgent = headerList.get('user-agent');
  await Promise.all([
    container.useCases.recordLegalAcceptance.execute({
      tenantId: current.tenant.id,
      userId: authUser.uid,
      documento: 'politica_privacidade',
      versao: politicaPrivacidade.versao,
      ip,
      userAgent,
    }),
    container.useCases.recordLegalAcceptance.execute({
      tenantId: current.tenant.id,
      userId: authUser.uid,
      documento: 'termos_uso',
      versao: termosUso.versao,
      ip,
      userAgent,
    }),
  ]);

  redirect('/login?reivindicado=1');
}

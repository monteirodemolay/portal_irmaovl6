/** Senha inicial aleatória — mostrada uma única vez pra quem cria a conta repassar com segurança. */
export function generateTemporaryPassword(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

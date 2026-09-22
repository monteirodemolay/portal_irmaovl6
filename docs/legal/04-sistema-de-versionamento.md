# Sistema de Versionamento — Termos de Uso e Política de Privacidade

> Especificação técnica de como a Política de Privacidade (`02-politica-privacidade.md`) e os Termos de Uso (`03-termos-de-uso.md`) permanecem sincronizados com o comportamento real do Portal, com histórico permanente, aceite auditável e notificação de mudanças. Complementa o mock-up funcional já validado (área "Termos e Privacidade" do perfil).
>
> Este documento segue o padrão de modelagem já usado no Portal para dados que exigem trilha imutável (`auditLogs`, `publicationConsents` — ver `docs/legal/01-inventario-dados-lgpd.md` §3.8), evitando reinventar um segundo padrão de auditoria.

## 1. Numeração de versão

Semântica `MAJOR.MINOR.PATCH`, aplicada independentemente a cada documento (Política e Termos têm numeração própria):

- **MAJOR** — mudança jurídica ou de tratamento de dados que exige novo aceite dos usuários (ex.: nova finalidade, novo compartilhamento com terceiro).
- **MINOR** — nova funcionalidade do Portal que passa a ser coberta pelo documento, sem mudar direitos/obrigações existentes (ex.: lançamento de um módulo novo).
- **PATCH** — correção de redação, ajuste de clareza, correção de erro material, sem mudança de sentido.

Cada versão carrega uma classificação obrigatória (mesmo enum sugerido no pedido original): `correcao | adequacao | nova_funcionalidade | mudanca_juridica | mudanca_operacional | mudanca_seguranca | mudanca_lgpd | mudanca_institucional`.

## 2. Modelo de dados proposto

Duas coleções novas no Firestore, seguindo o padrão já usado por `auditLogs`/`publicationConsents` (append-only, sem update/delete):

```
legalDocumentVersions/{id}
  tenantId
  documento: 'politica_privacidade' | 'termos_uso'
  versao: string            // "1.2.0"
  dataPublicacao: timestamp
  autor: string             // uid de quem publicou
  responsavel: string       // nome/cargo institucional
  classificacao: enum       // ver seção 1
  motivo: string
  impacto: 'baixo' | 'medio' | 'alto'
  itensAlterados: string[]
  exigeNovoAceite: boolean
  conteudoMarkdown: string  // snapshot completo do texto publicado
  diffResumo: string        // resumo gerado para o banner/notificação
  status: 'rascunho' | 'em_aprovacao' | 'publicado'
```

```
legalDocumentAcceptances/{id}
  tenantId
  userId
  documento: 'politica_privacidade' | 'termos_uso'
  versaoAceita: string
  aceitoEm: timestamp
  ip: string
  userAgent: string
  dispositivo: string
  hashVersao: string   // hash do conteúdo da versão aceita, para prova de integridade
```

Ambas as coleções: `allow write: if false` nas Firestore Rules (escrita só via Admin SDK/Server Action), `allow read` restrito ao próprio usuário (para `legalDocumentAcceptances`) ou a quem tiver `legalDocument:read`/`legalDocument:manage`. Nunca há `update`/`delete` — cada mudança é um novo documento, exatamente como já ocorre em `publicationConsents`.

**Observação de reaproveitamento:** a coleção `legalDocumentAcceptances` é estruturalmente idêntica ao padrão já validado em `publicationConsents` (`packages/domain/src/modules/central/entities/publication-consent.entity.ts` — ver auditoria §3.3). Recomenda-se implementar seguindo o mesmo `use case`/repositório, só trocando o domínio.

## 3. Fluxo de aceite no cadastro

1. No cadastro (autorreivindicação ou convite), a tela final exige dois checkboxes independentes: "Li e concordo com os Termos de Uso" e "Li e estou ciente da Política de Privacidade", cada um linkando para a versão vigente.
2. A conta só é criada após ambos marcados — a Server Action de criação de usuário passa a exigir, como pré-condição, um registro em `legalDocumentAcceptances` para as duas versões vigentes no momento (mesma transação/lote da criação da conta).
3. O registro grava IP e User-Agent capturados na própria requisição (o mesmo padrão de captura de IP já usado no rate limiter de login, `apps/web/src/lib/api/get-client-ip.ts`).

## 4. Fluxo de alteração dos documentos

Sempre que uma versão é publicada:

1. Nunca sobrescreve a anterior — cria um novo documento em `legalDocumentVersions` com `status: 'publicado'` e mantém os anteriores intactos.
2. Se `exigeNovoAceite: true`, todo usuário cuja `legalDocumentAcceptances` mais recente aponte para uma versão anterior passa a ser sinalizado como pendente (calculado em tempo de leitura, comparando a versão aceita com a versão vigente — sem necessidade de tabela de "pendências" separada).
3. Dispara notificação interna (reaproveitando a coleção `notifications` já existente — `tipo: 'legal_update'`) para os usuários pendentes.
4. Um banner aparece após o login (já prototipado no mock-up) até que o usuário revise e aceite a nova versão.

## 5. Manutenção contínua (detecção de impacto)

Processo institucional (não totalmente automatizável hoje, dado que não há Cloud Functions/triggers em produção — ver auditoria §2):

1. Ao planejar uma funcionalidade nova ou uma mudança relevante no tratamento de dados, quem a especifica preenche um checklist de impacto em LGPD (seções afetadas da Política/Termos, novo dado coletado, novo compartilhamento).
2. Esse checklist gera um rascunho de nova versão (`status: 'rascunho'`) na coleção `legalDocumentVersions`, com o `diffResumo` preenchido manualmente ou semi-assistido.
3. Um administrador com `legalDocument:manage` revisa e move o rascunho para `em_aprovacao` e depois `publicado`.
4. A publicação dispara o fluxo da Seção 4.

**Nota de escopo:** como o Portal não roda Cloud Functions (plano Firebase Spark), a "detecção automática" de impacto mencionada no pedido original deve ser implementada como uma rotina de cron (mesmo padrão dos jobs existentes em `apps/web/src/app/api/cron/*`) que compara o schema de dados entre deploys, ou como parte do processo de revisão de código (checklist em PR), não como um trigger reativo em tempo real.

## 6. Área "Termos e Privacidade" (perfil do Irmão)

Já especificada e prototipada no mock-up funcional (artifact publicado na conversa). Consome diretamente as duas coleções acima:

- Política e Termos vigentes → última versão com `status: 'publicado'` de cada documento.
- Histórico completo → listagem de `legalDocumentVersions` por documento, ordenada por versão.
- Meu aceite → última `legalDocumentAcceptances` do usuário logado, por documento.
- Comparação entre versões → diff entre dois `conteudoMarkdown` (pode usar uma lib de diff de texto no servidor; o mock-up usa diffs pré-computados apenas para demonstração).
- Central de solicitações → formulário que cria uma solicitação (nova coleção `privacyRequests`, com o mesmo padrão de auditoria) encaminhada à Secretaria, já que hoje não há atendimento automatizado de exportação/eliminação (ver auditoria §8, item 8).

## 7. Pendências técnicas para implementação real

- Criar as coleções `legalDocumentVersions`, `legalDocumentAcceptances` e `privacyRequests`, com regras de Firestore análogas às de `publicationConsents`.
- Popular `legalDocumentVersions` com a versão 1.0.0 dos dois documentos no momento da publicação oficial.
- Adaptar a Server Action de criação de conta para exigir o aceite antes de finalizar o cadastro.
- Implementar a UI da área "Termos e Privacidade" a partir do mock-up já validado.
- Definir quem recebe a permissão `legalDocument:manage` (sugestão: mesmo grupo que hoje tem `auditLog:read`/`tenant:manage`).

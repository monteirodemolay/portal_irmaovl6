# 12. Comunidade Paramaçônica

## 12.1 Objetivo

A Comunidade Paramaçônica oferece acesso autenticado e gradual a pessoas
previamente autorizadas pela Loja, sem transformar familiares em `Member` e
sem duplicar Diretório, Agenda, Acervo ou registros de Família e Legado.

## 12.2 Identidade e vínculo

- `User` continua sendo a conta de autenticação.
- `Member` continua sendo exclusivamente o cadastro institucional de Irmão.
- O vínculo DeMolay, Filhas de Jó, Estrela do Oriente, Arco-Íris,
  Fraternidade Feminina, Lowton ou outra entidade continua em
  `PersonFraternalRecord`.
- Cargo em entidade paramaçônica não concede acesso. A autorização decorre do
  papel RBAC atribuído à conta.

## 12.3 Papel de acesso

O papel sistêmico `paramaconica` nasce com menor privilégio:

- `tenant:read`;
- `event:read`;
- `news:read`;
- `announcement:read`;
- `paramasonicCommunity:read`.

Ele não recebe `memberDirectory:read`, `familyLegacy:read`, `honor:read`,
`archiveItem:read` ou permissões administrativas. A Administração pode criar
papéis customizados quando uma entidade ou pessoa precisar de outro recorte.

## 12.4 Diretório seguro dos Irmãos

O caso de uso `ListParamasonicMemberDirectoryUseCase` não reaproveita o DTO
interno do Diretório dos Irmãos. Ele produz um recorte próprio e permite:

- nome e foto institucional;
- cargo da gestão vigente;
- apresentação, profissão, área de atuação e cidade somente quando o próprio
  Irmão publicou o bloco correspondente na Central VL6.

Ele nunca entrega grau, situação cadastral, datas maçônicas, contatos,
endereço, família, honrarias, Acervo ou histórico maçônico. Apenas Irmãos
ativos e não excluídos integram o resultado.

## 12.5 Administração

Em **Administração → Pessoas & Loja → Permissões**, o comando **Criar ou
atualizar acesso paramaçônico** provisiona ou sincroniza o papel no tenant
existente. Depois disso, a conta pode ser convidada em **Usuários** com
`memberId = null` e receber esse papel.

Novos tenants já recebem o papel durante o provisionamento.

## 12.6 Evolução prevista

Agenda, avisos, formulários, documentos e áreas específicas por entidade
devem continuar usando os mesmos registros canônicos e ganhar permissões
próprias quando necessário. Nenhuma evolução pode ampliar o acesso apenas por
ocultação visual: a autorização deve existir no caso de uso e no servidor.

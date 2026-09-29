# Instruções para o Claude

- Responda ao usuário em português (pt-BR) nesta conversa/repositório, mesmo que o texto deste arquivo esteja em inglês em partes do código-fonte, comentários, commits e documentação (que já seguem português como convenção do projeto — ver `docs/architecture/`).

## Sincronização obrigatória com Termos de Uso e Política de Privacidade

Sempre que uma alteração de código (nova funcionalidade, novo campo de dado pessoal, novo compartilhamento com terceiro, mudança de retenção/exclusão, nova integração externa, mudança de permissão/RBAC que afete quem vê/edita/exclui dado pessoal) impactar o que está descrito em `docs/legal/`, a atualização dos documentos jurídicos **faz parte da própria tarefa**, não é um item separado a perguntar depois:

1. Antes de finalizar a tarefa, verifique se ela muda algo já descrito em `docs/legal/01-inventario-dados-lgpd.md`, `02-politica-privacidade.md` ou `03-termos-de-uso.md` (novo dado coletado, nova finalidade, novo terceiro que recebe dado, mudança de prazo de retenção, mudança de quem acessa um dado pessoal).
2. Se impactar, **edite os três arquivos relevantes na mesma tarefa/commit**: adicione o achado ao inventário, ajuste o texto da Política/Termos e registre a mudança em `04-sistema-de-versionamento.md` como uma nova entrada de versão (número, data, classificação, motivo, itens alterados — mesmo que a implementação real do sistema de aceite em `apps/web` ainda não exista; registre no próprio markdown por enquanto).
3. Se a mudança propagar para o sistema de aceite quando ele existir (`legalDocumentVersions`/`legalDocumentAcceptances`), sinalize explicitamente ao usuário se ela deveria exigir novo aceite dos usuários (mudança jurídica/LGPD relevante) ou é só ajuste informativo.
4. Nunca reporte uma tarefa de código como concluída sem mencionar, na mesma resposta, se `docs/legal/` foi ou precisava ser atualizado — e se não precisava, diga por quê, não deixe implícito.

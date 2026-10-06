# Marcos de Revisão Jurídica — Portal do Irmão VL6

Este arquivo define os pontos de corte usados para manter a Política de Privacidade e os Termos de Uso sincronizados com o funcionamento real do Portal.

## Regra

Uma revisão jurídica nunca parte apenas de uma data ou de memória operacional. Ela parte de um **commit-base** e termina em um **commit de Production**. Alterações em branches, previews ou PRs não publicados não entram no marco atual.

Cada ciclo registra:

- marco jurídico anterior;
- Production efetivamente revisada;
- intervalo de commits;
- módulos afetados;
- conclusão sobre necessidade de atualização;
- versões preparadas/publicadas;
- exigência ou não de novo aceite.

## Histórico

| Marco | Data | Referência | Resultado |
| --- | --- | --- | --- |
| Marco Inicial | 23/09/2026 | v1.0.0 dos dois documentos | Primeira base jurídica publicada. Deve ser exibida no Portal como **Marco Inicial**, não como “Mudança institucional”. |
| Revisão documental intermediária | 29/09/2026 | `24d09676532a91f82ef1a81801b58d9ce57be116` | Última auditoria jurídica/documental antes do ciclo atual; comentários em Notícias formalizados. |
| Marco de revisão v2 | 30/09/2026 | base `24d0967` → Production `1c699dd7` | 25 commits analisados. Cripta Digital exige Política e Termos v2.0.0 com novo aceite. |

## Marco atual preparado

- **Marco jurídico anterior:** `24d09676532a91f82ef1a81801b58d9ce57be116`
- **Production revisada:** `1c699dd7f19cf04c80e85ea64f2214977cd742ab`
- **Data da revisão:** 30/09/2026
- **Política preparada:** v2.0.0 — Mudança de LGPD — impacto alto — novo aceite
- **Termos preparados:** v2.0.0 — Nova funcionalidade relevante — impacto alto — novo aceite
- **Alteração material determinante:** Cripta Digital VL6
- **PR #201:** fora deste marco enquanto não entrar em Production.

## Próxima revisão

Depois que a v2.0.0 e as alterações técnicas associadas estiverem em Production, registrar aqui o SHA definitivo desse deploy como novo marco-base. A próxima auditoria deverá comparar apenas as mudanças posteriores a esse SHA.

O painel administrativo de Termos e Privacidade é o canal oficial de publicação. Revisões preparadas pelo sistema devem chegar ao formulário já com texto, versão, classificação, impacto, motivo, itens alterados, resumo e indicação de novo aceite preenchidos; a Administração apenas revisa e publica.

## Revisão em preparação — Conhecimento VL6 (06/10/2026)

Base técnica consultada: `6ac147850000845d529514f7ec4115c210bab948`. Novo módulo aditivo, sem mudança do Acervo/Biblioteca. Complementos jurídicos preparados em 2.4.0 com novo aceite recomendado por finalidade de formação e coleta de respostas/progresso. Este registro não é um marco de Production; aguarda publicação e SHA confirmado.

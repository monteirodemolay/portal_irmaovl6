# Conferência individual dos pen drives da chave

Na Administração da Cripta (`/admin/cripta`), use **Conferir pen drive de um Guardião**.
Conecte a unidade e selecione o arquivo JSON diretamente nela. A rotina lê uma só
parte no navegador: não envia o arquivo, não reúne partes, não reconstrói a chave
privada, não abre cartas e não muda o status institucional do Guardião.

Resultados:

- **Integridade confirmada**: os bytes da parte, índice, quórum e chave pública
  correspondem à impressão SHA-256 registrada na geração.
- **Incompatível/alterado**: arquivo inválido, truncado, parte alterada, quórum
  divergente ou chave pública diferente da Cripta atual.
- **Sem referência de origem**: arquivo legível e compatível, mas a parte antiga
  não possui impressão registrada. Isso NÃO confirma integridade do segredo.
  Use o procedimento de recuperação com o quórum para uma conferência completa.

Novas inaugurações (formulário e Projetor) registram apenas as impressões digitais.
Novas renovações geradas pela ferramenta offline também as incluem no relatório
público importado. Relatórios antigos continuam aceitos, sem confirmação individual;
a renovação nunca conserva impressões da chave anterior. Não há cadastro de hash
feito a partir do arquivo trazido para conferência: isso legitimaria um arquivo
possivelmente já danificado.

A consulta exige `tenant:manage`, usa a Loja da sessão e não permite upload. Uma
parte marcada comprometida continua assim mesmo se sua impressão conferir. O nome
exibido vem do cadastro atual, não do texto livre do arquivo.

A impressão cobre o material criptográfico, não alterações de formatação, nome
exibido ou ata no JSON. O resultado se refere à leitura feita naquele momento:
não verifica setores defeituosos, vida útil, autenticidade física da unidade nem
conservação futura do pen drive. Não existe diagnóstico físico de USB nesta rotina.

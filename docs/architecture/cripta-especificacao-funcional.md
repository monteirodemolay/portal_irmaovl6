# Cripta do Irmão VL6 — especificação funcional e prompt de implementação

**Estado:** especificação de destino, registrada em 26/09/2026. Este documento não declara que as funções descritas já foram implantadas. Sua execução requer validação no ambiente real, inicialmente restrita à conta piloto.

## Diagnóstico confirmado no código atual

- Há duas páginas principais, `/cripta` e `/cripta-administracao`, com autenticação e envio de cartas pequenas ao Wix.
- O rascunho pessoal atual vive apenas na memória da aba; fechá-la apaga o texto e as referências locais ainda não enviadas.
- O envio atual limita os anexos somados a 650 KB, apesar de a interface citar fotos, áudios e vídeo. Não representa o limite desejado para uso real.
- A interface afirma que se faz uma carta, enquanto a API permite cinco cartas concluídas. A regra de produto ainda precisa ser unificada.
- Novas cartas usam cifra do servidor e chave vinculada à conta armazenada no Firestore. Uma cópia dos objetos Wix, sozinha, não garante restauração se essa chave ou o inventário se perderem. Cartas legadas podem exigir a frase original.
- Não há rascunho persistente, importação Word, exportação integral verificável para duas unidades, restauração anual nem pacote HTML offline para entrega familiar.

## Prompt corrigido

Implemente a Cripta do Irmão no repositório `monteirodemolay/portal_irmaovl6` como funcionalidade real do Portal VL6. Antes de editar, examine rotas, autenticação, autorização, cadastro de irmãos Ativos, integração Wix, dados Firestore, documentos de arquitetura e cartas legadas. Preserve os dados existentes. Entregue código, eventuais migrações, manual de operação e evidências de testes de ponta a ponta. Se uma etapa ainda não passar nos testes, mostre-a como pendente em vez de anunciá-la como concluída.

### 1. Produto, navegação e visual

Há um menu isolado **Cripta**, com apenas duas áreas: **Minha Cripta** e **Administração da Cripta**. Escrever, anexar e revisar são etapas da área pessoal, não páginas técnicas distintas. Inicialmente, manter o acesso da conta piloto já autorizada; preparar a futura liberação somente a irmãos autenticados com situação Ativo.

A interface é mobile first e legível para pessoas mais velhas. Um hero com imagem apropriada, azul profundo, marfim e dourado discreto apresenta o propósito. Usar logotipos reais VL6 e referências fornecidas; a arte da gestão 2026/2027 e o banner “Palavra do Venerável” não viram marca permanente da Cripta. O pergaminho aparece na prévia e na entrega da carta, com contraste e fonte legíveis. A tela inicial tem uma ação dominante conforme o estado: **Escrever minha carta**, **Continuar minha carta** ou **Abrir minha carta**. Usar botões grandes, rótulos sempre visíveis, mensagens locais e ajuda “?” breve para destinatários, rascunho, anexos, conclusão e guarda. Não expor jargão de infraestrutura ao irmão.

### 2. Unidade de conteúdo e experiência do irmão

Cada carta é um pacote lógico que inclui destinatários indicados, texto e anexos opcionais. Destacar uma carta principal por irmão; “Nova carta” é ação secundária e explícita. Definir uma cota única e configurável para cartas adicionais, validada no servidor e idêntica ao texto da interface. Não presumir que cinco é a regra final por estar codificado hoje.

Solicitar primeiro **Para quem é esta carta?** e **Sua mensagem**. O título é opcional. O irmão pode escrever poucas linhas, voltar depois e continuar no celular ou computador. Autosalvar em armazenamento persistente durante a janela, com controle de versão e estados **Salvando**, **Salvo às...** e **Falha ao salvar**. A interface só diz “Salvo” após confirmação do servidor. Uma resposta atrasada não pode sobrescrever edição mais nova. Anexos já confirmados acompanham o rascunho após trocar de aparelho. Rascunho e carta concluída são estados diferentes.

Permitir importar `.docx` para o editor após prévia e consentimento para substituir ou acrescentar ao texto. Extrair conteúdo e estrutura básica, sanitizar a conversão e jamais executar macros, scripts ou HTML do documento. Preservar o rascunho anterior se a importação falhar.

Oferecer uma ação principal **Adicionar lembranças**, com fotos da galeria, câmera, áudio, vídeo ou arquivos do aparelho; no computador, também seleção e arrastar e soltar. A captura usa permissões do navegador e sempre tem seleção de arquivo como alternativa. Mostrar miniaturas, duração, tamanho, progresso, falha, repetição e remoção por arquivo. Proposta de quantidade: até 10 fotos, 2 áudios e 1 vídeo de até 1 minuto por carta. Tamanho máximo por arquivo e por carta será configurado depois de medir a capacidade Wix e testar aparelhos reais; informar ao usuário os limites efetivamente suportados, sem manter a promessa de vídeo enquanto o total aceito for 650 KB. Validar formatos, duração e tamanho no cliente e no servidor.

Na revisão, renderizar carta em pergaminho e anexos ao final, com controles de reprodução. O botão **Guardar minha carta** conclui somente após upload, registro, leitura de conferência e recibo. Reabrir deve mostrar exatamente a versão salva. Alterar uma carta concluída gera nova versão: confirmar a nova antes de aposentar a anterior. Uma requisição repetida não cria duplicata.

### 3. Arquitetura e lugar de cada dado

**Portal Next.js/Vercel:** frontend das duas áreas e APIs autenticadas. Cada operação verifica no servidor Loja, conta, situação Ativo, autoria da carta, permissão administrativa quando aplicável e estado da janela. Credenciais Wix e Firestore ficam no servidor. O navegador recebe apenas o necessário à sua operação.

**Firestore:** registros de janela, cartas, versões, anexos, rascunhos, inventário, guardiões indicados, ocorrências e auditoria. Cada registro de carta tem `tenantId`, `ownerUid`, `letterId`, `versionId`, `status`, timestamps, referências opacas Wix, contagem de anexos e hashes. Estados: `draft`, `ready`, `exporting`, `archived`, `deletion_pending`, `deleted`, com transições explícitas. O histórico inclui ator, ação, horário, resultado e identificador, sem copiar o conteúdo da carta. Não usar documentos Firestore para bytes de vídeo ou imagem. Operações de criação, conclusão, troca de versão e inventário precisam lidar com concorrência e repetição.

**Wix Media Manager:** durante a janela online, recebe arquivos privados de carta e anexos e permite leitura autenticada para conferência. Usar fluxo adequado a arquivos grandes, progresso e retomada quando validados. Cada objeto tem ID registrado e checksum conferido após leitura de volta. O sistema não considera um upload concluído apenas porque obteve uma URL ou iniciou uma transferência. Links de download de arquivo privado não se tornam links permanentes de entrega familiar.

**Duas unidades externas:** cada unidade, pen drive ou SSD, recebe o acervo integral, incluindo cartas concluídas, rascunhos, anexos, versões necessárias, manifesto e elementos indispensáveis à restauração. Não dividir os irmãos entre as duas unidades. Gerar uma exportação versionada e permitir gravação orientada em cada mídia, seguida de importação e verificação de leitura integral. O navegador não grava automaticamente em qualquer USB sem ação e permissão do operador. Registrar identificação, responsável, data, contagem, hashes e resultado por unidade. Um dispositivo perdido é substituído a partir do íntegro, com nova conferência e ocorrência.

**Chaves e restauração:** a arquitetura em uso guarda chaves vinculadas à conta no Firestore e a cifra ocorre no servidor. A exportação exige um procedimento separado e testado para preservar e recuperar essas chaves com controle de acesso. O simples login do irmão não reconstitui uma chave perdida. Não prometer que a Loja é tecnicamente incapaz de ler conteúdo enquanto sua infraestrutura detiver chaves capazes de decifrá-lo. Não exportar segredos em texto puro junto aos arquivos. A decisão futura sobre guarda de chaves, dupla responsabilidade e recuperação deve ser documentada e ensaiada antes de receber dados reais de todos os irmãos.

### 4. Janela anual: ciclo completo

1. **Fechada:** somente inventário e registros administrativos estão online; acervo é mantido nas duas unidades conferidas. A administração agenda uma janela normalmente de dez dias, com fuso `America/Sao_Paulo`, ata e responsáveis.
2. **Preparação:** restaurar o lote anterior de uma unidade íntegra em armazenamento temporário Wix; comparar manifesto, IDs, tamanhos e hashes e conferir leitura autorizada. Se divergente, não declarar íntegro nem abrir para todos.
3. **Aberta:** irmão ativo autorizado pode escrever, continuar rascunho, concluir, abrir e alterar a própria carta. O prazo é imposto pela API, não apenas pelo botão. A administração acompanha participação sem ler o conteúdo.
4. **Fechamento de escrita:** bloquear novas alterações e congelar um inventário de cartas, rascunhos e anexos. Falhas de upload ficam visíveis como pendência; não entram silenciosamente como concluídas.
5. **Exportação:** produzir lote completo e manifesto, gravar duas unidades e importar cada uma para comparar hashes e quantidades; restaurar amostras e registrar recibo. Rascunhos também entram no lote para a próxima abertura.
6. **Retirada temporária:** somente após duas cópias verificadas solicitar remoção dos objetos Wix, registrar resultados e exceções. Uma resposta de exclusão não prova eliminação imediata de backups internos do provedor. Se a guarda falhar, manter o lote temporário e estado pendente; não declarar fechamento concluído.
7. **Próxima abertura:** restaurar cartas e rascunhos com seus identificadores e versões originais para que o irmão possa continuar.

Se a data for perdida, manter fechado até novo agendamento registrado. Acesso excepcional por óbito ou quite-placet é processo individual e não abre a Cripta para todos.

### 5. Administração da Cripta

Uma tela, com quatro blocos: **Situação da janela**, **Participação**, **Guarda e unidades** e **Responsáveis/histórico**. A participação lista os irmãos Ativos com estados `Concluiu`, `Em rascunho`, `Ainda não iniciou`, `Sem conta vinculada` e `Erro a resolver`, com filtros e totais corretos, sem prévia de teor. O Venerável e o segundo responsável escolhido em sessão são registrados com referência à ata; registrar indicação não equivale por si só a uma autorização técnica de leitura.

A guarda mostra ações guiadas: preparar restauração, conferir, abrir, encerrar escrita, exportar, conferir Unidade 1, conferir Unidade 2, solicitar limpeza e fechar. Botões só ficam habilitados quando os pré-requisitos foram atendidos. Exibir ao lado de cada ação um “?” com explicação curta do motivo. Há histórico de falhas, perda de mídia e reposição. Nenhuma tela administrativa exibe cartas ou anexos por padrão.

### 6. Saída para família e desligamento de vínculo

Após validação documental e decisão interna, selecionar somente os pacotes autorizados para um destinatário. Produzir um ZIP portátil por entrega contendo `ABRA_AQUI_A_CARTA.html`, pasta `anexos/` e `manifesto.json`; opcionalmente PDF da carta e fotos para impressão. A página HTML funciona offline com links relativos, mostra fotos ao final, oferece áudio/vídeo reproduzível conforme navegador e download de cada original. Não depender de Wix, Portal, CDN, fontes remotas nem scripts externos. Sanitizar o conteúdo da carta e conferir ZIP em outro computador desconectado. Registrar geração e entrega; limitar acesso ao pacote produzido.

Quite-placet é administrativo: impedir novos depósitos após a mudança de situação, localizar todas as versões e cópias do irmão, oferecer procedimento de devolução quando cabível, registrar ciência e recibos de exclusão nas mídias e no Wix. Exclusão voluntária pelo próprio irmão precisa explicitar o alcance antes da confirmação; não prometer apagamento físico irrecuperável de dispositivos e backups sem mecanismo comprovado. Óbito exige verificação e autorização interna específicas; nenhuma notícia informal gera entrega automática.

### 7. Migração e critérios de aceite

Inventariar cartas existentes em `criptaOnlineCapsulesV1` e distinguir os formatos antigos que exigem a frase original. Não apagar nem converter automaticamente. O titular pode abrir a versão antiga com sua frase, migrar, reabrir a nova e só então retirar a antiga. Tratar cartas irrecuperáveis como pendência documentada. Remover telas de laboratório da navegação final apenas depois de verificar que nenhum dado real depende delas.

Demonstrar com dados escolhidos pelo operador: (a) rascunho que persiste após fechar a aba e trocar de aparelho; (b) importação Word com prévia; (c) foto por câmera/galeria, áudio e vídeo nas cotas anunciadas; (d) upload interrompido e repetido sem duplicação; (e) conclusão e leitura de volta idêntica; (f) negativa de acesso a outro usuário; (g) inventário de participação sem teor; (h) prazo encerrado bloqueando gravação no servidor; (i) exportação integral, leitura das duas mídias e reposição de uma perdida; (j) restauração anual inclusive de rascunhos; (k) HTML offline legível com anexos; (l) preservação de carta legada.

Entregar uma matriz final `requisito | evidência | resultado | pendência`. Não marcar como operacional um fluxo não ensaiado de ponta a ponta. Aprovar a liberação para outros irmãos somente após os ensaios, o procedimento de chaves e a operação das duas mídias estarem comprovados.

# Cripta VL6 — manual de operação e ensaios

## Estado e alcance

Documento de preparo. O Portal **ainda não recebe nem conserva conteúdo real**. A tela pessoal reúne carta, destinatário e anexos opcionais em uma prévia temporária; fechar a aba apaga a prévia. Há também um ensaio conectado restrito à conta piloto: cifra uma carta **fictícia** no navegador, envia o pacote privado ao Wix, registra índice opaco no Firestore, permite reabertura e exclusão. O acesso expira em 48 horas e uma rotina diária tenta excluir objetos expirados; falha na rotina exige reconciliação manual. Não usar como arquivo definitivo.

O período anual será de **dez dias consecutivos**. Registrar hora e fuso de abertura e encerramento como instantes com offset explícito; por exemplo, `2026-10-09T00:00:00-03:00` até `2026-10-19T00:00:00-03:00` (fim exclusivo). Se houver mudança de fuso, decidir formalmente se contam dez dias civis ou 240 horas antes de aprovar a janela. A política inicial de código exige 240 horas. Uma data escolhida em reunião não libera sozinha o acervo: aprovação, presença dos guardiões e estado das cópias são condições adicionais.

**Unidades de guarda:** a exigência é de três unidades externas independentes; podem ser dois SSDs, dois pen drives ou um de cada. Identificar A e B por número de série ou inventário, manter em locais e custódias separados, protegê-las com criptografia e registrar capacidade, data de gravação, hash do inventário e resultado de leitura/restauração. Não escolher pen drive apenas pela aparência ou capacidade anunciada: gravar, ejetar, reconectar, ler integralmente e restaurar em outro computador. Substituir a unidade que falhar e recompor as três cópias antes de apagar os arquivos temporários do Wix. Programar inspeções periódicas e migração para novas unidades, inclusive a revisão a cada cinco anos; esse prazo não dispensa as verificações intermediárias.

**Reserva da Loja:** acrescentar uma terceira cópia cifrada completa, identificada como C, guardada em armário/cofre sob controle da Loja, com registro de acesso. A e B ficam sob custódias e em locais separados; não concentrar as três no mesmo prédio. “Ativo” significa inventariado e verificado periodicamente, **não permanentemente conectado** a um computador ou rede. Se A ou B falhar, verificar C e a outra unidade contra o inventário aprovado, substituir a unidade danificada e testar a restauração. A reserva C também deve ser renovada sempre que o acervo autorizado mudar. As chaves de abertura não ficam junto das mídias.

### Regra de extravio, furto ou falha de uma unidade

1. O administrador do Portal registra ocorrência, unidade A/B/C, número de série/inventário, data, última verificação e motivo (extravio, furto ou falha). Um segundo responsável confere o registro e acompanha a reposição. O desaparecimento de uma mídia cifrada não expõe automaticamente as cartas, mas exige análise de incidente e de possível comprometimento das chaves mantidas separadas.
2. Identificar **uma cópia íntegra** pela leitura completa contra o inventário aprovado fora das mídias. A unidade de origem permanece sob leitura; separar uma unidade nova, identificada e vazia. Em estação autorizada, executar `python3 scripts/cripta/replace_copy.py inventario.json /caminho/origem /caminho/nova --manifest-sha256 HASH_APROVADO`. O programa se recusa a sobrescrever destino não vazio, compara a origem, copia somente bytes já cifrados e confere novamente o destino. Nenhuma chave é necessária para esta reposição.
3. Ejetar, reconectar e executar `verify_copies.py` com as três unidades atuais, inclusive a nova; fazer teste de restauração autorizado em equipamento distinto. Registrar o novo número de série, hash, operador, conferente e resultado antes de voltar à custódia regular. Manter a unidade perdida como extraviada no histórico, mesmo após reposição.

O script de cópia é uma ferramenta **local**, não uma ação do navegador. O login de administrador **ainda não gera registro digital de ocorrência nem controla o dispositivo USB**; essas telas e a dupla aprovação continuam pendentes. A ferramenta foi testada somente com pacotes artificiais. Se a origem não corresponder ao inventário, não copiá-la para transformar corrupção em nova “cópia de segurança”.

### Double-check de integridade

1. Na exportação futura, o sistema produzirá um inventário `vl6-export-v1` com caminhos **opacos**, tamanhos e SHA-256 de cada pacote **já cifrado**. Conferir o hash dos objetos baixados do Wix contra o inventário antes de gravar. Registrar o SHA-256 do **próprio inventário** em ata por dois responsáveis, por canal separado das mídias; futuramente assinar digitalmente esse inventário. Sem referência independente, uma pessoa poderia trocar arquivo e hash ao mesmo tempo.
2. Gravar A, B e C. Ejetar e reconectar cada uma. Em computador de verificação autorizado, executar `python3 scripts/cripta/verify_copies.py inventario.json /caminho/A /caminho/B --reserve /caminho/C --manifest-sha256 HASH_APROVADO`. A ferramenta lê integralmente cada pacote, recusa ausências, extras, links simbólicos e divergências de tamanho/hash, e informa separadamente A, B e C. É **somente leitura**; não copia, corrige, apaga nem abre cartas. Cada caminho deve conter apenas os pacotes listados; o inventário fica fora dessas pastas.
3. Repetir a verificação em um segundo computador autorizado e realizar restauração de amostras de **cada unidade separadamente**, incluindo abertura autenticada AES-GCM com as chaves de ensaio e pacote adulterado que deve falhar. Para conteúdo real, qualquer abertura de amostra precisa respeitar a custódia e a privacidade; hashes bastam para a leitura integral sem revelar teor.
4. Se A falhar e B/C passarem, isolar A, reconstruir uma nova unidade a partir de uma cópia comprovada e verificar novamente as três. Se só uma cópia passar, protegê-la e reconstruir duas unidades novas sob dupla supervisão; se nenhuma passar ou o inventário aprovado não corresponder, suspender limpeza no Wix quando ainda houver cópia temporária e investigar. Registrar data, versão do verificador, identificadores das unidades e resultado. Repetir a leitura integral periodicamente, não só na abertura anual.

O verificador já existe para ensaios com dados artificiais, mas **a exportação automática e a assinatura do inventário ainda não existem**. Seu resultado `OK` prova correspondência de bytes com aquele inventário; não prova que o conteúdo pode ser decifrado nem que a origem do inventário é legítima.

## Papéis e poderes

| Papel | Pode fazer | Não pode fazer sozinho |
| --- | --- | --- |
| Irmão titular ativo | Preparar, revisar e excluir suas cápsulas dentro da janela autorizada. | Abrir a janela, obter a chave de outro irmão ou decretar quite-placet. |
| Operador | Conferir índice cifrado, hashes, mídias e recibos, sem teor das cartas. | Reconstruir chaves ou entregar conteúdo por iniciativa própria. |
| Guardião (três titulares distintos) | Conservar parcela física da recuperação; dois presentes poderão reconstruir a chave sob procedimento autorizado. | Guardar as três parcelas, enviá-las por e-mail ou manter cópia digital íntegra no servidor. |
| Aprovadores | Autorizar janela, adiamento e exceções documentadas. | Desbloquear uma cápsula sem os controles de custódia definidos. |
| Destinatário aprovado | Receber somente sua cápsula e abrir no próprio equipamento com a chave apropriada. | Obter os pacotes de outros destinatários. |

O modelo 2 de 3 é uma **meta de desenho**, ainda não um mecanismo implantado. Antes do primeiro depósito: eleger guardiões e substitutos; contratar revisão técnica do esquema de partilha; escrever procedimento de rotação, perda, morte e suspeita de comprometimento de cada parcela. Biometria e e-mail podem autenticar pedidos, mas não substituem cópia da chave.

## Pacote portátil e restauração

Cada cápsula receberá ID aleatório e uma versão de formato. Texto, destinatário e nomes originais ficam somente dentro do payload cifrado. Mídias serão cifradas separadamente com autenticidade por arquivo, mantendo tamanho e tipo aproximados visíveis ao índice. O manifesto conterá IDs opacos, versões, tamanhos, hashes SHA-256 de bytes **cifrados**, e referência ao material de recuperação embrulhado. O manifesto será autenticado; hash sozinho detecta acidente, mas não impede que alguém substitua manifesto e pacote juntos.

O arquivo do ensaio atual `vl6-capsule-v1` inclui apenas carta e campos `title`, `body`, `recipient`; AES-256-GCM com frase derivada por PBKDF2-SHA256 e salt aleatório. Não inclui anexos nem o futuro esquema de recuperação. Não compartilhar a frase junto ao arquivo. Se ela se perder, a carta deste ensaio não poderá ser reaberta.

### Exercício imediato com conteúdo inventado

1. Entre em **Minha Cripta**, clique em **Escrever uma carta** e indique destinatário e texto fictícios.
2. Inclua uma foto, áudio ou vídeo artificiais, se desejar. Use também uma carta sem anexo. Confira o tamanho e os limites exibidos.
3. Clique em **Revisar minha carta**, volte para alterar algo e confirme que o destinatário, o texto e os anexos permanecem reunidos na mesma carta.
4. Clique em **Manter prévia nesta aba**, abra novamente em **Ver ou alterar carta**, e confira o conjunto. Feche a página e confirme que a prévia desaparece. **Nenhum dado é enviado ao Wix neste exercício pessoal.**
5. Na tela de revisão, informe frase fictícia longa e clique em **Enviar carta fictícia cifrada**. O ensaio conectado aceita apenas anexos somando até 650 KB. Volte a **Minhas cartas**, informe a mesma frase em **Ensaios cifrados no Wix**, clique em **Reabrir e conferir** e revise texto, destinatário e anexo. Feche e reabra o navegador para demonstrar persistência do objeto remoto. Clique em **Excluir teste** e confirme o desaparecimento do índice. Teste frase errada e arquivo adulterado em ambiente isolado.
6. Na área administrativa, execute **Testar Wix + Firestore** separadamente. Exija integridade confirmada e solicitação de limpeza, sem introduzir conteúdo pessoal.

## Ciclo anual pretendido

| Fase | Evidência para avançar | Conduta se falhar |
| --- | --- | --- |
| Planejamento | Deliberação interna, datas e guardiões confirmados, teste recente das três mídias. | Adiar sem abrir. |
| Preparação | Inventário e hashes das três unidades externas conferidos; restauração amostral em equipamento isolado. | Isolar mídia defeituosa e restaurar da íntegra antes de abrir. |
| Abertura | Registro de abertura, hora autenticada, versão implantada e controles de acesso testados. | Bloquear gravações; não confiar apenas no relógio do navegador. |
| Dez dias | Titular ativo altera apenas o próprio conteúdo, com limites aplicados também no servidor; cópias temporárias cifradas. | Suspender depósitos em caso de incidente; preservar evidências sem expor cartas. |
| Fechamento | Bloquear uploads, aguardar transações, exportar inventário final e gravar/verificar três unidades externas independentes. | Manter janela fechada para usuários, mas não apagar a cópia temporária até garantir restauração. |
| Limpeza temporária | Recibos por objeto removido, verificação posterior da listagem e política de retenção do provedor. | Registrar pendência; não declarar eliminação total. |

Em uma hecatombe ou ausência dos responsáveis, a data passa sem abertura. Nova data exige decisão documentada; não existe desbloqueio automático. Se um irmão falecer fora da janela, abrir somente a cápsula elegível em procedimento excepcional, com verificação documental, destinatário e aprovação por duas pessoas; a janela geral continua fechada.

## Ensaios de falha e corrupção

- **Uma unidade externa ilegível:** restaurar da segunda e criar nova cópia independente antes de concluir a cerimônia. Inspecionar conectores e realizar leitura completa, não confiar apenas na visualização da lista de arquivos.
- **Ambos ilegíveis:** não apagar a cópia temporária; registrar incidente e buscar outros backups autorizados. Sem cópia íntegra e chave, o conteúdo pode ser perdido.
- **Arquivo alterado:** autenticação AES-GCM deve recusar a abertura; hash do manifesto acusa diferença. Nunca corrigir o arquivo por edição manual.
- **Pessoa mal-intencionada:** duas aprovações, parcelas sob custódias distintas, histórico imutável fora do servidor da aplicação e reconciliação independente reduzem risco; não eliminam conluio.
- **Frase ou chave perdida:** simular reconstituição conjunta antes do primeiro uso real. Trocar guardião exige rotação formal e invalidar parcelas anteriores quando possível.
- **Exclusão ou quite-placet:** isolar somente as cápsulas daquele titular; concluir exclusão/verificação nas cópias autorizadas, observando snapshots e retenção. Dar comprovante honesto, sem prometer apagamento físico absoluto.
- **Família:** aprovação deve indicar IDs de cápsulas e destinatários exatos. PDF gerado no computador do destinatário; mídia contínua entregue em arquivos cifrados apropriados.

## Condições de lançamento

Não habilitar conteúdos reais até: revisão externa de criptografia e partilha, fluxo de mídias acima de 4,5 MB sem trânsito por função da Vercel, restauração cruzada em dois dispositivos, ensaio de recuperação por dois guardiões, cópia dupla verificada, controles de titular/janela/exceção no servidor e teste de exclusão rastreável. Separar claramente aprovação institucional e liberação técnica.
